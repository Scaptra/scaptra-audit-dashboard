import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type AuditRow = {
  id: string;
  submission_id: string | null;
  executive_summary: string | null;
  engagement_flow_map: string | null;
  lead_leakage_summary: string | null;
  automation_opportunity_matrix:
    | Record<string, string>
    | Record<string, { title?: string; description?: string; impact?: string }>
    | null;
  implementation_blueprint: string | null;
  detected_stack: Record<string, string> | null;
  created_at: string;
};

function getScoreLabel(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "High Risk";
}

function getScoreMessage(score: number) {
  if (score >= 85) {
    return "Your enquiry flow is in good shape, but there is still room to tighten conversion.";
  }
  if (score >= 70) {
    return "The fundamentals are there, but some gaps are likely costing you leads.";
  }
  if (score >= 50) {
    return "There are clear weaknesses in the way enquiries are handled and converted.";
  }
  return "Revenue is likely leaking through multiple points in the enquiry journey.";
}

function getPriorityFromScore(score: number) {
  if (score >= 85) return "Low";
  if (score >= 70) return "Moderate";
  if (score >= 50) return "High";
  return "Urgent";
}

function scoreRingStyle(score: number): React.CSSProperties {
  const degrees = Math.max(0, Math.min(100, score)) * 3.6;
  return {
    background: `conic-gradient(#38bdf8 ${degrees}deg, rgba(255,255,255,0.08) ${degrees}deg)`,
  };
}

function formatDate(input: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}

function toParagraphs(value: string | null | undefined, fallbacks: string[]) {
  if (!value || !value.trim()) return fallbacks;

  return value
    .split(/\n{2,}|•|-|\d+\./)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toOpportunityList(
  value: AuditRow["automation_opportunity_matrix"]
): string[] {
  if (!value || typeof value !== "object") {
    return [
      "Automation opportunities were detected, but no readable items were available.",
    ];
  }

  const items = Object.values(value)
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (!entry || typeof entry !== "object") return "";

      const parts = [entry.title, entry.description, entry.impact]
        .filter(Boolean)
        .map((part) => String(part).trim())
        .filter(Boolean);

      return parts.join(" — ");
    })
    .filter(Boolean);

  return items.length > 0
    ? items
    : [
        "Automation opportunities were detected, but no readable items were available.",
      ];
}

function inferStackFromText(audit: AuditRow) {
  if (audit.detected_stack && Object.keys(audit.detected_stack).length > 0) {
    return audit.detected_stack;
  }

  const combined = [
    audit.executive_summary,
    audit.engagement_flow_map,
    audit.lead_leakage_summary,
    audit.implementation_blueprint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const has = (terms: string[]) => terms.some((term) => combined.includes(term));

  return {
    website_form: has(["website form", "form", "contact form"])
      ? "Detected"
      : "Unclear",
    live_chat: has(["live chat", "chat widget", "chat"])
      ? "Detected"
      : "Not detected",
    ai_chatbot: has(["ai chatbot", "chatbot", "assistant"])
      ? "Possible / unconfirmed"
      : "Not detected",
    crm: has(["crm"]) ? "Detected" : "Unclear",
    missed_call_handling: has(["missed call", "text back", "callback"])
      ? "Detected"
      : "Not detected",
    after_hours_response: has(["after-hours", "after hours", "out of hours"])
      ? "Detected"
      : "Weak or not detected",
  };
}

async function getAudit(id: string): Promise<AuditRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing Supabase environment variables.");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("audit_reports")
    .select("*")
    .or(`id.eq.${id},submission_id.eq.${id}`)
    .maybeSingle();

  if (error) {
    console.error("Failed to load audit report", error);
    return null;
  }

  return data as AuditRow | null;
}

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audit = await getAudit(id);

  if (!audit) notFound();

  const businessName = "Scaptra Audit Report";
  const websiteUrl = `Submission ID: ${audit.submission_id || audit.id}`;
  const overallScore = 65;
  const responseSpeedScore = 62;
  const enquiryPathScore = 68;
  const trustScore = 64;
  const conversionScore = 59;

  const findings = toParagraphs(audit.lead_leakage_summary, [
    "Primary lead leakage risks include delayed response times, incomplete after-hours coverage, and inconsistent follow-up.",
  ]);

  const engagementFlow = toParagraphs(audit.engagement_flow_map, [
    "Current engagement flow could not be fully mapped from the available audit output.",
  ]);

  const quickWins = toOpportunityList(audit.automation_opportunity_matrix);

  const nextStep =
    audit.implementation_blueprint ||
    "Install a simple enquiry handling system that captures missed calls, responds faster, and drives consistent follow-up.";

  const detectedStack = inferStackFromText(audit);

  const scoreCards = [
    {
      title: "Response Speed",
      score: responseSpeedScore,
      description: "How quickly and clearly a prospect can get a response.",
    },
    {
      title: "Enquiry Path",
      score: enquiryPathScore,
      description: "How easy it is for someone to contact you and move forward.",
    },
    {
      title: "Trust Signals",
      score: trustScore,
      description: "How much confidence your site and messaging build with buyers.",
    },
    {
      title: "Conversion Readiness",
      score: conversionScore,
      description:
        "How well your current setup turns enquiries into real conversations.",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 30%), linear-gradient(180deg, #020617 0%, #0f172a 100%)",
        color: "#e2e8f0",
        padding: "40px 20px 80px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#38bdf8",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Scaptra Audit Report
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(32px, 6vw, 56px)",
                lineHeight: 1.05,
                color: "#f8fafc",
              }}
            >
              {businessName}
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                color: "#94a3b8",
                fontSize: 16,
                maxWidth: 760,
              }}
            >
              This report highlights where enquiries are likely slipping through
              the cracks, how your current engagement stack appears to operate,
              and where the fastest gains can be made.
            </p>
          </div>

          <div
            style={{
              border: "1px solid rgba(148,163,184,0.2)",
              background: "rgba(15,23,42,0.8)",
              borderRadius: 20,
              padding: 18,
              minWidth: 250,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
              Audit reference
            </div>
            <div
              style={{
                color: "#f8fafc",
                fontWeight: 600,
                wordBreak: "break-word",
              }}
            >
              {websiteUrl}
            </div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 10 }}>
              Generated {formatDate(audit.created_at)}
            </div>
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              border: "1px solid rgba(148,163,184,0.14)",
              borderRadius: 28,
              padding: 28,
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.14) 0%, rgba(15,23,42,0.94) 55%, rgba(2,6,23,0.98) 100%)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                color: "#38bdf8",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              Executive Summary
            </div>

            <h2
              style={{
                margin: "0 0 12px",
                color: "#f8fafc",
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              {audit.executive_summary || getScoreMessage(overallScore)}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#cbd5e1",
                fontSize: 16,
                lineHeight: 1.7,
                maxWidth: 700,
              }}
            >
              The biggest issue is rarely lead volume. It is what happens after
              a lead arrives. Missed calls, slow follow-up, weak enquiry
              handling, and unclear next steps quietly reduce conversion before
              anyone notices.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
                marginTop: 24,
              }}
            >
              {[
                { label: "Overall score", value: `${overallScore}/100` },
                {
                  label: "Risk priority",
                  value: getPriorityFromScore(overallScore),
                },
                { label: "Current status", value: getScoreLabel(overallScore) },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(148,163,184,0.14)",
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: "#f8fafc",
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(148,163,184,0.14)",
              borderRadius: 28,
              padding: 28,
              background: "rgba(15,23,42,0.86)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "#38bdf8",
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 16,
                  fontWeight: 700,
                }}
              >
                Lead Handling Score
              </div>

              <div
                style={{
                  width: 190,
                  height: 190,
                  borderRadius: "50%",
                  margin: "0 auto 18px",
                  display: "grid",
                  placeItems: "center",
                  ...scoreRingStyle(overallScore),
                }}
              >
                <div
                  style={{
                    width: 146,
                    height: 146,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "#020617",
                    border: "1px solid rgba(148,163,184,0.18)",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        color: "#f8fafc",
                        fontSize: 44,
                        fontWeight: 800,
                      }}
                    >
                      {overallScore}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 14 }}>/ 100</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#f8fafc",
                  marginBottom: 8,
                }}
              >
                {getScoreLabel(overallScore)}
              </div>
              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  fontSize: 15,
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                This score reflects how well your business appears to capture,
                respond to, and convert incoming enquiries.
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
            marginBottom: 24,
          }}
        >
          {scoreCards.map((card) => (
            <div
              key={card.title}
              style={{
                borderRadius: 24,
                padding: 22,
                background: "rgba(15,23,42,0.88)",
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{ color: "#94a3b8", fontSize: 14, marginBottom: 12 }}
              >
                {card.title}
              </div>
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: 38,
                  lineHeight: 1,
                  fontWeight: 800,
                  marginBottom: 10,
                }}
              >
                {card.score}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  color: "#cbd5e1",
                  background: "rgba(56,189,248,0.12)",
                  marginBottom: 14,
                }}
              >
                {getScoreLabel(card.score)}
              </div>
              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {card.description}
              </p>
            </div>
          ))}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: 28,
              background: "rgba(15,23,42,0.88)",
              border: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <div
              style={{
                color: "#38bdf8",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              Lead Leakage Summary
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {findings.map((finding, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(148,163,184,0.1)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(239,68,68,0.15)",
                      color: "#fca5a5",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </div>
                  <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.65 }}>
                    {finding}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderRadius: 28,
              padding: 28,
              background: "rgba(15,23,42,0.88)",
              border: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <div
              style={{
                color: "#38bdf8",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              Engagement Flow Map
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {engagementFlow.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(148,163,184,0.1)",
                  }}
                >
                  <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.65 }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: 28,
              background: "rgba(15,23,42,0.88)",
              border: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <div
              style={{
                color: "#38bdf8",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              Current Engagement Stack
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {Object.entries(detectedStack).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(148,163,184,0.1)",
                  }}
                >
                  <div
                    style={{
                      color: "#cbd5e1",
                      fontSize: 14,
                      textTransform: "capitalize",
                    }}
                  >
                    {key.replace(/_/g, " ")}
                  </div>
                  <div
                    style={{
                      color: "#f8fafc",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "rgba(56,189,248,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderRadius: 28,
              padding: 28,
              background: "rgba(15,23,42,0.88)",
              border: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <div
              style={{
                color: "#38bdf8",
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              Automation Opportunities
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {quickWins.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(148,163,184,0.1)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(34,197,94,0.15)",
                      color: "#86efac",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                  <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.65 }}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid rgba(148,163,184,0.14)",
            borderRadius: 28,
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(15,23,42,0.95) 50%, rgba(2,6,23,0.98) 100%)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              color: "#38bdf8",
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            Recommended Next Step
          </div>

          <h2
            style={{
              margin: "0 0 12px",
              color: "#f8fafc",
              fontSize: 28,
              lineHeight: 1.2,
            }}
          >
            Stop the revenue leak before you spend another dollar on more leads.
          </h2>

          <p
            style={{
              margin: "0 0 22px",
              color: "#cbd5e1",
              fontSize: 16,
              lineHeight: 1.7,
              maxWidth: 900,
            }}
          >
            {nextStep}
          </p>

          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/book"
              style={{
                textDecoration: "none",
                padding: "14px 22px",
                borderRadius: 14,
                background: "#38bdf8",
                color: "#0f172a",
                fontWeight: 800,
              }}
            >
              Book a strategy call
            </Link>

            <Link
              href="/"
              style={{
                textDecoration: "none",
                padding: "14px 22px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(148,163,184,0.18)",
                color: "#e2e8f0",
                fontWeight: 700,
              }}
            >
              Run another audit
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
