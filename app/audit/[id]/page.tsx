"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuditSubmission = {
  id: string;
  business_id: string;
  status: string | null;
};

type Business = {
  id: string;
  business_name: string | null;
  website: string | null;
};

type AuditScore = {
  id: string;
  submission_id: string;
  lead_capture_score: number | null;
  response_efficiency_score: number | null;
  crm_data_score: number | null;
  automation_score: number | null;
  ai_readiness_score: number | null;
  total_score: number | null;
  scoring_notes: any;
};

type ScanPage = {
  id: string;
  page_url: string;
  page_title: string | null;
  http_status: number | null;
};

type Finding = {
  id: string;
  page_id: string;
  finding_type: string;
  finding_value: string;
  finding_context: string;
};

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #222",
        borderRadius: "14px",
        padding: "20px",
        background: "#111",
      }}
    >
      <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "10px" }}>
        {title}
      </div>
      <div style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.1 }}>
        {value}
      </div>
      {subtitle ? (
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function ScoreCard({
  title,
  value,
  max,
}: {
  title: string;
  value: number;
  max: number;
}) {
  const percent = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  return (
    <div
      style={{
        border: "1px solid #222",
        borderRadius: "14px",
        padding: "20px",
        background: "#111",
      }}
    >
      <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "10px" }}>
        {title}
      </div>
      <div style={{ fontSize: "30px", fontWeight: 700 }}>
        {value}
        <span style={{ fontSize: "18px", color: "#6b7280" }}> / {max}</span>
      </div>
      <div
        style={{
          marginTop: "12px",
          height: "8px",
          background: "#1f2937",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "#fff",
          }}
        />
      </div>
    </div>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "$0";
  return `$${value.toLocaleString()}`;
}

function isLikelyRealPhone(value: string) {
  if (!value) return false;

  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  // Basic length guard
  if (digits.length < 9) return false;
  if (digits.length > 13) return false;

  // Reject repeated or obviously fake patterns
  if (/^(\d)\1+$/.test(digits)) return false;
  if (/123456|234567|345678|456789|987654|876543|765432|111111|222222|999999|000000/.test(digits)) {
    return false;
  }

  // Reject long raw digit strings with no phone-like formatting,
  // unless they clearly look like a normal local/mobile number
  const hasPhoneFormatting = /[+\-\s()]/.test(trimmed);
  const startsLikePhone =
    digits.startsWith("0") ||
    digits.startsWith("61") ||
    digits.startsWith("44") ||
    digits.startsWith("1") ||
    trimmed.startsWith("+");

  if (!hasPhoneFormatting && !startsLikePhone) return false;

  // Reject weird raw numbers that start with unlikely digits for phone display
  if (!trimmed.startsWith("+") && !digits.startsWith("0") && !digits.startsWith("1") && !digits.startsWith("44") && !digits.startsWith("61")) {
    return false;
  }

  return true;
}

export default function AuditPage() {
  const params = useParams();
  const id = params.id as string;

  const [submission, setSubmission] = useState<AuditSubmission | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [score, setScore] = useState<AuditScore | null>(null);
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const { data: submissionData, error: submissionError } = await supabase
          .from("audit_submissions")
          .select("*")
          .eq("id", id)
          .single();

        if (submissionError || !submissionData) {
          setErrorMessage("Audit submission not found.");
          setLoading(false);
          return;
        }

        setSubmission(submissionData);

        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", submissionData.business_id)
          .single();

        if (businessError || !businessData) {
          setErrorMessage("Business not found.");
          setLoading(false);
          return;
        }

        setBusiness(businessData);

        const { data: scoreData } = await supabase
          .from("audit_scores")
          .select("*")
          .eq("submission_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scoreData) {
          setScore(scoreData);
        }

        const { data: scanData } = await supabase
          .from("website_scans")
          .select("id")
          .eq("business_id", businessData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scanData) {
          const { data: pagesData } = await supabase
            .from("website_scan_pages")
            .select("*")
            .eq("scan_id", scanData.id)
            .order("created_at", { ascending: true });

          const pagesList = pagesData || [];
          setPages(pagesList);

          if (pagesList.length > 0) {
            const pageIds = pagesList.map((p) => p.id);

            const { data: findingsData } = await supabase
              .from("website_scan_findings")
              .select("*")
              .in("page_id", pageIds);

            setFindings(findingsData || []);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error(error);
        setErrorMessage("Unexpected error while loading the audit report.");
        setLoading(false);
      }
    };

    if (id) {
      loadReport();
    }
  }, [id]);

  const findingsByPageId = useMemo(() => {
    const map = new Map<string, Finding[]>();

    for (const finding of findings) {
      const existing = map.get(finding.page_id) || [];
      existing.push(finding);
      map.set(finding.page_id, existing);
    }

    return map;
  }, [findings]);

  const emailFindings = useMemo(
    () => findings.filter((f) => f.finding_type === "email_address"),
    [findings]
  );

  const phoneFindings = useMemo(
    () => findings.filter((f) => f.finding_type === "phone_number"),
    [findings]
  );

  const bookingFindings = useMemo(
    () =>
      findings.filter(
        (f) => f.finding_type === "booking_widget" && f.finding_value === "true"
      ),
    [findings]
  );

  const uniqueEmails = useMemo(
    () => Array.from(new Set(emailFindings.map((f) => f.finding_value))),
    [emailFindings]
  );

  const uniquePhones = useMemo(() => {
    const rawPhones = phoneFindings.map((f) => f.finding_value);

    return Array.from(
      new Set(rawPhones.filter((phone) => isLikelyRealPhone(phone)))
    );
  }, [phoneFindings]);

  const filteredFindings = useMemo(() => {
  return findings.filter((finding) => {
    return finding.finding_type !== "phone_number";
  });
}, [findings]);

  const summary = useMemo(() => {
    const totalPages = pages.length;
    const singlePageSite = totalPages <= 1;

    let missingTitles = 0;
    let missingMetaDescriptions = 0;
    let pagesWithNoForms = 0;
    let pagesWithNoButtons = 0;
    let pagesWithNoH1 = 0;

    for (const page of pages) {
      const pageFindings = findingsByPageId.get(page.id) || [];

      const hasMissingTitle = pageFindings.some(
        (f) => f.finding_type === "missing_title"
      );
      const hasMissingMeta = pageFindings.some(
        (f) => f.finding_type === "missing_meta_description"
      );

      const h1CountFinding = pageFindings.find((f) => f.finding_type === "h1_count");
      const formCountFinding = pageFindings.find(
        (f) => f.finding_type === "form_count"
      );
      const buttonCountFinding = pageFindings.find(
        (f) => f.finding_type === "button_count"
      );

      const h1Count = h1CountFinding ? parseInt(h1CountFinding.finding_value, 10) : 0;
      const formCount = formCountFinding
        ? parseInt(formCountFinding.finding_value, 10)
        : 0;
      const buttonCount = buttonCountFinding
        ? parseInt(buttonCountFinding.finding_value, 10)
        : 0;

      if (hasMissingTitle) missingTitles += 1;
      if (hasMissingMeta) missingMetaDescriptions += 1;
      if (formCount === 0) pagesWithNoForms += 1;
      if (buttonCount === 0) pagesWithNoButtons += 1;
      if (h1Count === 0) pagesWithNoH1 += 1;
    }

    return {
      totalPages,
      siteStructure: singlePageSite ? "Single-page site" : "Multi-page site",
      missingTitles,
      missingMetaDescriptions,
      pagesWithNoForms,
      pagesWithNoButtons,
      pagesWithNoH1,
    };
  }, [pages, findingsByPageId]);

  const revenueLeak = useMemo(() => {
    const notes = score?.scoring_notes?.revenue_leak_estimate;
    if (!notes) {
      return {
        missedLeadsLow: 0,
        missedLeadsHigh: 0,
        estimatedRevenueLow: 0,
        estimatedRevenueHigh: 0,
      };
    }

    return {
      missedLeadsLow: notes.missedLeadsLow ?? 0,
      missedLeadsHigh: notes.missedLeadsHigh ?? 0,
      estimatedRevenueLow: notes.estimatedRevenueLow ?? 0,
      estimatedRevenueHigh: notes.estimatedRevenueHigh ?? 0,
    };
  }, [score]);

  const auditHighlights = useMemo(() => {
    const items: string[] = [];

    if (summary.totalPages <= 1) {
      items.push("This website appears to be a single-page site.");
    } else {
      items.push(`The audit scanned ${summary.totalPages} pages.`);
    }

    if (summary.missingTitles > 0) {
      items.push(`${summary.missingTitles} page(s) are missing title tags.`);
    }

    if (summary.missingMetaDescriptions > 0) {
      items.push(
        `${summary.missingMetaDescriptions} page(s) are missing meta descriptions.`
      );
    }

    if (summary.pagesWithNoForms > 0) {
      items.push(`${summary.pagesWithNoForms} page(s) have no lead capture form.`);
    }

    if (summary.pagesWithNoButtons > 0) {
      items.push(`${summary.pagesWithNoButtons} page(s) have no button elements.`);
    }

    if (summary.pagesWithNoH1 > 0) {
      items.push(`${summary.pagesWithNoH1} page(s) have no H1 heading.`);
    }

    if (uniqueEmails.length > 0) {
      items.push(`${uniqueEmails.length} unique email address(es) were detected.`);
    }

    if (uniquePhones.length > 0) {
      items.push(`${uniquePhones.length} unique phone number(s) were detected.`);
    }

    if (bookingFindings.length > 0) {
      items.push("A booking widget or booking signal was detected.");
    }

    if (items.length === 0) {
      items.push("No major structural issues were detected in this scan.");
    }

    return items.slice(0, 8);
  }, [summary, uniqueEmails.length, uniquePhones.length, bookingFindings.length]);

  const aiDiagnosis = useMemo(() => {
    const businessName = business?.business_name || "This website";
    const lines: string[] = [];

    if (summary.totalPages <= 1) {
      lines.push(
        `${businessName} appears to be using a single-page website structure, which can work well for simple offers but often limits SEO depth and conversion pathways.`
      );
    } else {
      lines.push(
        `${businessName} has a multi-page website structure with ${summary.totalPages} scanned pages, which creates more opportunities for search visibility and lead capture if each page is properly optimized.`
      );
    }

    if (summary.pagesWithNoForms > 0) {
      lines.push(
        `${summary.pagesWithNoForms} page(s) currently have no lead capture form, which means visitors may have no direct way to convert into enquiries.`
      );
    }

    if (summary.pagesWithNoButtons > 0) {
      lines.push(
        `${summary.pagesWithNoButtons} page(s) have no button elements, which weakens calls to action and reduces the chance of visitor action.`
      );
    }

    if (uniqueEmails.length === 0 && uniquePhones.length === 0) {
      lines.push(
        `No clear contact signals were detected, which may create friction for visitors trying to reach the business.`
      );
    } else {
      lines.push(
        `The website does show contact signals, which supports trust and gives visitors ways to make contact.`
      );
    }

    if (bookingFindings.length > 0) {
      lines.push(
        `A booking signal is present, which is a strong foundation for faster lead handling and automation.`
      );
    } else {
      lines.push(
        `No booking widget was detected, so appointment-ready traffic may not be converting as efficiently as it could.`
      );
    }

    lines.push(
      `Based on the current structure, the biggest opportunity is to strengthen lead capture, improve conversion paths, and connect enquiry handling to automation or CRM follow-up.`
    );

    return lines.slice(0, 6);
  }, [business, summary, uniqueEmails.length, uniquePhones.length, bookingFindings.length]);

  const recommendations = useMemo(() => {
    const items: string[] = [];

    if (summary.pagesWithNoForms > 0) {
      items.push("Add lead capture forms to key service and landing pages.");
    }

    if (summary.pagesWithNoButtons > 0) {
      items.push("Add stronger call-to-action buttons on pages with no action path.");
    }

    if (bookingFindings.length === 0) {
      items.push("Add booking automation for demos, quotes, or appointments.");
    }

    if (uniqueEmails.length === 0 || uniquePhones.length === 0) {
      items.push("Make contact options more visible across the site.");
    }

    if (summary.missingTitles > 0 || summary.missingMetaDescriptions > 0) {
      items.push("Fix basic SEO metadata to improve search visibility and click-through rate.");
    }

    items.push("Connect website enquiries to a CRM and follow-up automation.");
    items.push("Consider AI chat to capture and qualify visitors in real time.");

    return items.slice(0, 6);
  }, [summary, bookingFindings.length, uniqueEmails.length, uniquePhones.length]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          padding: "32px 24px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>Loading report...</h1>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          padding: "32px 24px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>Audit Error</h1>
        <p>{errorMessage}</p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "32px 24px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 700 }}>Scaptra Audit</div>
          <div style={{ fontSize: "13px", color: "#9ca3af" }}>
            Automated Website Operations Audit
          </div>
        </div>

        <div
          style={{
            border: "1px solid #222",
            borderRadius: "18px",
            padding: "28px",
            background: "#0b0b0b",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "10px" }}>
            Scaptra Audit Report
          </div>

          <h1 style={{ fontSize: "42px", margin: 0 }}>
            {business?.business_name || "Business Audit"}
          </h1>

          <div
            style={{
              marginTop: "14px",
              color: "#d1d5db",
              display: "grid",
              gap: "6px",
            }}
          >
            <div>
              <strong>Website:</strong> {business?.website || "N/A"}
            </div>
            <div>
              <strong>Submission ID:</strong> {submission?.id}
            </div>
            <div>
              <strong>Status:</strong> {submission?.status || "Unknown"}
            </div>
            <div>
              <strong>Site structure:</strong> {summary.siteStructure}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <SummaryCard
            title="Overall Audit Score"
            value={`${score?.total_score ?? 0} / 100`}
            subtitle="Current score based on detected lead capture and automation signals"
          />
          <SummaryCard
            title="Pages Scanned"
            value={summary.totalPages}
            subtitle={summary.siteStructure}
          />
          <SummaryCard
            title="Missing Titles"
            value={summary.missingTitles}
            subtitle="Pages without a title tag"
          />
          <SummaryCard
            title="Missing Meta Descriptions"
            value={summary.missingMetaDescriptions}
            subtitle="Pages without a meta description"
          />
          <SummaryCard
            title="Pages With No Forms"
            value={summary.pagesWithNoForms}
            subtitle="Possible lead capture gap"
          />
          <SummaryCard
            title="Pages With No Buttons"
            value={summary.pagesWithNoButtons}
            subtitle="Potential weak call-to-action structure"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <ScoreCard
            title="Lead Capture"
            value={score?.lead_capture_score ?? 0}
            max={70}
          />
          <ScoreCard
            title="Response Efficiency"
            value={score?.response_efficiency_score ?? 0}
            max={15}
          />
          <ScoreCard title="CRM Data" value={score?.crm_data_score ?? 0} max={15} />
          <ScoreCard
            title="Automation"
            value={score?.automation_score ?? 0}
            max={15}
          />
          <ScoreCard
            title="AI Readiness"
            value={score?.ai_readiness_score ?? 0}
            max={15}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <SummaryCard
            title="Detected Emails"
            value={uniqueEmails.length}
            subtitle={uniqueEmails.length > 0 ? uniqueEmails[0] : "None detected"}
          />
          <SummaryCard
            title="Detected Phone Numbers"
            value={uniquePhones.length}
            subtitle={uniquePhones.length > 0 ? "Contact signals found" : "None detected"}
          />
          <SummaryCard
            title="Booking Signal"
            value={bookingFindings.length > 0 ? "Yes" : "No"}
            subtitle={
              bookingFindings.length > 0
                ? "Booking widget or booking keyword detected"
                : "No booking widget detected"
            }
          />
          <SummaryCard
            title="Estimated Missed Leads"
            value={`${revenueLeak.missedLeadsLow} - ${revenueLeak.missedLeadsHigh}`}
            subtitle="Estimated per month"
          />
          <SummaryCard
            title="Estimated Revenue Leak"
            value={`${formatCurrency(revenueLeak.estimatedRevenueLow)} - ${formatCurrency(
              revenueLeak.estimatedRevenueHigh
            )}`}
            subtitle="Estimated monthly revenue at risk"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "20px",
            marginBottom: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid #222",
              borderRadius: "18px",
              padding: "24px",
              background: "#0b0b0b",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "14px" }}>Audit Highlights</h2>

            <div style={{ display: "grid", gap: "12px" }}>
              {auditHighlights.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    border: "1px solid #222",
                    borderRadius: "12px",
                    padding: "14px",
                    background: "#111",
                    color: "#e5e7eb",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #222",
              borderRadius: "18px",
              padding: "24px",
              background: "#0b0b0b",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "14px" }}>Homepage Snapshot</h2>

            {pages.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>No page data found.</p>
            ) : (
              <div style={{ color: "#d1d5db", display: "grid", gap: "8px" }}>
                <div>
                  <strong>Title:</strong> {pages[0]?.page_title || "None found"}
                </div>
                <div>
                  <strong>URL:</strong> {pages[0]?.page_url || "N/A"}
                </div>
                <div>
                  <strong>Status Code:</strong> {pages[0]?.http_status ?? "Unknown"}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "20px",
            marginBottom: "24px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              border: "1px solid #222",
              borderRadius: "18px",
              padding: "24px",
              background: "#0b0b0b",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "14px" }}>Scaptra AI Diagnosis</h2>

            <div style={{ display: "grid", gap: "12px" }}>
              {aiDiagnosis.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    border: "1px solid #222",
                    borderRadius: "12px",
                    padding: "14px",
                    background: "#111",
                    color: "#e5e7eb",
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #222",
              borderRadius: "18px",
              padding: "24px",
              background: "#0b0b0b",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "14px" }}>Recommended Actions</h2>

            <div style={{ display: "grid", gap: "12px" }}>
              {recommendations.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    border: "1px solid #222",
                    borderRadius: "12px",
                    padding: "14px",
                    background: "#111",
                    color: "#e5e7eb",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #222",
            borderRadius: "18px",
            padding: "24px",
            background: "#0b0b0b",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "14px" }}>Contact Signals Detected</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "20px",
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ marginBottom: "10px", color: "#9ca3af", fontSize: "14px" }}>
                Email Addresses
              </div>
              {uniqueEmails.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No emails detected.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {uniqueEmails.slice(0, 8).map((email) => (
                    <div
                      key={email}
                      style={{
                        border: "1px solid #222",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#111",
                        color: "#e5e7eb",
                      }}
                    >
                      {email}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div style={{ marginBottom: "10px", color: "#9ca3af", fontSize: "14px" }}>
                Phone Numbers
              </div>
              {uniquePhones.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No phone numbers detected.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {uniquePhones.slice(0, 8).map((phone) => (
                    <div
                      key={phone}
                      style={{
                        border: "1px solid #222",
                        borderRadius: "10px",
                        padding: "12px",
                        background: "#111",
                        color: "#e5e7eb",
                      }}
                    >
                      {phone}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #222",
            borderRadius: "18px",
            padding: "24px",
            background: "#0b0b0b",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "14px" }}>Detailed Findings</h2>

          {filteredFindings.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>No findings stored yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {filteredFindings.slice(0, 16).map((finding) => (
                <div
                  key={finding.id}
                  style={{
                    border: "1px solid #222",
                    borderRadius: "12px",
                    padding: "14px",
                    background: "#111",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                    {finding.finding_type}
                  </div>
                  <div style={{ color: "#d1d5db", marginBottom: "4px" }}>
                    Value: {finding.finding_value}
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: "14px" }}>
                    {finding.finding_context}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            border: "1px solid #222",
            borderRadius: "18px",
            padding: "24px",
            background: "#0b0b0b",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "14px" }}>Crawled Pages</h2>

          {pages.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>No crawled pages found.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {pages.map((page) => {
                const pageFindings = findingsByPageId.get(page.id) || [];

                const h1CountFinding = pageFindings.find(
                  (f) => f.finding_type === "h1_count"
                );
                const formCountFinding = pageFindings.find(
                  (f) => f.finding_type === "form_count"
                );
                const buttonCountFinding = pageFindings.find(
                  (f) => f.finding_type === "button_count"
                );

                return (
                  <div
                    key={page.id}
                    style={{
                      border: "1px solid #222",
                      borderRadius: "12px",
                      padding: "14px",
                      background: "#111",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: "6px" }}>
                      {page.page_title || "Untitled Page"}
                    </div>
                    <div style={{ color: "#d1d5db", fontSize: "14px" }}>
                      {page.page_url}
                    </div>
                    <div
                      style={{
                        marginTop: "10px",
                        display: "grid",
                        gap: "4px",
                        color: "#9ca3af",
                        fontSize: "14px",
                      }}
                    >
                      <div>HTTP Status: {page.http_status ?? "Unknown"}</div>
                      <div>H1 Count: {h1CountFinding?.finding_value ?? "0"}</div>
                      <div>Form Count: {formCountFinding?.finding_value ?? "0"}</div>
                      <div>
                        Button Count: {buttonCountFinding?.finding_value ?? "0"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "40px",
            border: "1px solid #222",
            borderRadius: "16px",
            padding: "24px",
            background: "#0b0b0b",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Next Step</h2>

          <p style={{ color: "#d1d5db" }}>
            This audit highlights opportunities to improve lead capture, response
            speed, and automation across the website.
          </p>

          <p style={{ color: "#9ca3af" }}>
            If you would like help implementing the recommended improvements,
            Scaptra can assist with system design and automation deployment.
          </p>

          <div style={{ marginTop: "14px", fontWeight: 600 }}>
            support@scaptra.ai
          </div>
        </div>
      </div>
    </main>
  );
}