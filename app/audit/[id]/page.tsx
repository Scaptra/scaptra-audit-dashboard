import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type OpportunityItem =
  | string
  | {
      title?: string;
      description?: string;
      impact?: string;
    };

function getDisplayScore(report: any) {
  if (typeof report.total_score === "number") return report.total_score;
  return 62;
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Improvement";
  return "High Risk";
}

function getFriendlySummary(report: any) {
  if (report.lead_leakage_summary) return report.lead_leakage_summary;

  return "We found a few areas where potential customers may not be taking the next step. In most cases, that means people are interested but the path to contact or follow-up is not clear enough.";
}

function normaliseOpportunities(
  matrix: Record<string, OpportunityItem> | null | undefined
) {
  if (!matrix || typeof matrix !== "object") return [];

  return Object.values(matrix)
    .map((item) => {
      if (typeof item === "string") {
        return {
          title: "Improvement Opportunity",
          description: item,
          impact: "",
        };
      }

      return {
        title: item.title || "Improvement Opportunity",
        description: item.description || "",
        impact: item.impact || "",
      };
    })
    .filter((item) => item.title || item.description || item.impact);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatWebsite(value: string | null | undefined) {
  if (!value) return "Website not available";
  return value.replace(/^https?:\/\//i, "");
}

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reportId } = await params;

  const { data: report, error } = await supabase
    .from("audit_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !report) {
    return (
      <main style={styles.center}>
        <h1 style={styles.title}>Report not found</h1>
        <p style={styles.sub}>
          This audit may still be processing, or the link may be incorrect.
        </p>
      </main>
    );
  }

  let submission: any = null;
  let business: any = null;

  if (report.submission_id) {
    const { data: submissionData } = await supabase
      .from("audit_submissions")
      .select("*")
      .eq("id", report.submission_id)
      .single();

    submission = submissionData ?? null;

    if (submission?.business_id) {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", submission.business_id)
        .single();

      business = businessData ?? null;
    }
  }

  const businessName =
    business?.business_name ||
    report.business_name ||
    "Business Name Unavailable";

  const website =
    business?.website ||
    report.website ||
    "Website not available";

  const score = getDisplayScore(report);
  const scoreLabel = getScoreLabel(score);
  const opportunities = normaliseOpportunities(
    report.automation_opportunity_matrix
  );

  return (
    <main style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div>
              <div style={styles.eyebrow}>Scaptra Audit Report</div>
              <h1 style={styles.heading}>
                Lead Leakage Audit for{" "}
                <span style={{ color: "#38bdf8" }}>{businessName}</span>
              </h1>
              <p style={styles.sub}>
                This report shows where potential customers may be dropping off,
                and what to improve first.
              </p>
            </div>

            <div style={styles.referenceCard}>
              <div style={styles.referenceLabel}>Report reference</div>
              <div style={styles.referenceValue}>{report.id}</div>

              <div style={{ ...styles.referenceLabel, marginTop: 14 }}>
                Website reviewed
              </div>
              <div style={styles.referenceValue}>{formatWebsite(website)}</div>

              <div style={{ ...styles.referenceLabel, marginTop: 14 }}>
                Generated
              </div>
              <div style={styles.referenceValue}>
                {formatDate(report.created_at)}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Overall Score</h2>
          <div style={styles.score}>{score} / 100</div>
          <p style={styles.textMuted}>
            {scoreLabel} — this score reflects how clearly your website guides
            people to contact you, and how well your current setup appears to
            support follow-up.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Where enquiries may be slipping through</h2>

          <p style={styles.text}>
            Our review found a few areas where potential customers may not be
            taking the next step.
          </p>

          <p style={styles.text}>{getFriendlySummary(report)}</p>

          <p style={styles.text}>
            These kinds of gaps often mean people are interested, but they do
            not contact you because the next step is not clear or immediate.
          </p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Practical improvements to consider</h2>

          {opportunities.length > 0 ? (
            <ul style={styles.list}>
              {opportunities.map((item, i) => (
                <li key={i} style={styles.listItem}>
                  <strong>{item.title}</strong>
                  {item.description ? (
                    <>
                      <br />
                      <span style={styles.listText}>{item.description}</span>
                    </>
                  ) : null}
                  {item.impact ? (
                    <>
                      <br />
                      <span style={styles.impactText}>
                        Why this matters: {item.impact}
                      </span>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.text}>
              There are opportunities to improve how enquiries are captured and
              followed up, even if more advanced automation is added later.
            </p>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Recommended next step</h2>

          <p style={styles.text}>
            A simple way to improve results is to focus first on what happens
            after someone shows interest.
          </p>

          <p style={styles.text}>
            Make sure every enquiry has a clear owner, receives a quick response,
            and is followed up consistently.
          </p>

          <p style={styles.text}>
            Once that foundation is in place, automation can be added to improve
            speed and consistency without increasing workload.
          </p>

          {report.implementation_blueprint ? (
            <p style={styles.textMuted}>{report.implementation_blueprint}</p>
          ) : null}
        </div>

        <div style={styles.cta}>
          <h2 style={styles.ctaTitle}>
            You’re already getting interest — the issue is what happens next.
          </h2>

          <p style={styles.ctaText}>
            Most businesses don’t realise how many potential customers they lose
            through missed calls, slow responses, or unclear next steps.
          </p>

          <p style={styles.ctaText}>
            A short call will walk through the findings and show you how to fix
            these gaps quickly.
          </p>

          <a
            href="https://api.leadconnectorhq.com/widget/booking/a9PnMq5n6AtbQvx4YDVN"
            target="_blank"
            rel="noreferrer"
            style={styles.button}
          >
            Review My Audit With You
          </a>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#020617",
    color: "#fff",
    padding: "40px 20px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  wrapper: {
    maxWidth: "980px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "30px",
  },
  headerTop: {
    display: "grid",
    gridTemplateColumns: "1.4fr 0.9fr",
    gap: "20px",
    alignItems: "start",
  },
  eyebrow: {
    color: "#38bdf8",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  heading: {
    fontSize: "36px",
    fontWeight: 800,
    lineHeight: 1.15,
    margin: 0,
  },
  sub: {
    color: "#94a3b8",
    marginTop: "10px",
    fontSize: "18px",
    lineHeight: 1.6,
  },
  referenceCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    padding: "18px",
  },
  referenceLabel: {
    color: "#94a3b8",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  referenceValue: {
    color: "#f8fafc",
    fontSize: "15px",
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "28px",
    marginBottom: "14px",
    color: "#f8fafc",
  },
  text: {
    color: "#cbd5e1",
    lineHeight: 1.7,
    fontSize: "18px",
    margin: "0 0 14px",
  },
  textMuted: {
    color: "#94a3b8",
    lineHeight: 1.7,
    fontSize: "16px",
    marginTop: "12px",
  },
  list: {
    paddingLeft: "20px",
    margin: 0,
  },
  listItem: {
    marginBottom: "18px",
    color: "#f8fafc",
    lineHeight: 1.6,
    fontSize: "18px",
  },
  listText: {
    color: "#cbd5e1",
  },
  impactText: {
    color: "#94a3b8",
    fontSize: "16px",
  },
  score: {
    fontSize: "52px",
    fontWeight: 800,
    color: "#38bdf8",
    lineHeight: 1.1,
  },
  cta: {
    marginTop: "30px",
    padding: "30px",
    background: "#020617",
    border: "1px solid #38bdf8",
    borderRadius: "20px",
    textAlign: "center",
  },
  ctaTitle: {
    fontSize: "28px",
    marginBottom: "14px",
    color: "#f8fafc",
    lineHeight: 1.3,
  },
  ctaText: {
    color: "#94a3b8",
    marginBottom: "16px",
    fontSize: "18px",
    lineHeight: 1.7,
  },
  button: {
    display: "inline-block",
    padding: "14px 24px",
    background: "#38bdf8",
    color: "#020617",
    fontWeight: 700,
    borderRadius: "10px",
    textDecoration: "none",
    fontSize: "18px",
    marginTop: "8px",
  },
  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "#020617",
    color: "#fff",
    padding: "20px",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    marginBottom: "10px",
  },
};