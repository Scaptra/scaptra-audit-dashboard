import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = "";
    return url.toString();
  } catch {
    return input;
  }
}

function ensureProtocol(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getOrigin(input: string): string {
  const url = new URL(input);
  return url.origin;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value);
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const matches = [...html.matchAll(/href=["']([^"'#]+)["']/gi)];
  const origin = getOrigin(baseUrl);
  const results = new Set<string>();

  for (const match of matches) {
    const href = match[1]?.trim();
    if (!href) continue;

    if (
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:") ||
      href.startsWith("#")
    ) {
      continue;
    }

    try {
      const absolute = new URL(href, baseUrl).toString();

      if (
        absolute.includes(".css") ||
        absolute.includes(".js") ||
        absolute.includes(".png") ||
        absolute.includes(".jpg") ||
        absolute.includes(".jpeg") ||
        absolute.includes(".svg") ||
        absolute.includes(".webp") ||
        absolute.includes(".woff") ||
        absolute.includes(".woff2") ||
        absolute.includes(".ttf") ||
        absolute.includes(".pdf") ||
        absolute.includes(".zip")
      ) {
        continue;
      }

      if (absolute.startsWith(origin)) {
        results.add(normalizeUrl(absolute));
      }
    } catch {
      continue;
    }
  }

  return [...results];
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(
    /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["'][^>]*>/i
  );
  return match ? match[1].trim() : null;
}

function countTag(html: string, tag: string): number {
  const regex = new RegExp(`<${tag}\\b`, "gi");
  return (html.match(regex) || []).length;
}

function extractEmails(html: string): string[] {
  const results = new Set<string>();
  const matches = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);

  if (matches) {
    for (const email of matches) {
      results.add(email.toLowerCase());
    }
  }

  return [...results];
}

function extractPhones(html: string): string[] {
  const results = new Set<string>();

  const telMatches = [...html.matchAll(/tel:([+\d][\d\s\-()]{6,})/gi)];
  for (const match of telMatches) {
    const raw = match[1]?.trim();
    if (raw) results.add(raw);
  }

  const textMatches = html.match(
    /(?:\+?\d{1,3}[\s\-()]*)?(?:\d[\s\-()]*){7,15}/g
  );

  if (textMatches) {
    for (const value of textMatches) {
      const cleaned = value.replace(/[^\d+]/g, "");
      const digitCount = cleaned.replace(/\D/g, "").length;

      if (digitCount >= 8 && digitCount <= 15) {
        results.add(value.trim());
      }
    }
  }

  return [...results];
}

function detectBookingWidget(html: string): boolean {
  const lower = html.toLowerCase();

  const signals = [
    "calendly",
    "acuityscheduling",
    "simplybook",
    "book now",
    "book online",
    "schedule a call",
    "schedule call",
    "schedule consultation",
    "book a demo",
    "book demo",
    "appointment",
    "reserve now",
    "request a quote",
  ];

  return signals.some((signal) => lower.includes(signal));
}

function estimateRevenueLeak(params: {
  totalPages: number;
  pagesWithNoForms: number;
  pagesWithNoButtons: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasBooking: boolean;
  totalScore: number;
}) {
  const {
    totalPages,
    pagesWithNoForms,
    pagesWithNoButtons,
    hasEmail,
    hasPhone,
    hasBooking,
    totalScore,
  } = params;

  let missedLeadsLow = 4;
  let missedLeadsHigh = 12;

  missedLeadsLow += Math.max(0, totalPages - 2);
  missedLeadsHigh += Math.max(0, totalPages - 2) * 2;

  missedLeadsLow += pagesWithNoForms * 1.5;
  missedLeadsHigh += pagesWithNoForms * 3;

  missedLeadsLow += pagesWithNoButtons;
  missedLeadsHigh += pagesWithNoButtons * 2;

  if (!hasEmail) {
    missedLeadsLow += 2;
    missedLeadsHigh += 4;
  }

  if (!hasPhone) {
    missedLeadsLow += 3;
    missedLeadsHigh += 6;
  }

  if (!hasBooking) {
    missedLeadsLow += 3;
    missedLeadsHigh += 7;
  }

  if (totalScore < 50) {
    missedLeadsLow += 5;
    missedLeadsHigh += 12;
  } else if (totalScore < 70) {
    missedLeadsLow += 2;
    missedLeadsHigh += 5;
  }

  const estimatedRevenueLow = round(missedLeadsLow * 250);
  const estimatedRevenueHigh = round(missedLeadsHigh * 550);

  return {
    missedLeadsLow: round(missedLeadsLow),
    missedLeadsHigh: round(missedLeadsHigh),
    estimatedRevenueLow,
    estimatedRevenueHigh,
  };
}

function calculateScores(params: {
  totalPages: number;
  pagesWithNoForms: number;
  pagesWithNoButtons: number;
  pagesWithNoH1: number;
  missingTitleCount: number;
  missingMetaCount: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasBooking: boolean;
  totalForms: number;
  totalButtons: number;
}) {
  const {
    totalPages,
    pagesWithNoForms,
    pagesWithNoButtons,
    pagesWithNoH1,
    missingTitleCount,
    missingMetaCount,
    hasEmail,
    hasPhone,
    hasBooking,
    totalForms,
    totalButtons,
  } = params;

  const safeTotalPages = Math.max(totalPages, 1);

  const formCoverage = clamp(
    ((safeTotalPages - pagesWithNoForms) / safeTotalPages) * 100,
    0,
    100
  );
  const buttonCoverage = clamp(
    ((safeTotalPages - pagesWithNoButtons) / safeTotalPages) * 100,
    0,
    100
  );
  const headingCoverage = clamp(
    ((safeTotalPages - pagesWithNoH1) / safeTotalPages) * 100,
    0,
    100
  );
  const titleCoverage = clamp(
    ((safeTotalPages - missingTitleCount) / safeTotalPages) * 100,
    0,
    100
  );
  const metaCoverage = clamp(
    ((safeTotalPages - missingMetaCount) / safeTotalPages) * 100,
    0,
    100
  );

  let lead_capture_score = 0;
  lead_capture_score += hasPhone ? 8 : 0;
  lead_capture_score += hasEmail ? 6 : 0;
  lead_capture_score += hasBooking ? 8 : 0;
  lead_capture_score += totalForms > 0 ? 6 : 0;
  lead_capture_score += round((formCoverage / 100) * 6);
  lead_capture_score += round((buttonCoverage / 100) * 6);
  lead_capture_score = clamp(lead_capture_score, 0, 40);

  let response_efficiency_score = 0;
  response_efficiency_score += hasBooking ? 8 : 0;
  response_efficiency_score += hasPhone ? 5 : 0;
  response_efficiency_score += totalButtons > 0 ? 3 : 0;
  response_efficiency_score += round((buttonCoverage / 100) * 4);
  response_efficiency_score += round((formCoverage / 100) * 5);
  response_efficiency_score = clamp(response_efficiency_score, 0, 25);

  let crm_data_score = 0;
  crm_data_score += hasEmail ? 6 : 0;
  crm_data_score += totalForms > 0 ? 5 : 0;
  crm_data_score += round((titleCoverage / 100) * 2);
  crm_data_score += round((metaCoverage / 100) * 2);
  crm_data_score += round((headingCoverage / 100) * 3);
  crm_data_score = clamp(crm_data_score, 0, 18);

  let automation_score = 0;
  automation_score += hasBooking ? 5 : 0;
  automation_score += hasPhone ? 3 : 0;
  automation_score += totalForms > 0 ? 4 : 0;
  automation_score += round((formCoverage / 100) * 4);
  automation_score += round((buttonCoverage / 100) * 2);
  automation_score = clamp(automation_score, 0, 18);

  let ai_readiness_score = 0;
  ai_readiness_score += hasEmail ? 4 : 0;
  ai_readiness_score += hasPhone ? 4 : 0;
  ai_readiness_score += hasBooking ? 4 : 0;
  ai_readiness_score += round((headingCoverage / 100) * 3);
  ai_readiness_score += round((titleCoverage / 100) * 2);
  ai_readiness_score += round((metaCoverage / 100) * 2);
  ai_readiness_score = clamp(ai_readiness_score, 0, 17);

  const total_score = clamp(
    lead_capture_score +
      response_efficiency_score +
      crm_data_score +
      automation_score +
      ai_readiness_score,
    0,
    100
  );

  return {
    lead_capture_score,
    response_efficiency_score,
    crm_data_score,
    automation_score,
    ai_readiness_score,
    total_score,
    coverage: {
      formCoverage,
      buttonCoverage,
      headingCoverage,
      titleCoverage,
      metaCoverage,
    },
  };
}

function buildExecutiveSummary(params: {
  businessName: string;
  totalScore: number;
  lead_capture_score: number;
  response_efficiency_score: number;
  crm_data_score: number;
  automation_score: number;
  ai_readiness_score: number;
  hasBooking: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  totalForms: number;
  totalPages: number;
  pagesWithNoForms: number;
  pagesWithNoButtons: number;
  pagesWithNoH1: number;
  missingTitleCount: number;
  missingMetaCount: number;
}) {
  const {
    businessName,
    totalScore,
    lead_capture_score,
    response_efficiency_score,
    crm_data_score,
    automation_score,
    ai_readiness_score,
    hasBooking,
    hasPhone,
    hasEmail,
    totalForms,
    totalPages,
    pagesWithNoForms,
    pagesWithNoButtons,
    pagesWithNoH1,
    missingTitleCount,
    missingMetaCount,
  } = params;

  let readinessLevel = "moderate";
  if (totalScore >= 75) readinessLevel = "strong";
  else if (totalScore < 45) readinessLevel = "weak";

  const strongestAreas: string[] = [];
  const weakerAreas: string[] = [];

  if (lead_capture_score >= 24) strongestAreas.push("contact visibility");
  else weakerAreas.push("contact visibility");

  if (response_efficiency_score >= 16) strongestAreas.push("response readiness");
  else weakerAreas.push("response readiness");

  if (crm_data_score >= 12) strongestAreas.push("basic follow-up structure");
  else weakerAreas.push("follow-up structure");

  if (automation_score >= 12) strongestAreas.push("automation foundations");
  else weakerAreas.push("automation foundations");

  const qualityFlags: string[] = [];
  if (pagesWithNoForms > 0) {
    qualityFlags.push(`${pagesWithNoForms} page(s) without visible enquiry forms`);
  }
  if (pagesWithNoButtons > 0) {
    qualityFlags.push(`${pagesWithNoButtons} page(s) with weak action prompts`);
  }
  if (pagesWithNoH1 > 0) {
    qualityFlags.push(`${pagesWithNoH1} page(s) lacking a clear main heading`);
  }
  if (missingTitleCount > 0) {
    qualityFlags.push(`${missingTitleCount} page(s) missing title tags`);
  }
  if (missingMetaCount > 0) {
    qualityFlags.push(`${missingMetaCount} page(s) missing meta descriptions`);
  }

  const channels = [
    hasPhone ? "phone" : null,
    hasEmail ? "email" : null,
    hasBooking ? "booking" : null,
    totalForms > 0 ? "website forms" : null,
  ].filter(Boolean);

  const strongText =
    strongestAreas.length > 0
      ? `The strongest area appears to be ${strongestAreas.join(" and ")}.`
      : "";

  const weakText =
    weakerAreas.length > 0
      ? `The main improvement opportunity appears to be ${weakerAreas
          .slice(0, 2)
          .join(" and ")}.`
      : "";

  const qualityText =
    qualityFlags.length > 0
      ? `During the review of ${totalPages} page(s), we noted ${qualityFlags.join(
          ", "
        )}.`
      : `During the review of ${totalPages} page(s), there were no major structural red flags across headings, titles, or descriptions.`;

  return `${businessName} currently shows a ${readinessLevel} level of enquiry-handling readiness, with an overall score of ${totalScore} out of 100. The visible contact pathways on this site include ${channels.length > 0 ? channels.join(", ") : "limited contact options"}. ${strongText} ${weakText} ${qualityText}`.trim();
}

function buildEngagementFlowMap(params: {
  hasEmail: boolean;
  hasPhone: boolean;
  hasBooking: boolean;
  totalForms: number;
  response_efficiency_score: number;
  crm_data_score: number;
  totalPages: number;
  pagesWithNoForms: number;
  pagesWithNoButtons: number;
}) {
  const {
    hasEmail,
    hasPhone,
    hasBooking,
    totalForms,
    response_efficiency_score,
    crm_data_score,
    totalPages,
    pagesWithNoForms,
    pagesWithNoButtons,
  } = params;

  const channels: string[] = [];
  if (hasPhone) channels.push("phone");
  if (hasEmail) channels.push("email");
  if (totalForms > 0) channels.push("website forms");
  if (hasBooking) channels.push("booking path");

  const contactPath =
    channels.length > 0 ? channels.join(", ") : "very limited visible contact options";

  let responseComment = "";
  if (response_efficiency_score >= 18) {
    responseComment =
      "The route from interest to contact appears relatively direct for a visitor who is ready to act.";
  } else if (response_efficiency_score >= 11) {
    responseComment =
      "A visitor can make contact, but the process is not as direct or immediate as it should be.";
  } else {
    responseComment =
      "The route from interest to contact appears fragmented, which increases the chance of delay or drop-off.";
  }

  let frictionComment = "";
  if (pagesWithNoForms > 0 || pagesWithNoButtons > 0) {
    frictionComment =
      "Some pages do not make the next step especially clear, which can create hesitation before an enquiry is made.";
  } else {
    frictionComment =
      "Most scanned pages provide at least one visible path toward contact or action.";
  }

  const crmComment =
    crm_data_score >= 12
      ? "There are reasonable signs that enquiries could be captured and followed up in a structured way."
      : "There are limited signs of structured capture or follow-up readiness behind the visible contact channels.";

  return `Across ${totalPages} scanned page(s), the site appears to rely on ${contactPath}. ${responseComment} ${frictionComment} ${crmComment}`;
}

function buildLeadLeakageSummary(params: {
  pagesWithNoForms: number;
  pagesWithNoButtons: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasBooking: boolean;
  pagesWithNoH1: number;
  missingTitleCount: number;
  missingMetaCount: number;
  totalPages: number;
}) {
  const {
    pagesWithNoForms,
    pagesWithNoButtons,
    hasEmail,
    hasPhone,
    hasBooking,
    pagesWithNoH1,
    missingTitleCount,
    missingMetaCount,
    totalPages,
  } = params;

  const issues: string[] = [];

  if (!hasPhone) {
    issues.push("phone contact is not clearly visible");
  }

  if (!hasEmail) {
    issues.push("email contact is not clearly visible");
  }

  if (!hasBooking) {
    issues.push("there is no clear booking or appointment pathway");
  }

  if (pagesWithNoForms > 0) {
    issues.push(`${pagesWithNoForms} page(s) do not show a visible form`);
  }

  if (pagesWithNoButtons > 0) {
    issues.push(`${pagesWithNoButtons} page(s) have weak prompts to take action`);
  }

  if (pagesWithNoH1 > 0) {
    issues.push(`${pagesWithNoH1} page(s) lack a clear main heading`);
  }

  if (missingTitleCount > 0) {
    issues.push(`${missingTitleCount} page(s) are missing title tags`);
  }

  if (missingMetaCount > 0) {
    issues.push(`${missingMetaCount} page(s) are missing meta descriptions`);
  }

  if (issues.length === 0) {
    return `Across ${totalPages} scanned page(s), the main risk appears to come from general inconsistency rather than one major failure point. The site shows workable contact paths, but there is still likely some leakage where enquiries are not captured or followed up as strongly as they could be.`;
  }

  return `The main areas where enquiries may be slipping through are: ${issues.join(
    ", "
  )}. These are the kinds of gaps that often reduce the number of visitors who turn into real enquiries.`;
}

function buildAutomationOpportunityMatrix(params: {
  hasBooking: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  totalForms: number;
  response_efficiency_score: number;
  crm_data_score: number;
  automation_score: number;
  pagesWithNoForms: number;
  pagesWithNoButtons: number;
}) {
  const {
    hasBooking,
    hasPhone,
    hasEmail,
    totalForms,
    response_efficiency_score,
    crm_data_score,
    automation_score,
    pagesWithNoForms,
    pagesWithNoButtons,
  } = params;

  const matrix: Record<
    string,
    { title: string; description: string; impact: string }
  > = {};

  if (!hasBooking) {
    matrix.booking_path = {
      title: "Make the next step more immediate",
      description:
        "Add a clearer booking or appointment option for visitors who are ready to act now.",
      impact: "Helps convert high-intent visitors before they leave the site.",
    };
  }

  if (hasPhone) {
    matrix.missed_call_recovery = {
      title: "Follow up missed calls automatically",
      description:
        "Use an instant text-back and callback process when calls are missed.",
      impact: "Recovers high-intent enquiries that might otherwise go elsewhere.",
    };
  }

  if (totalForms > 0) {
    matrix.form_acknowledgement = {
      title: "Acknowledge enquiries straight away",
      description:
        "Send immediate confirmation and next-step messaging after a form is submitted.",
      impact: "Reduces drop-off after someone reaches out.",
    };
  }

  if (pagesWithNoForms > 0) {
    matrix.capture_coverage = {
      title: "Improve contact access across the site",
      description:
        "Add clearer contact options on pages where a visitor currently has no obvious way to enquire.",
      impact: "Makes it easier for interested visitors to take action from more pages.",
    };
  }

  if (pagesWithNoButtons > 0) {
    matrix.action_prompting = {
      title: "Make action points more obvious",
      description:
        "Strengthen the wording and placement of prompts that guide visitors to call, enquire, or book.",
      impact: "Improves the number of visitors who take the next step.",
    };
  }

  if (response_efficiency_score < 12) {
    matrix.first_touch_speed = {
      title: "Improve first response speed",
      description:
        "Introduce faster first-touch handling so new enquiries are acknowledged within minutes rather than drifting.",
      impact: "Improves conversion while interest is still high.",
    };
  }

  if (crm_data_score < 12) {
    matrix.crm_structure = {
      title: "Create better follow-up visibility",
      description:
        "Improve contact capture and tracking so enquiries are not left without clear ownership.",
      impact: "Creates stronger accountability and cleaner follow-up.",
    };
  }

  if (automation_score < 12) {
    matrix.follow_up_sequence = {
      title: "Add a consistent follow-up sequence",
      description:
        "Introduce staged follow-up using SMS, email, or reminders so leads are not forgotten.",
      impact: "Improves conversion from people who do not reply first time.",
    };
  }

  if (!hasEmail) {
    matrix.email_capture = {
      title: "Add another easy way to respond",
      description:
        "Make email contact easier to find or capture, especially for visitors who are not ready to call immediately.",
      impact: "Gives interested prospects another low-friction way to enquire.",
    };
  }

  if (Object.keys(matrix).length === 0) {
    matrix.optimisation = {
      title: "Tighten enquiry handling",
      description:
        "Focus on faster response and more consistent follow-up across the contact methods already in place.",
      impact: "Lifts conversion without needing more traffic.",
    };
  }

  return matrix;
}

function buildImplementationBlueprint(params: {
  hasPhone: boolean;
  totalForms: number;
  crm_data_score: number;
  automation_score: number;
  hasBooking: boolean;
  pagesWithNoForms: number;
  pagesWithNoButtons: number;
}) {
  const {
    hasPhone,
    totalForms,
    crm_data_score,
    automation_score,
    hasBooking,
    pagesWithNoForms,
    pagesWithNoButtons,
  } = params;

  const phases: string[] = [];

  phases.push(
    "Start by cleaning up how enquiries are handled and making sure one person or process clearly owns the response."
  );

  if (pagesWithNoForms > 0 || pagesWithNoButtons > 0) {
    phases.push(
      "Then improve the visibility of contact options and make the next step clearer on weaker pages."
    );
  }

  if (hasPhone) {
    phases.push(
      "Next, put missed-call recovery in place so phone enquiries do not go cold."
    );
  }

  if (totalForms > 0) {
    phases.push(
      "After that, add instant acknowledgement and a clearer follow-up path for website form enquiries."
    );
  }

  if (crm_data_score < 12) {
    phases.push(
      "Strengthen tracking and follow-up visibility so leads are not lost inside the process."
    );
  }

  if (automation_score < 12) {
    phases.push(
      "Once the basics are working, add simple automation to improve speed and consistency without adding more admin."
    );
  }

  if (!hasBooking) {
    phases.push(
      "Finally, introduce a stronger booking or appointment path for visitors who are ready to act immediately."
    );
  }

  phases.push(
    "From there, the business can assess whether a broader Scaptra Engage-style deployment would create further gains."
  );

  return phases.join(" ");
}

function buildDetectedStack(params: {
  hasPhone: boolean;
  hasEmail: boolean;
  hasBooking: boolean;
  totalForms: number;
  crm_data_score: number;
}) {
  const { hasPhone, hasEmail, hasBooking, totalForms, crm_data_score } = params;

  return {
    website_form: totalForms > 0 ? "Detected" : "Not detected",
    live_chat: "Not detected",
    ai_chatbot: "Not detected",
    crm: crm_data_score >= 12 ? "Detected" : "Unclear",
    missed_call_handling: "Not detected",
    after_hours_response:
      hasBooking || hasPhone ? "Possible / unconfirmed" : "Weak or not detected",
    email_channel: hasEmail ? "Detected" : "Not detected",
    phone_channel: hasPhone ? "Detected" : "Not detected",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const submissionIdFromBody =
      typeof body?.submissionId === "string" ? body.submissionId : undefined;

    const submittedName =
      typeof body?.name === "string" ? body.name.trim() : "";

    const submittedBusiness =
      typeof body?.business === "string"
        ? body.business.trim()
        : typeof body?.businessName === "string"
        ? body.businessName.trim()
        : "";

    const submittedWebsite =
      typeof body?.website === "string"
        ? body.website.trim()
        : typeof body?.url === "string"
        ? body.url.trim()
        : "";

    const submittedEmail =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    const submittedPhone =
      typeof body?.phone === "string" ? body.phone.trim() : "";

    let submissionId = submissionIdFromBody;
    let businessId: string | undefined;
    let businessName: string | undefined;
    let websiteUrl: string | undefined;

    if (submissionId) {
      const { data: submission, error: submissionError } = await supabase
        .from("audit_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();

      if (submissionError || !submission) {
        return NextResponse.json(
          { error: "Audit submission not found" },
          { status: 404 }
        );
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", submission.business_id)
        .single();

      if (businessError || !business) {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 }
        );
      }

      businessId = business.id;
      businessName = business.business_name ?? submittedBusiness ?? "Website Audit";
      websiteUrl = business.website ?? submittedWebsite ?? undefined;
    } else {
      businessName = submittedBusiness;
      websiteUrl = submittedWebsite;

      if (!businessName || !websiteUrl) {
        return NextResponse.json(
          { error: "Missing business/businessName or website/url" },
          { status: 400 }
        );
      }

      websiteUrl = ensureProtocol(websiteUrl);

      const { data: business, error: businessInsertError } = await supabase
        .from("businesses")
        .insert({
          business_name: businessName,
          website: websiteUrl,
        })
        .select()
        .single();

      if (businessInsertError || !business) {
        console.error("Failed to create business:", businessInsertError);
        return NextResponse.json(
          { error: "Failed to create business" },
          { status: 500 }
        );
      }

      businessId = business.id;

      const submissionInsertPayload: Record<string, unknown> = {
        business_id: business.id,
        status: "pending",
        submission_source: "manual",
      };

      const { data: submission, error: submissionInsertError } = await supabase
        .from("audit_submissions")
        .insert(submissionInsertPayload)
        .select()
        .single();

      if (submissionInsertError || !submission) {
        console.error("Failed to create audit submission:", submissionInsertError);
        return NextResponse.json(
          { error: "Failed to create audit submission" },
          { status: 500 }
        );
      }

      submissionId = submission.id;
    }

    if (!submissionId || !businessId || !websiteUrl || !businessName) {
      return NextResponse.json(
        { error: "Missing required audit data after setup" },
        { status: 400 }
      );
    }

    await supabase
      .from("audit_submissions")
      .update({ status: "running" })
      .eq("id", submissionId);

    const { data: scanRow, error: scanInsertError } = await supabase
      .from("website_scans")
      .insert({
        business_id: businessId,
        website_url: websiteUrl,
        scan_status: "running",
        scan_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (scanInsertError || !scanRow) {
      return NextResponse.json(
        { error: "Failed to create website scan record" },
        { status: 500 }
      );
    }

    const homepageResponse = await fetch(websiteUrl, {
      headers: {
        "User-Agent": "ScaptraAuditBot/1.0",
      },
      cache: "no-store",
    });

    if (!homepageResponse.ok) {
      await supabase
        .from("website_scans")
        .update({
          scan_status: "failed",
          scan_completed_at: new Date().toISOString(),
        })
        .eq("id", scanRow.id);

      await supabase
        .from("audit_submissions")
        .update({ status: "failed" })
        .eq("id", submissionId);

      return NextResponse.json(
        { error: `Failed to fetch homepage: ${homepageResponse.status}` },
        { status: 500 }
      );
    }

    const homepageHtml = await homepageResponse.text();

    const homepageTitle = extractTitle(homepageHtml);
    const homepageDescription = extractMetaDescription(homepageHtml);
    const homepageH1Count = countTag(homepageHtml, "h1");
    const homepageFormCount = countTag(homepageHtml, "form");
    const homepageButtonCount = countTag(homepageHtml, "button");

    const discoveredLinks = extractInternalLinks(homepageHtml, websiteUrl);

    const uniqueTargets = Array.from(
      new Set([normalizeUrl(websiteUrl), ...discoveredLinks.map(normalizeUrl)])
    );

    const crawlTargets = uniqueTargets.slice(0, 10);

    const crawledPages: Array<{
      url: string;
      status: number | null;
      title: string | null;
      metaDescription: string | null;
      h1Count: number;
      formCount: number;
      buttonCount: number;
      emails: string[];
      phones: string[];
      bookingWidgetDetected: boolean;
    }> = [];

    const processedUrls = new Set<string>();

    for (const rawUrl of crawlTargets) {
      const url = normalizeUrl(rawUrl);

      if (processedUrls.has(url)) continue;
      processedUrls.add(url);

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "ScaptraAuditBot/1.0",
          },
          cache: "no-store",
        });

        const status = res.status;
        const html = res.ok ? await res.text() : "";

        const title = html ? extractTitle(html) : null;
        const metaDescription = html ? extractMetaDescription(html) : null;
        const h1Count = html ? countTag(html, "h1") : 0;
        const formCount = html ? countTag(html, "form") : 0;
        const buttonCount = html ? countTag(html, "button") : 0;
        const emails = html ? extractEmails(html) : [];
        const phones = html ? extractPhones(html) : [];
        const bookingWidgetDetected = html ? detectBookingWidget(html) : false;

        crawledPages.push({
          url,
          status,
          title,
          metaDescription,
          h1Count,
          formCount,
          buttonCount,
          emails,
          phones,
          bookingWidgetDetected,
        });

        const { data: pageRow, error: pageInsertError } = await supabase
          .from("website_scan_pages")
          .insert({
            scan_id: scanRow.id,
            page_url: url,
            page_title: title,
            http_status: status,
          })
          .select()
          .single();

        if (pageInsertError || !pageRow) {
          console.error(
            "Failed to insert website_scan_pages row:",
            pageInsertError
          );
          continue;
        }

        const findings: Array<{
          page_id: string;
          finding_type: string;
          finding_value: string;
          finding_context: string;
        }> = [
          {
            page_id: pageRow.id,
            finding_type: "h1_count",
            finding_value: String(h1Count),
            finding_context: `Page contains ${h1Count} H1 tag(s).`,
          },
          {
            page_id: pageRow.id,
            finding_type: "form_count",
            finding_value: String(formCount),
            finding_context: `Page contains ${formCount} form element(s).`,
          },
          {
            page_id: pageRow.id,
            finding_type: "button_count",
            finding_value: String(buttonCount),
            finding_context: `Page contains ${buttonCount} button element(s).`,
          },
          {
            page_id: pageRow.id,
            finding_type: "booking_widget",
            finding_value: bookingWidgetDetected ? "true" : "false",
            finding_context: bookingWidgetDetected
              ? "Booking widget or booking signal detected on page."
              : "No booking widget detected on page.",
          },
        ];

        if (!title) {
          findings.push({
            page_id: pageRow.id,
            finding_type: "missing_title",
            finding_value: "true",
            finding_context: "Page is missing a title tag.",
          });
        }

        if (!metaDescription) {
          findings.push({
            page_id: pageRow.id,
            finding_type: "missing_meta_description",
            finding_value: "true",
            finding_context: "Page is missing a meta description.",
          });
        }

        for (const email of emails) {
          findings.push({
            page_id: pageRow.id,
            finding_type: "email_address",
            finding_value: email,
            finding_context: `Email address detected: ${email}`,
          });
        }

        for (const phone of phones) {
          findings.push({
            page_id: pageRow.id,
            finding_type: "phone_number",
            finding_value: phone,
            finding_context: `Phone number detected: ${phone}`,
          });
        }

        const { error: findingsInsertError } = await supabase
          .from("website_scan_findings")
          .insert(findings);

        if (findingsInsertError) {
          console.error(
            "Failed to insert website_scan_findings rows:",
            findingsInsertError
          );
        }
      } catch {
        crawledPages.push({
          url,
          status: null,
          title: null,
          metaDescription: null,
          h1Count: 0,
          formCount: 0,
          buttonCount: 0,
          emails: [],
          phones: [],
          bookingWidgetDetected: false,
        });
      }
    }

    const { data: pages } = await supabase
      .from("website_scan_pages")
      .select("id")
      .eq("scan_id", scanRow.id);

    let findings: any[] = [];

    if (pages && pages.length > 0) {
      const pageIds = pages.map((p) => p.id);

      const { data: findingsData } = await supabase
        .from("website_scan_findings")
        .select("*")
        .in("page_id", pageIds);

      findings = findingsData || [];
    }

    const emailFindings = findings.filter(
      (f) => f.finding_type === "email_address"
    );
    const phoneFindings = findings.filter(
      (f) => f.finding_type === "phone_number"
    );
    const bookingFindings = findings.filter(
      (f) => f.finding_type === "booking_widget" && f.finding_value === "true"
    );
    const formFindings = findings.filter((f) => f.finding_type === "form_count");
    const buttonFindings = findings.filter(
      (f) => f.finding_type === "button_count"
    );
    const missingTitleFindings = findings.filter(
      (f) => f.finding_type === "missing_title"
    );
    const missingMetaFindings = findings.filter(
      (f) => f.finding_type === "missing_meta_description"
    );
    const h1Findings = findings.filter((f) => f.finding_type === "h1_count");

    const hasEmail = emailFindings.length > 0;
    const hasPhone = phoneFindings.length > 0;
    const hasBooking = bookingFindings.length > 0;

    const totalForms = formFindings.reduce(
      (sum, f) => sum + (parseInt(f.finding_value, 10) || 0),
      0
    );
    const totalButtons = buttonFindings.reduce(
      (sum, f) => sum + (parseInt(f.finding_value, 10) || 0),
      0
    );

    const pagesWithNoForms = formFindings.filter(
      (f) => (parseInt(f.finding_value, 10) || 0) === 0
    ).length;

    const pagesWithNoButtons = buttonFindings.filter(
      (f) => (parseInt(f.finding_value, 10) || 0) === 0
    ).length;

    const pagesWithNoH1 = h1Findings.filter(
      (f) => (parseInt(f.finding_value, 10) || 0) === 0
    ).length;

    const totalPages = pages?.length || 0;

    const {
      lead_capture_score,
      response_efficiency_score,
      crm_data_score,
      automation_score,
      ai_readiness_score,
      total_score,
      coverage,
    } = calculateScores({
      totalPages,
      pagesWithNoForms,
      pagesWithNoButtons,
      pagesWithNoH1,
      missingTitleCount: missingTitleFindings.length,
      missingMetaCount: missingMetaFindings.length,
      hasEmail,
      hasPhone,
      hasBooking,
      totalForms,
      totalButtons,
    });

    const revenueLeak = estimateRevenueLeak({
      totalPages,
      pagesWithNoForms,
      pagesWithNoButtons,
      hasEmail,
      hasPhone,
      hasBooking,
      totalScore: total_score,
    });

    const scoring_notes = {
      lead_capture_basis: {
        phone: hasPhone,
        email: hasEmail,
        booking_widget: hasBooking,
        total_forms_detected: totalForms,
        total_buttons_detected: totalButtons,
      },
      audit_summary: {
        total_pages: totalPages,
        pages_with_no_forms: pagesWithNoForms,
        pages_with_no_buttons: pagesWithNoButtons,
        pages_with_no_h1: pagesWithNoH1,
        missing_titles: missingTitleFindings.length,
        missing_meta_descriptions: missingMetaFindings.length,
      },
      coverage,
      revenue_leak_estimate: revenueLeak,
      submission_contact: {
        name: submittedName || null,
        email: submittedEmail || null,
        phone: submittedPhone || null,
      },
    };

    const executive_summary = buildExecutiveSummary({
      businessName,
      totalScore: total_score,
      lead_capture_score,
      response_efficiency_score,
      crm_data_score,
      automation_score,
      ai_readiness_score,
      hasBooking,
      hasPhone,
      hasEmail,
      totalForms,
      totalPages,
      pagesWithNoForms,
      pagesWithNoButtons,
      pagesWithNoH1,
      missingTitleCount: missingTitleFindings.length,
      missingMetaCount: missingMetaFindings.length,
    });

    const engagement_flow_map = buildEngagementFlowMap({
      hasEmail,
      hasPhone,
      hasBooking,
      totalForms,
      response_efficiency_score,
      crm_data_score,
      totalPages,
      pagesWithNoForms,
      pagesWithNoButtons,
    });

    const lead_leakage_summary = buildLeadLeakageSummary({
      pagesWithNoForms,
      pagesWithNoButtons,
      hasEmail,
      hasPhone,
      hasBooking,
      pagesWithNoH1,
      missingTitleCount: missingTitleFindings.length,
      missingMetaCount: missingMetaFindings.length,
      totalPages,
    });

    const automation_opportunity_matrix = buildAutomationOpportunityMatrix({
      hasBooking,
      hasPhone,
      hasEmail,
      totalForms,
      response_efficiency_score,
      crm_data_score,
      automation_score,
      pagesWithNoForms,
      pagesWithNoButtons,
    });

    const implementation_blueprint = buildImplementationBlueprint({
      hasPhone,
      totalForms,
      crm_data_score,
      automation_score,
      hasBooking,
      pagesWithNoForms,
      pagesWithNoButtons,
    });

    const detected_stack = buildDetectedStack({
      hasPhone,
      hasEmail,
      hasBooking,
      totalForms,
      crm_data_score,
    });

    const { error: scoresError } = await supabase.from("audit_scores").insert({
      submission_id: submissionId,
      lead_capture_score,
      response_efficiency_score,
      crm_data_score,
      automation_score,
      ai_readiness_score,
      total_score,
      scoring_notes,
    });

    if (scoresError) {
      console.error("Failed to insert audit_scores:", scoresError);

      await supabase
        .from("audit_submissions")
        .update({ status: "failed" })
        .eq("id", submissionId);

      return NextResponse.json(
        { error: "Failed to save audit scores" },
        { status: 500 }
      );
    }

    const auditReportPayload = {
      submission_id: submissionId,
      executive_summary,
      engagement_flow_map,
      lead_leakage_summary,
      automation_opportunity_matrix,
      implementation_blueprint,
      detected_stack,
    };

    const { data: auditReportData, error: auditReportError } = await supabase
      .from("audit_reports")
      .insert(auditReportPayload)
      .select()
      .single();

    if (auditReportError || !auditReportData) {
      console.error("FAILED TO INSERT AUDIT REPORT:", auditReportError);

      await supabase
        .from("website_scans")
        .update({
          scan_status: "failed",
          scan_completed_at: new Date().toISOString(),
        })
        .eq("id", scanRow.id);

      await supabase
        .from("audit_submissions")
        .update({ status: "failed" })
        .eq("id", submissionId);

      return NextResponse.json(
        {
          error: "Failed to save audit report",
          details:
            auditReportError?.message ?? "Unknown audit report insert error",
        },
        { status: 500 }
      );
    }

    await supabase
      .from("website_scans")
      .update({
        scan_status: "completed",
        scan_completed_at: new Date().toISOString(),
      })
      .eq("id", scanRow.id);

    await supabase
      .from("audit_submissions")
      .update({ status: "completed" })
      .eq("id", submissionId);

    return NextResponse.json({
      ok: true,
      id: submissionId,
      auditId: submissionId,
      submissionId,
      businessId,
      businessName,
      websiteUrl,
      submittedContact: {
        name: submittedName || null,
        email: submittedEmail || null,
        phone: submittedPhone || null,
      },
      scanId: scanRow.id,
      reportId: auditReportData.id,
      homepage: {
        title: homepageTitle,
        metaDescription: homepageDescription,
        h1Count: homepageH1Count,
        formCount: homepageFormCount,
        buttonCount: homepageButtonCount,
      },
      crawledPages,
      revenueLeak,
      scoreSummary: {
        lead_capture_score,
        response_efficiency_score,
        crm_data_score,
        automation_score,
        ai_readiness_score,
        total_score,
      },
      reportPreview: {
        executive_summary,
        engagement_flow_map,
        lead_leakage_summary,
        implementation_blueprint,
      },
    });
  } catch (error) {
    console.error("run-audit error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}