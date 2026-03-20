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

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #1f2937",
        borderRadius: "20px",
        background:
          "linear-gradient(180deg, rgba(17,24,39,0.96) 0%, rgba(3,7,18,0.96) 100%)",
        padding: "24px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            color: "#f9fafb",
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            style={{
              margin: "6px 0 0",
              color: "#94a3b8",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #1f2937",
        borderRadius: "18px",
        padding: "18px",
        background: "rgba(15, 23, 42, 0.78)",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: "13px",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#f8fafc",
          fontSize: "30px",
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {helper ? (
        <div
          style={{
            marginTop: "8px",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percent = Math.max(0, Math.min(100, Math.round((value / max) * 100)));

  return (
    <div
      style={{
        border: "1px solid #1f2937",
        borderRadius: "18px",
        padding: "18px",
        background: "rgba(15, 23, 42, 0.78)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div style={{ color: "#cbd5e1", fontSize: "14px", fontWeight: 600 }}>
          {label}
        </div>
        <div style={{ color: "#f8fafc", fontSize: "14px", fontWeight: 700 }}>
          {value} / {max}
        </div>
      </div>

      <div
        style={{
          height: "10px",
          width: "100%",
          background: "#111827",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, rgba(99,102,241,1) 0%, rgba(56,189,248,1) 100%)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: "10px",
          color: "#64748b",
          fontSize: "12px",
        }}
      >
        {percent}% of benchmark
      </div>
    </div>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "$0";
  return `$${value.toLocaleString()}`;
}

function scoreBand(score: number) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Attention";
  return "High Priority";
}

function scoreColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#38bdf8";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAuditDate() {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isLikelyRealPhone(value: string) {
  if (!value) return false;

  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 10) return false;
  if (digits.length > 12) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (
    /123456|234567|345678|456789|987654|876543|765432|111111|222222|999999|000000/.test(
      digits
    )
  ) {
    return false;
  }

  const startsValid =
    trimmed.startsWith("+") ||
    digits.startsWith("0") ||
    digits.startsWith("61") ||
    digits.startsWith("44") ||
    digits.startsWith("1");

  if (!startsValid) return false;

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

  const executiveSummary = useMemo(() => {
    const items: string[] = [];

    if ((score?.total_score ?? 0) < 50) {
      items.push(
        "The site shows clear gaps in lead capture and follow-up readiness, which likely reduces enquiry conversion."
      );
    } else if ((score?.total_score ?? 0) < 75) {
      items.push(
        "The site has a workable foundation, but several conversion and response opportunities are still being missed."
      );
    } else {
      items.push(
        "The site has a strong foundation, though there are still opportunities to tighten conversion and automation."
      );
    }

    if (summary.pagesWithNoForms > 0) {
      items.push(
        `${summary.pagesWithNoForms} page(s) currently have no form, limiting direct lead capture opportunities.`
      );
    }

    if (bookingFindings.length === 0) {
      items.push(
        "No booking signal was detected, which may slow down or interrupt high-intent enquiries."
      );
    } else {
      items.push(
        "A booking signal is present, which supports faster lead handling and better automation potential."
      );
    }

    if (uniqueEmails.length === 0 && uniquePhones.length === 0) {
      items.push(
        "Visible contact signals are weak, making it harder for visitors to take action quickly."
      );
    } else {
      items.push(
        "Contact signals are visible, giving visitors at least one clear way to make contact."
      );
    }

    return items.slice(0, 4);
  }, [score, summary, bookingFindings.length, uniqueEmails.length, uniquePhones.length]);

  const recommendations = useMemo(() => {
    const items: string[] = [];

    if (summary.pagesWithNoForms > 0) {
      items.push("Add lead capture forms to key service and landing pages.");
    }

    if (summary.pagesWithNoButtons > 0) {
      items.push("Strengthen call-to-action buttons on pages with weak conversion paths.");
    }

    if (bookingFindings.length === 0) {
      items.push("Add a booking flow for quotes, consultations, or demos.");
    }

    if (summary.missingTitles > 0 || summary.missingMetaDescriptions > 0) {
      items.push("Fix page metadata to improve discoverability and click-through.");
    }

    items.push("Connect enquiries to a CRM and automate first response.");
    items.push("Add AI-assisted chat or qualification flow for inbound visitors.");

    return items.slice(0, 6);
  }, [summary, bookingFindings.length]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, rgba(30,41,59,0.45) 0%, #020617 45%, #000000 100%)",
          color: "#fff",
          padding: "32px 24px 80px",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ color: "#f8fafc" }}>Loading audit report...</h1>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, rgba(30,41,59,0.45) 0%, #020617 45%, #000000 100%)",
          color: "#fff",
          padding: "32px 24px 80px",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <h1 style={{ color: "#f8fafc" }}>Audit Error</h1>
          <p style={{ color: "#cbd5e1" }}>{errorMessage}</p>
        </div>
      </main>
    );
  }

  const totalScore = score?.total_score ?? 0;
  const scoreLabel = scoreBand(totalScore);
  const scoreAccent = scoreColor(totalScore);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(30,41,59,0.45) 0%, #020617 45%, #000000 100%)",
        color: "#fff",
        padding: "32px 24px 80px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
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
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#38bdf8",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Scaptra Audit
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "40px",
                lineHeight: 1.05,
                color: "#f8fafc",
              }}
            >
              Website Audit Report
            </h1>
          </div>

          <div
            style={{
              border: `1px solid ${scoreAccent}`,
              borderRadius: "999px",
              padding: "10px 16px",
              color: scoreAccent,
              fontWeight: 700,
              fontSize: "14px",
              background: "rgba(15,23,42,0.75)",
            }}
          >
            {scoreLabel}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 1.25fr) minmax(260px, 0.75fr)",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "24px",
              padding: "28px",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.96) 55%, rgba(2,6,23,0.98) 100%)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "10px",
              }}
            >
              Audit Overview
            </div>

            <div
              style={{
                color: "#f8fafc",
                fontSize: "42px",
                fontWeight: 800,
                lineHeight: 1.05,
                marginBottom: "12px",
              }}
            >
              {business?.business_name || "Business Audit"}
            </div>

            <div
              style={{
                display: "grid",
                gap: "8px",
                color: "#cbd5e1",
                fontSize: "15px",
              }}
            >
              <div>
                <strong>Website:</strong>{" "}
                <a
                  href={business?.website || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#38bdf8", textDecoration: "none" }}
                >
                  {business?.website || "N/A"}
                </a>
              </div>
              <div>
                <strong>Status:</strong> {formatStatus(submission?.status)}
              </div>
              <div>
                <strong>Report Date:</strong> {formatAuditDate()}
              </div>
              <div>
                <strong>Site Structure:</strong> {summary.siteStructure}
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
                color: "#94a3b8",
                lineHeight: 1.6,
                maxWidth: "860px",
                fontSize: "15px",
              }}
            >
              This report highlights how effectively the website captures enquiries,
              supports fast response, and prepares the business for automation and AI-led follow-up.
            </div>
          </div>

          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "24px",
              padding: "28px",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.98) 100%)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "12px",
              }}
            >
              Overall Score
            </div>

            <div
              style={{
                fontSize: "72px",
                fontWeight: 800,
                lineHeight: 1,
                color: scoreAccent,
                marginBottom: "10px",
              }}
            >
              {totalScore}
            </div>

            <div
              style={{
                color: "#e2e8f0",
                fontSize: "18px",
                fontWeight: 700,
                marginBottom: "6px",
              }}
            >
              {scoreLabel}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "14px",
                maxWidth: "240px",
                lineHeight: 1.5,
              }}
            >
              Composite score based on lead capture, response readiness, CRM signals,
              automation opportunity, and AI readiness.
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
          <MetricCard
            label="Pages Scanned"
            value={summary.totalPages}
            helper={summary.siteStructure}
          />
          <MetricCard
            label="Detected Emails"
            value={uniqueEmails.length}
            helper={uniqueEmails.length > 0 ? uniqueEmails[0] : "No email detected"}
          />
          <MetricCard
            label="Detected Phone Numbers"
            value={uniquePhones.length}
            helper={uniquePhones.length > 0 ? "Contact path available" : "No phone detected"}
          />
          <MetricCard
            label="Booking Signal"
            value={bookingFindings.length > 0 ? "Yes" : "No"}
            helper={
              bookingFindings.length > 0
                ? "Booking flow or booking signal detected"
                : "No booking signal detected"
            }
          />
          <MetricCard
            label="Revenue Risk"
            value={`${formatCurrency(revenueLeak.estimatedRevenueLow)} - ${formatCurrency(
              revenueLeak.estimatedRevenueHigh
            )}`}
            helper="Estimated monthly revenue at risk"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <ScoreBar
            label="Lead Capture"
            value={score?.lead_capture_score ?? 0}
            max={70}
          />
          <ScoreBar
            label="Response Efficiency"
            value={score?.response_efficiency_score ?? 0}
            max={15}
          />
          <ScoreBar
            label="CRM Data"
            value={score?.crm_data_score ?? 0}
            max={15}
          />
          <ScoreBar
            label="Automation"
            value={score?.automation_score ?? 0}
            max={15}
          />
          <ScoreBar
            label="AI Readiness"
            value={score?.ai_readiness_score ?? 0}
            max={15}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <SectionCard
            title="Executive Summary"
            subtitle="A concise view of what matters most from the audit."
          >
            <div style={{ display: "grid", gap: "12px" }}>
              {executiveSummary.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e2e8f0",
                    lineHeight: 1.6,
                    fontSize: "14px",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Priority Actions"
            subtitle="Recommended next moves based on the current site structure and conversion signals."
          >
            <div style={{ display: "grid", gap: "12px" }}>
              {recommendations.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e2e8f0",
                    lineHeight: 1.6,
                    fontSize: "14px",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <SectionCard
            title="Technical Signals"
            subtitle="Core structural and conversion findings from the crawl."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <MetricCard
                label="Missing Titles"
                value={summary.missingTitles}
                helper="Pages without title tags"
              />
              <MetricCard
                label="Missing Meta Descriptions"
                value={summary.missingMetaDescriptions}
                helper="Pages without meta descriptions"
              />
              <MetricCard
                label="Pages With No Forms"
                value={summary.pagesWithNoForms}
                helper="Lead capture gap"
              />
              <MetricCard
                label="Pages With No Buttons"
                value={summary.pagesWithNoButtons}
                helper="Weak conversion path"
              />
              <MetricCard
                label="Pages With No H1"
                value={summary.pagesWithNoH1}
                helper="Heading structure issue"
              />
              <MetricCard
                label="Missed Leads Estimate"
                value={`${revenueLeak.missedLeadsLow} - ${revenueLeak.missedLeadsHigh}`}
                helper="Estimated monthly missed enquiries"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Homepage Snapshot"
            subtitle="A quick look at the homepage or primary landing page scan."
          >
            {pages.length === 0 ? (
              <p style={{ color: "#94a3b8" }}>No page data found.</p>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>
                    Page Title
                  </div>
                  <div style={{ color: "#f8fafc", lineHeight: 1.5 }}>
                    {pages[0]?.page_title || "None found"}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>
                    URL
                  </div>
                  <a
                    href={pages[0]?.page_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#38bdf8", textDecoration: "none", lineHeight: 1.5 }}
                  >
                    {pages[0]?.page_url || "N/A"}
                  </a>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >
                  <MetricCard
                    label="HTTP Status"
                    value={pages[0]?.http_status ?? "Unknown"}
                  />
                  <MetricCard
                    label="H1 Count"
                    value={
                      findingsByPageId
                        .get(pages[0]?.id || "")
                        ?.find((f) => f.finding_type === "h1_count")?.finding_value ?? "0"
                    }
                  />
                  <MetricCard
                    label="Form Count"
                    value={
                      findingsByPageId
                        .get(pages[0]?.id || "")
                        ?.find((f) => f.finding_type === "form_count")?.finding_value ?? "0"
                    }
                  />
                  <MetricCard
                    label="Button Count"
                    value={
                      findingsByPageId
                        .get(pages[0]?.id || "")
                        ?.find((f) => f.finding_type === "button_count")?.finding_value ?? "0"
                    }
                  />
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Contact Signals"
          subtitle="Visible contact paths detected across the scanned pages."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "12px",
                  fontWeight: 700,
                }}
              >
                Email Addresses
              </div>

              {uniqueEmails.length === 0 ? (
                <div style={{ color: "#64748b" }}>No email addresses detected.</div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {uniqueEmails.slice(0, 8).map((email) => (
                    <div
                      key={email}
                      style={{
                        border: "1px solid #1f2937",
                        borderRadius: "14px",
                        padding: "12px 14px",
                        background: "rgba(15,23,42,0.65)",
                        color: "#e2e8f0",
                      }}
                    >
                      {email}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "12px",
                  fontWeight: 700,
                }}
              >
                Phone Numbers
              </div>

              {uniquePhones.length === 0 ? (
                <div style={{ color: "#64748b" }}>No phone numbers detected.</div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {uniquePhones.slice(0, 8).map((phone) => (
                    <div
                      key={phone}
                      style={{
                        border: "1px solid #1f2937",
                        borderRadius: "14px",
                        padding: "12px 14px",
                        background: "rgba(15,23,42,0.65)",
                        color: "#e2e8f0",
                      }}
                    >
                      {phone}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <div style={{ height: "24px" }} />

        <SectionCard
          title="Detailed Findings"
          subtitle="Lower-level findings captured during the crawl."
        >
          {filteredFindings.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No findings stored yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {filteredFindings.slice(0, 16).map((finding) => (
                <div
                  key={finding.id}
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "rgba(15,23,42,0.6)",
                  }}
                >
                  <div
                    style={{
                      color: "#f8fafc",
                      fontWeight: 700,
                      marginBottom: "6px",
                      fontSize: "15px",
                    }}
                  >
                    {finding.finding_type}
                  </div>
                  <div style={{ color: "#cbd5e1", marginBottom: "4px", fontSize: "14px" }}>
                    Value: {finding.finding_value}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
                    {finding.finding_context}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div style={{ height: "24px" }} />

        <SectionCard
          title="Crawled Pages"
          subtitle="Pages included in the latest crawl and their core page-level metrics."
        >
          {pages.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No crawled pages found.</p>
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
                      border: "1px solid #1f2937",
                      borderRadius: "16px",
                      padding: "16px",
                      background: "rgba(15,23,42,0.6)",
                    }}
                  >
                    <div
                      style={{
                        color: "#f8fafc",
                        fontWeight: 700,
                        marginBottom: "6px",
                        fontSize: "16px",
                      }}
                    >
                      {page.page_title || "Untitled Page"}
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <a
                        href={page.page_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#38bdf8", textDecoration: "none", fontSize: "14px" }}
                      >
                        {page.page_url}
                      </a>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <MetricCard label="HTTP Status" value={page.http_status ?? "Unknown"} />
                      <MetricCard
                        label="H1 Count"
                        value={h1CountFinding?.finding_value ?? "0"}
                      />
                      <MetricCard
                        label="Form Count"
                        value={formCountFinding?.finding_value ?? "0"}
                      />
                      <MetricCard
                        label="Button Count"
                        value={buttonCountFinding?.finding_value ?? "0"}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div style={{ height: "24px" }} />

        <div
  style={{
    border: "1px solid #1f2937",
    borderRadius: "24px",
    padding: "32px",
    background:
      "linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(15,23,42,0.95) 50%, rgba(2,6,23,0.98) 100%)",
    boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
  }}
>
  <div
    style={{
      color: "#38bdf8",
      fontSize: "13px",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "10px",
      fontWeight: 700,
    }}
  >
    Next Step
  </div>

  <h2
    style={{
      margin: "0 0 12px",
      color: "#f8fafc",
      fontSize: "30px",
      lineHeight: 1.2,
    }}
  >
    Stop losing enquiries and fix the gaps
  </h2>

  <p
    style={{
      color: "#cbd5e1",
      lineHeight: 1.7,
      maxWidth: "860px",
      fontSize: "15px",
      marginBottom: "20px",
    }}
  >
    This audit highlights where enquiries are being missed, where response
    speed breaks down, and where automation can recover lost opportunities.
    Most businesses don’t need more leads — they need better systems to
    handle the ones they already have.
  </p>

  <div
    style={{
      display: "flex",
      gap: "14px",
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <a
      href="mailto:support@scaptra.ai?subject=Audit Follow Up"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        padding: "14px 22px",
        background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
        color: "#020617",
        fontWeight: 800,
        textDecoration: "none",
        fontSize: "14px",
      }}
    >
      Book a Strategy Call
    </a>

    <a
      href="mailto:support@scaptra.ai"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        padding: "14px 22px",
        border: "1px solid #334155",
        color: "#e2e8f0",
        textDecoration: "none",
        fontWeight: 600,
        fontSize: "14px",
      }}
    >
      Email Support
    </a>

    <div
      style={{
        color: "#64748b",
        fontSize: "13px",
      }}
    >
      No pressure — just clarity on what to fix first
    </div>
  </div>
</div>
      </div>
    </main>
  );
}