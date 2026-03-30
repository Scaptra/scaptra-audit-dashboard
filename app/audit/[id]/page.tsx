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

function getScoreLabel(score: number, isProtected: boolean) {
  if (isProtected) return "Limited Scan";
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Improvement";
  return "High Risk";
}

function getScoreMessage(score: number, isProtected: boolean) {
  if (isProtected) {
    return "This website appears to be protected by bot-verification or anti-automation controls, so only a limited audit could be completed.";
  }

  if (score >= 85) {
    return "Your site shows solid enquiry-handling foundations, but there is still room to tighten response speed and follow-up.";
  }
  if (score >= 70) {
    return "Your site is doing some things well, but there are clear gaps that could still cost you real enquiries.";
  }
  if (score >= 50) {
    return "There are meaningful gaps in how your website captures and converts interest into enquiries.";
  }
  return "Your site is at high risk of losing enquiries because the next step is unclear, inconsistent, or too easy to miss.";
}

function getPriorityLabel(score: number, isProtected: boolean) {
  if (isProtected) return "Manual Review";
  if (score >= 85) return "Optimise";
  if (score >= 70) return "Improve";
  if (score >= 50) return "Fix Soon";
  return "Fix Now";
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

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getRevenueLeak(scoreRow: any) {
  const leak = scoreRow?.scoring_notes?.revenue_leak_estimate;
  if (!leak || typeof leak !== "object") return null;
  return leak;
}

function getTopIssues(report: any, scoreRow: any, isProtected: boolean) {
  if (isProtected) {
    return [
      "Full automated scan was limited by site protection or verification controls",
      "The real visitor journey could not be reviewed beyond the protection layer",
      "Contact paths, forms, and booking prompts should be checked manually",
      "Follow-up handling after an enquiry is made should be reviewed directly",
    ];
  }

  const issues: string[] = [];

  const notes = scoreRow?.scoring_notes?.audit_summary;
  if (notes) {
    if ((notes.pages_with_no_forms ?? 0) > 0) {
      issues.push(
        `${notes.pages_with_no_forms} page(s) do not show a visible enquiry form`
      );
    }
    if ((notes.pages_with_no_buttons ?? 0) > 0) {
      issues.push(
        `${notes.pages_with_no_buttons} page(s) have weak or missing action prompts`
      );
    }
    if ((notes.pages_with_no_h1 ?? 0) > 0) {
      issues.push(
        `${notes.pages_with_no_h1} page(s) lack a clear main heading`
      );
    }
    if ((notes.missing_titles ?? 0) > 0) {
      issues.push(`${notes.missing_titles} page(s) are missing title tags`);
    }
    if ((notes.missing_meta_descriptions ?? 0) > 0) {
      issues.push(
        `${notes.missing_meta_descriptions} page(s) are missing meta descriptions`
      );
    }
  }

  if (issues.length === 0 && report?.lead_leakage_summary) {
    issues.push(report.lead_leakage_summary);
  }

  return issues.slice(0, 4);
}

function getScoreBreakdown(scoreRow: any, isProtected: boolean) {
  if (isProtected) {
    return [
      { label: "Lead Capture", value: null, max: 40 },
      { label: "Response Efficiency", value: null, max: 25 },
      { label: "CRM Data", value: null, max: 18 },
      { label: "Automation", value: null, max: 18 },
      { label: "AI Readiness", value: null, max: 17 },
    ];
  }

  return [
    {
      label: "Lead Capture",
      value:
        typeof scoreRow?.lead_capture_score === "number"
          ? scoreRow.lead_capture_score
          : null,
      max: 40,
    },
    {
      label: "Response Efficiency",
      value:
        typeof scoreRow?.response_efficiency_score === "number"
          ? scoreRow.response_efficiency_score
          : null,
      max: 25,
    },
    {
      label: "CRM Data",
      value:
        typeof scoreRow?.crm_data_score === "number"
          ? scoreRow.crm_data_score
          : null,
      max: 18,
    },
    {
      label: "Automation",
      value:
        typeof scoreRow?.automation_score === "number"
          ? scoreRow.automation_score
          : null,
      max: 18,
    },
    {
      label: "AI Readiness",
      value:
        typeof scoreRow?.ai_readiness_score === "number"
          ? scoreRow.ai_readiness_score
          : null,
      max: 17,
    },
  ];
}

function getBarWidth(value: number | null, max: number) {
  if (typeof value !== "number" || max <= 0) return "0%";
  return `${Math.max(0, Math.min(100, Math.round((value / max) * 100)))}%`;
}

function isProtectedScan(scoreRow: any) {
  return scoreRow?.scoring_notes?.limited_scan === true;
}

function getProtectedProvider(scoreRow: any) {
  const provider = scoreRow?.scoring_notes?.protection_provider;
  return typeof provider === "string" && provider.trim()
    ? provider
    : "website protection";
}

function getRevenueMeaningText(params: {
  isProtected: boolean;
  businessName: string;
  missedLeadsLow: number | null;
  missedLeadsHigh: number | null;
}) {
  const { isProtected, businessName, missedLeadsLow, missedLeadsHigh } = params;

  if (isProtected) {
    return `${businessName} is harder to assess from the public site alone because automated scanning was limited. That does not remove the risk — it means the next step should be a manual review of the real enquiry journey and what happens after someone reaches out.`;
  }

  if (
    typeof missedLeadsLow === "number" &&
    typeof missedLeadsHigh === "number"
  ) {
    return `If even part of this estimated range is accurate, the issue is no longer just website quality. It is a commercial handling problem that can quietly cost enquiries, appointments, and revenue every month.`;
  }

  return `Even without a precise estimate, the signs point to friction in the path from interest to enquiry. That usually means some opportunities are being lost before a real conversation ever starts.`;
}

function getFixItems(isProtected: boolean) {
  if (isProtected) {
    return [
      "Manually review the real visitor journey after the protection layer",
      "Check how quickly calls, forms, and missed enquiries are handled",
      "Tighten ownership so every enquiry has a clear next action",
      "Add follow-up systems so interest does not go cold",
    ];
  }

  return [
    "Capture missed calls and website enquiries automatically",
    "Respond instantly instead of relying on delayed manual follow-up",
    "Follow up leads consistently until they convert or clearly opt out",
    "Make sure every real opportunity is seen, tracked, and handled",
  ];
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
  let scoreRow: any = null;

  if (report.submission_id) {
    const { data: submissionData } = await supabase
      .from("audit_submissions")
      .select("*")
      .eq("id", report.submission_id)
      .single();

    submission = submissionData ?? null;

    const { data: scoreData } = await supabase
      .from("audit_scores")
      .select("*")
      .eq("submission_id", report.submission_id)
      .single();

    scoreRow = scoreData ?? null;

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

  const website = business?.website || report.website || "Website not available";

  const isProtected = isProtectedScan(scoreRow);
  const protectionProvider = getProtectedProvider(scoreRow);

  const score =
    typeof scoreRow?.total_score === "number"
      ? scoreRow.total_score
      : typeof report.total_score === "number"
      ? report.total_score
      : isProtected
      ? 40
      : 62;

  const scoreLabel = getScoreLabel(score, isProtected);
  const scoreMessage = getScoreMessage(score, isProtected);
  const priorityLabel = getPriorityLabel(score, isProtected);
  const opportunities = normaliseOpportunities(
    report.automation_opportunity_matrix
  );
  const topIssues = getTopIssues(report, scoreRow, isProtected);
  const revenueLeak = getRevenueLeak(scoreRow);
  const scoreBreakdown = getScoreBreakdown(scoreRow, isProtected);

  const missedLeadsLow =
    typeof revenueLeak?.missedLeadsLow === "number"
      ? revenueLeak.missedLeadsLow
      : null;
  const missedLeadsHigh =
    typeof revenueLeak?.missedLeadsHigh === "number"
      ? revenueLeak.missedLeadsHigh
      : null;

  const revenueLow = formatCurrency(revenueLeak?.estimatedRevenueLow);
  const revenueHigh = formatCurrency(revenueLeak?.estimatedRevenueHigh);

  const showEstimatedImpact =
    !isProtected &&
    (missedLeadsLow !== null ||
      missedLeadsHigh !== null ||
      revenueLow ||
      revenueHigh);

  const fixItems = getFixItems(isProtected);
  const revenueMeaningText = getRevenueMeaningText({
    isProtected,
    businessName,
    missedLeadsLow,
    missedLeadsHigh,
  });

  return (
    <main style={styles.container}>
      <div style={styles.wrapper}>
        <section style={styles.hero}>
          <div style={styles.heroLeft}>
            <div style={styles.eyebrow}>Scaptra Audit Report</div>
            <h1 style={styles.heading}>
              {businessName} may be losing enquiries before they ever become real
              conversations.
            </h1>
            <p style={styles.heroText}>
              This report shows where friction, weak contact paths, and slower
              response readiness may be costing you leads.
            </p>

            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Website reviewed</div>
                <div style={styles.infoValue}>{formatWebsite(website)}</div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Generated</div>
                <div style={styles.infoValue}>
                  {formatDate(report.created_at)}
                </div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Priority</div>
                <div style={styles.infoValue}>{priorityLabel}</div>
              </div>

              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Report reference</div>
                <div style={styles.infoValue}>{report.id}</div>
              </div>
            </div>
          </div>

          <div style={styles.scoreCard}>
            <div style={styles.scoreLabel}>Overall Score</div>
            <div style={styles.score}>{score} / 100</div>
            <div style={styles.scorePill}>{scoreLabel}</div>
            {isProtected ? (
              <div style={styles.protectedBadge}>
                Limited scan due to {protectionProvider}
              </div>
            ) : null}
            <p style={styles.scoreText}>{scoreMessage}</p>
          </div>
        </section>

        <section style={styles.impactCard}>
          <div style={styles.impactEyebrow}>
            {isProtected
              ? "Limited commercial estimate"
              : "Estimated commercial impact"}
          </div>
          <h2 style={styles.sectionTitle}>
            The issue is not just website quality. It is lost opportunity.
          </h2>

          {isProtected ? (
            <>
              <p style={styles.text}>
                This website uses security protections that limit automated
                scanning. As a result, lead-loss and revenue-at-risk estimates
                cannot be calculated reliably from the public site alone.
              </p>

              <div style={styles.impactGrid}>
                <div style={styles.impactBox}>
                  <div style={styles.impactValueMuted}>Not estimated</div>
                  <div style={styles.impactLabel}>Missed leads range</div>
                </div>

                <div style={styles.impactBox}>
                  <div style={styles.impactValueMuted}>Manual review required</div>
                  <div style={styles.impactLabel}>Revenue at risk</div>
                </div>
              </div>

              <p style={styles.textMuted}>
                The public site presented {protectionProvider} or similar
                verification before the main content became available. The next
                step is a browser-based manual review of the real enquiry journey.
              </p>
            </>
          ) : (
            <>
              <p style={styles.text}>
                Based on the gaps detected, this site may be allowing potential
                enquiries to drift away before they call, book, or submit a form.
              </p>

              <div style={styles.impactGrid}>
                <div style={styles.impactBox}>
                  <div style={styles.impactValue}>
                    {showEstimatedImpact &&
                    missedLeadsLow !== null &&
                    missedLeadsHigh !== null
                      ? `${missedLeadsLow}–${missedLeadsHigh}`
                      : "—"}
                  </div>
                  <div style={styles.impactLabel}>
                    Estimated missed leads range
                  </div>
                </div>

                <div style={styles.impactBox}>
                  <div style={styles.impactValue}>
                    {showEstimatedImpact && revenueLow && revenueHigh
                      ? `${revenueLow}–${revenueHigh}`
                      : "—"}
                  </div>
                  <div style={styles.impactLabel}>
                    Estimated revenue at risk
                  </div>
                </div>
              </div>

              <p style={styles.textMuted}>
                This is an estimate based on visible lead-capture, response, and
                conversion gaps across the scanned pages. It is directional, but
                it gives a useful view of what weak handling may be costing.
              </p>
            </>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>What this means for your business</h2>
          <p style={styles.text}>{revenueMeaningText}</p>
          {!isProtected ? (
            <p style={styles.text}>
              Most businesses do not need more leads first. They need tighter
              handling of the leads already reaching them.
            </p>
          ) : (
            <p style={styles.text}>
              Protected sites still lose enquiries when response ownership is
              weak, follow-up is slow, or no one checks what happens after the
              first contact.
            </p>
          )}
        </section>

        <section style={styles.twoCol}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>What this score means</h2>
            {isProtected ? (
              <>
                <p style={styles.text}>
                  A limited score does not mean the business has no issue. It
                  means the public site could not be fully scanned because a
                  protection layer blocked automated access.
                </p>
                <p style={styles.text}>
                  In practice, the right next step is to manually review the real
                  visitor journey after the verification page and then inspect
                  what happens after enquiries are made.
                </p>
              </>
            ) : (
              <>
                <p style={styles.text}>
                  A low score does not mean the business is weak. It usually
                  means there is demand coming in, but the path from interest to
                  action is not as clear, fast, or consistent as it should be.
                </p>
                <p style={styles.text}>
                  In practice, that means people may visit, look around, and
                  even want to make contact, but still leave because the next
                  step feels unclear or delayed.
                </p>
              </>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Where the biggest risk sits</h2>
            {topIssues.length > 0 ? (
              <ul style={styles.list}>
                {topIssues.map((issue, index) => (
                  <li key={index} style={styles.listItemCompact}>
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={styles.text}>
                The biggest risk appears to be general inconsistency in how the
                site guides visitors toward contact and follow-up.
              </p>
            )}
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Lead leakage summary</h2>
          <p style={styles.text}>{getFriendlySummary(report)}</p>
          {isProtected ? (
            <p style={styles.text}>
              Because the protection layer blocked a full content review, this
              result should be read as a constrained audit. The real risk may
              sit in the actual post-verification visitor journey and in how the
              business handles new enquiries once they arrive.
            </p>
          ) : (
            <p style={styles.text}>
              These issues rarely look dramatic from the inside of a business,
              but they quietly reduce conversion because interested people do
              not always take the next step when response paths are weak or
              unclear.
            </p>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Score breakdown</h2>

          <div style={styles.breakdownWrap}>
            {scoreBreakdown.map((item) => (
              <div key={item.label} style={styles.breakdownRow}>
                <div style={styles.breakdownHeader}>
                  <span style={styles.breakdownLabel}>{item.label}</span>
                  <span style={styles.breakdownValue}>
                    {isProtected
                      ? "Limited visibility"
                      : typeof item.value === "number"
                      ? `${item.value} / ${item.max}`
                      : "—"}
                  </span>
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: isProtected
                        ? "35%"
                        : getBarWidth(item.value, item.max),
                      opacity: isProtected ? 0.45 : 1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {isProtected ? (
            <p style={styles.textMutedWithTop}>
              These categories are shown as limited visibility because the
              normal page content could not be scanned reliably after the
              protection layer.
            </p>
          ) : null}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>How this gets fixed</h2>
          <p style={styles.text}>
            The goal is not to add more complexity. It is to make sure every
            real opportunity is seen, responded to quickly, and followed up
            consistently.
          </p>

          <div style={styles.fixGrid}>
            {fixItems.map((item) => (
              <div key={item} style={styles.fixCard}>
                <div style={styles.fixCheck}>✓</div>
                <div style={styles.fixText}>{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Best improvement opportunities</h2>

          {opportunities.length > 0 ? (
            <div style={styles.opportunityGrid}>
              {opportunities.map((item, i) => (
                <div key={i} style={styles.opportunityCard}>
                  <div style={styles.opportunityTitle}>{item.title}</div>
                  {item.description ? (
                    <p style={styles.opportunityText}>{item.description}</p>
                  ) : null}
                  {item.impact ? (
                    <p style={styles.impactText}>
                      Why this matters: {item.impact}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.text}>
              There are opportunities to improve how enquiries are captured and
              followed up, even before more advanced automation is added.
            </p>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Recommended next step</h2>

          <p style={styles.text}>
            The first move is not “do more marketing.” It is tightening what
            happens after someone shows interest.
          </p>

          <p style={styles.text}>
            Make sure every enquiry has a clear owner, receives a fast first
            response, and is followed up consistently. That alone can lift
            results without increasing traffic.
          </p>

          <p style={styles.text}>
            Once that foundation is in place, automation can improve speed,
            consistency, and accountability without adding more admin work.
          </p>

          {report.implementation_blueprint ? (
            <div style={styles.blueprintBox}>
              <div style={styles.blueprintLabel}>Implementation direction</div>
              <p style={styles.blueprintText}>{report.implementation_blueprint}</p>
            </div>
          ) : null}
        </section>

        <section style={styles.cta}>
          <div style={styles.ctaEyebrow}>Next step</div>
          <h2 style={styles.ctaTitle}>
            Want to see how to fix this in your business?
          </h2>

          <p style={styles.ctaText}>
            Book a short review call and we’ll walk through the findings, show
            where enquiries may be leaking, and map out the fastest path to
            tightening your response and follow-up.
          </p>

          <p style={styles.ctaTextStrong}>
            Most businesses lose 20–40% of enquiries because responses are
            missed, delayed, or inconsistent.
          </p>

          <a
            href="https://api.leadconnectorhq.com/widget/booking/a9PnMq5n6AtbQvx4YDVN"
            target="_blank"
            rel="noreferrer"
            style={styles.button}
          >
            Book a Free 15-Minute Fix Call
          </a>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#020617",
    color: "#fff",
    padding: "40px 20px 56px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "1.35fr 0.8fr",
    gap: "24px",
    alignItems: "stretch",
    marginBottom: "24px",
  },
  heroLeft: {
    background:
      "linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.95) 100%)",
    border: "1px solid #1e293b",
    borderRadius: "24px",
    padding: "28px",
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
    fontSize: "42px",
    fontWeight: 800,
    lineHeight: 1.08,
    margin: 0,
    color: "#f8fafc",
  },
  heroText: {
    color: "#cbd5e1",
    marginTop: "16px",
    fontSize: "19px",
    lineHeight: 1.7,
    marginBottom: "22px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  infoCard: {
    background: "rgba(2,6,23,0.55)",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    padding: "16px",
  },
  infoLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "8px",
  },
  infoValue: {
    color: "#f8fafc",
    fontSize: "15px",
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  scoreCard: {
    background:
      "linear-gradient(180deg, rgba(56,189,248,0.12) 0%, rgba(15,23,42,0.95) 100%)",
    border: "1px solid rgba(56,189,248,0.35)",
    borderRadius: "24px",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  scoreLabel: {
    color: "#bae6fd",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "10px",
  },
  score: {
    fontSize: "64px",
    fontWeight: 800,
    color: "#38bdf8",
    lineHeight: 1,
    marginBottom: "14px",
  },
  scorePill: {
    display: "inline-block",
    alignSelf: "flex-start",
    background: "rgba(56,189,248,0.15)",
    border: "1px solid rgba(56,189,248,0.35)",
    color: "#e0f2fe",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  protectedBadge: {
    display: "inline-block",
    alignSelf: "flex-start",
    background: "rgba(251,191,36,0.12)",
    border: "1px solid rgba(251,191,36,0.35)",
    color: "#fde68a",
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "16px",
  },
  scoreText: {
    color: "#cbd5e1",
    fontSize: "17px",
    lineHeight: 1.7,
    margin: 0,
  },
  impactCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "24px",
  },
  impactEyebrow: {
    color: "#38bdf8",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  sectionTitle: {
    fontSize: "30px",
    margin: "0 0 14px",
    color: "#f8fafc",
    lineHeight: 1.2,
  },
  impactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    marginTop: "18px",
    marginBottom: "18px",
  },
  impactBox: {
    background: "rgba(2,6,23,0.55)",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "20px",
  },
  impactValue: {
    fontSize: "34px",
    fontWeight: 800,
    color: "#38bdf8",
    lineHeight: 1.15,
    marginBottom: "8px",
  },
  impactValueMuted: {
    fontSize: "26px",
    fontWeight: 800,
    color: "#f8fafc",
    lineHeight: 1.2,
    marginBottom: "8px",
  },
  impactLabel: {
    color: "#cbd5e1",
    fontSize: "15px",
    lineHeight: 1.5,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "30px",
    margin: "0 0 14px",
    color: "#f8fafc",
    lineHeight: 1.2,
  },
  text: {
    color: "#cbd5e1",
    lineHeight: 1.75,
    fontSize: "18px",
    margin: "0 0 14px",
  },
  textMuted: {
    color: "#94a3b8",
    lineHeight: 1.7,
    fontSize: "15px",
    marginTop: "6px",
    marginBottom: 0,
  },
  textMutedWithTop: {
    color: "#94a3b8",
    lineHeight: 1.7,
    fontSize: "15px",
    marginTop: "14px",
    marginBottom: 0,
  },
  list: {
    paddingLeft: "22px",
    margin: 0,
  },
  listItemCompact: {
    color: "#f8fafc",
    lineHeight: 1.7,
    fontSize: "17px",
    marginBottom: "12px",
  },
  breakdownWrap: {
    display: "grid",
    gap: "16px",
  },
  breakdownRow: {
    display: "grid",
    gap: "8px",
  },
  breakdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
  },
  breakdownLabel: {
    color: "#f8fafc",
    fontSize: "16px",
    fontWeight: 600,
  },
  breakdownValue: {
    color: "#94a3b8",
    fontSize: "15px",
  },
  barTrack: {
    width: "100%",
    height: "12px",
    background: "#1e293b",
    borderRadius: "999px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)",
  },
  fixGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    marginTop: "10px",
  },
  fixCard: {
    background: "rgba(2,6,23,0.55)",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  fixCheck: {
    color: "#38bdf8",
    fontSize: "20px",
    fontWeight: 800,
    lineHeight: 1.2,
    marginTop: "2px",
  },
  fixText: {
    color: "#cbd5e1",
    fontSize: "16px",
    lineHeight: 1.7,
  },
  opportunityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },
  opportunityCard: {
    background: "rgba(2,6,23,0.55)",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "18px",
  },
  opportunityTitle: {
    color: "#f8fafc",
    fontSize: "20px",
    fontWeight: 700,
    lineHeight: 1.35,
    marginBottom: "10px",
  },
  opportunityText: {
    color: "#cbd5e1",
    fontSize: "16px",
    lineHeight: 1.7,
    margin: "0 0 10px",
  },
  impactText: {
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: 1.65,
    margin: 0,
  },
  blueprintBox: {
    marginTop: "10px",
    background: "rgba(56,189,248,0.08)",
    border: "1px solid rgba(56,189,248,0.22)",
    borderRadius: "16px",
    padding: "16px",
  },
  blueprintLabel: {
    color: "#bae6fd",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "8px",
  },
  blueprintText: {
    color: "#cbd5e1",
    lineHeight: 1.7,
    fontSize: "16px",
    margin: 0,
  },
  cta: {
    marginTop: "30px",
    padding: "32px",
    background:
      "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(15,23,42,0.95) 50%, rgba(2,6,23,0.98) 100%)",
    border: "1px solid #334155",
    borderRadius: "24px",
    textAlign: "center",
    boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
  },
  ctaEyebrow: {
    color: "#38bdf8",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "10px",
    fontWeight: 700,
  },
  ctaTitle: {
    fontSize: "32px",
    marginBottom: "14px",
    color: "#f8fafc",
    lineHeight: 1.25,
    marginTop: 0,
  },
  ctaText: {
    color: "#cbd5e1",
    marginBottom: "16px",
    fontSize: "18px",
    lineHeight: 1.75,
  },
  ctaTextStrong: {
    color: "#f8fafc",
    marginBottom: "18px",
    fontSize: "18px",
    lineHeight: 1.75,
    fontWeight: 700,
  },
  button: {
    display: "inline-block",
    padding: "16px 28px",
    background: "linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)",
    color: "#020617",
    fontWeight: 800,
    borderRadius: "12px",
    textDecoration: "none",
    fontSize: "18px",
    marginTop: "8px",
    boxShadow: "0 12px 30px rgba(56,189,248,0.25)",
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
  sub: {
    color: "#94a3b8",
    marginTop: "10px",
    fontSize: "18px",
    lineHeight: 1.6,
  },
};