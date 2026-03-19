import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
        absolute.includes(".ttf")
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
}) {
  const {
    totalPages,
    pagesWithNoForms,
    pagesWithNoButtons,
    hasEmail,
    hasPhone,
    hasBooking,
  } = params;

  let missedLeadsLow = 5;
  let missedLeadsHigh = 15;

  if (totalPages >= 5) {
    missedLeadsLow += 5;
    missedLeadsHigh += 10;
  }

  if (pagesWithNoForms > 0) {
    missedLeadsLow += pagesWithNoForms * 2;
    missedLeadsHigh += pagesWithNoForms * 4;
  }

  if (pagesWithNoButtons > 0) {
    missedLeadsLow += pagesWithNoButtons;
    missedLeadsHigh += pagesWithNoButtons * 2;
  }

  if (!hasEmail) {
    missedLeadsLow += 2;
    missedLeadsHigh += 5;
  }

  if (!hasPhone) {
    missedLeadsLow += 2;
    missedLeadsHigh += 5;
  }

  if (!hasBooking) {
    missedLeadsLow += 3;
    missedLeadsHigh += 8;
  }

  const estimatedRevenueLow = missedLeadsLow * 300;
  const estimatedRevenueHigh = missedLeadsHigh * 600;

  return {
    missedLeadsLow,
    missedLeadsHigh,
    estimatedRevenueLow,
    estimatedRevenueHigh,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let submissionId = body?.submissionId as string | undefined;
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
      businessName = business.business_name ?? "Website Audit";
      websiteUrl = business.website ?? undefined;
    } else {
      businessName = body?.businessName?.trim();
      websiteUrl = body?.website?.trim();

      if (!businessName || !websiteUrl) {
        return NextResponse.json(
          { error: "Missing businessName or website" },
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

      const { data: submission, error: submissionInsertError } = await supabase
        .from("audit_submissions")
        .insert({
          business_id: business.id,
          status: "pending",
        })
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

    if (!submissionId || !businessId || !websiteUrl) {
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

    let lead_capture_score = 0;
    let response_efficiency_score = 0;
    let crm_data_score = 0;
    let automation_score = 0;
    let ai_readiness_score = 0;

    if (hasPhone) lead_capture_score += 15;
    if (hasEmail) lead_capture_score += 10;
    if (hasBooking) lead_capture_score += 20;
    if (totalForms > 0) lead_capture_score += 25;

    if (hasBooking) response_efficiency_score += 10;
    if (hasPhone) response_efficiency_score += 5;

    if (hasEmail) crm_data_score += 10;
    if (hasPhone) crm_data_score += 5;

    if (hasBooking) automation_score += 10;
    if (totalForms > 0) automation_score += 5;

    if (hasEmail) ai_readiness_score += 5;
    if (hasPhone) ai_readiness_score += 5;
    if (hasBooking) ai_readiness_score += 5;

    const total_score =
      lead_capture_score +
      response_efficiency_score +
      crm_data_score +
      automation_score +
      ai_readiness_score;

    const revenueLeak = estimateRevenueLeak({
      totalPages,
      pagesWithNoForms,
      pagesWithNoButtons,
      hasEmail,
      hasPhone,
      hasBooking,
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
      revenue_leak_estimate: revenueLeak,
    };

    await supabase.from("audit_scores").insert({
      submission_id: submissionId,
      lead_capture_score,
      response_efficiency_score,
      crm_data_score,
      automation_score,
      ai_readiness_score,
      total_score,
      scoring_notes,
    });

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
      auditId: submissionId,
      submissionId,
      businessId,
      websiteUrl,
      scanId: scanRow.id,
      homepage: {
        title: homepageTitle,
        metaDescription: homepageDescription,
        h1Count: homepageH1Count,
        formCount: homepageFormCount,
        buttonCount: homepageButtonCount,
      },
      crawledPages,
      revenueLeak,
    });
  } catch (error) {
    console.error("run-audit error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}