import { createClient } from "@supabase/supabase-js";

type AuditSubmission = {
  id: string;
  business_id: string;
  status: string | null;
  created_at?: string | null;
};

type Business = {
  id: string;
  business_name: string | null;
  website: string | null;
};

type AuditEvent = {
  id: string;
  audit_id: string;
  event_type: string;
  event_value: string | null;
  created_at: string;
};

type DashboardRow = {
  auditId: string;
  businessName: string;
  website: string;
  status: string;
  requestedAt: string | null;
  lastActivity: string | null;
  viewed: boolean;
  clicked: boolean;
  lastCta: string | null;
  score: number;
  temperature: "Cold" | "Warm" | "Hot";
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(status: string | null) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getTemperature(score: number): "Cold" | "Warm" | "Hot" {
  if (score >= 7) return "Hot";
  if (score >= 2) return "Warm";
  return "Cold";
}

function getTemperatureStyles(temp: "Cold" | "Warm" | "Hot") {
  if (temp === "Hot") {
    return {
      color: "#22c55e",
      border: "1px solid rgba(34,197,94,0.35)",
      background: "rgba(20,83,45,0.25)",
    };
  }

  if (temp === "Warm") {
    return {
      color: "#38bdf8",
      border: "1px solid rgba(56,189,248,0.35)",
      background: "rgba(8,47,73,0.28)",
    };
  }

  return {
    color: "#94a3b8",
    border: "1px solid rgba(100,116,139,0.35)",
    background: "rgba(15,23,42,0.55)",
  };
}

async function getDashboardRows(): Promise<DashboardRow[]> {
  const { data: submissions, error: submissionsError } = await supabase
    .from("audit_submissions")
    .select("id, business_id, status, created_at")
    .order("created_at", { ascending: false });

  if (submissionsError) {
    throw new Error(`Failed to load audit submissions: ${submissionsError.message}`);
  }

  const submissionList = (submissions || []) as AuditSubmission[];

  const businessIds = Array.from(
    new Set(submissionList.map((s) => s.business_id).filter(Boolean))
  );

  const auditIds = submissionList.map((s) => s.id);

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, business_name, website")
    .in("id", businessIds);

  if (businessesError) {
    throw new Error(`Failed to load businesses: ${businessesError.message}`);
  }

  const { data: events, error: eventsError } = await supabase
    .from("audit_events")
    .select("id, audit_id, event_type, event_value, created_at")
    .in("audit_id", auditIds)
    .order("created_at", { ascending: false });

  if (eventsError) {
    throw new Error(`Failed to load audit events: ${eventsError.message}`);
  }

  const businessMap = new Map<string, Business>();
  for (const business of (businesses || []) as Business[]) {
    businessMap.set(business.id, business);
  }

  const eventsByAuditId = new Map<string, AuditEvent[]>();
  for (const event of (events || []) as AuditEvent[]) {
    const existing = eventsByAuditId.get(event.audit_id) || [];
    existing.push(event);
    eventsByAuditId.set(event.audit_id, existing);
  }

  const rows: DashboardRow[] = submissionList.map((submission) => {
    const business = businessMap.get(submission.business_id);
    const auditEvents = eventsByAuditId.get(submission.id) || [];

    const viewed = auditEvents.some((e) => e.event_type === "report_viewed");
    const ctaEvents = auditEvents.filter((e) => e.event_type === "cta_clicked");
    const clicked = ctaEvents.length > 0;

    const lastActivity =
      auditEvents.length > 0
        ? auditEvents
            .map((e) => e.created_at)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : submission.created_at || null;

    const lastCta =
      ctaEvents.length > 0
        ? ctaEvents
            .map((e) => e.created_at)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map(
              (date) =>
                ctaEvents.find((e) => e.created_at === date)?.event_value || null
            )[0]
        : null;

    let score = 0;
    if (viewed) score += 2;
    if (clicked) score += 5;

    return {
      auditId: submission.id,
      businessName: business?.business_name || "Unknown Business",
      website: business?.website || "—",
      status: formatStatus(submission.status),
      requestedAt: submission.created_at || null,
      lastActivity,
      viewed,
      clicked,
      lastCta,
      score,
      temperature: getTemperature(score),
    };
  });

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.lastActivity || 0).getTime() -
      new Date(a.lastActivity || 0).getTime()
    );
  });

  return rows;
}

export default async function DashboardPage() {
  const rows = await getDashboardRows();

  const totalAudits = rows.length;
  const hotLeads = rows.filter((r) => r.temperature === "Hot").length;
  const warmLeads = rows.filter((r) => r.temperature === "Warm").length;
  const reportsViewed = rows.filter((r) => r.viewed).length;
  const ctaClicks = rows.filter((r) => r.clicked).length;

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
        }}
      >
        <div style={{ marginBottom: "24px" }}>
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
            Scaptra Dashboard
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "40px",
              lineHeight: 1.05,
              color: "#f8fafc",
            }}
          >
            Hot Leads Dashboard
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#94a3b8",
              fontSize: "16px",
              lineHeight: 1.6,
              maxWidth: "780px",
            }}
          >
            View which audits were opened, which calls to action were clicked,
            and which businesses are warm enough to follow up now.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[
            { label: "Total Audits", value: totalAudits },
            { label: "Reports Viewed", value: reportsViewed },
            { label: "CTA Clicks", value: ctaClicks },
            { label: "Hot Leads", value: hotLeads },
            { label: "Warm Leads", value: warmLeads },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: "1px solid #1f2937",
                borderRadius: "18px",
                padding: "18px",
                background: "rgba(15,23,42,0.78)",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "10px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: "34px",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "24px",
            background:
              "linear-gradient(180deg, rgba(17,24,39,0.96) 0%, rgba(3,7,18,0.96) 100%)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 22px",
              borderBottom: "1px solid #1f2937",
              color: "#cbd5e1",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            Lead Activity
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1100px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "rgba(15,23,42,0.7)",
                    color: "#94a3b8",
                    fontSize: "13px",
                    textAlign: "left",
                  }}
                >
                  {[
                    "Business",
                    "Website",
                    "Status",
                    "Viewed",
                    "CTA Clicked",
                    "Last CTA",
                    "Score",
                    "Temperature",
                    "Requested",
                    "Last Activity",
                    "Audit",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid #1f2937",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const tempStyles = getTemperatureStyles(row.temperature);

                  return (
                    <tr key={row.auditId} style={{ borderBottom: "1px solid #111827" }}>
                      <td
                        style={{
                          padding: "16px 18px",
                          color: "#f8fafc",
                          fontWeight: 700,
                          verticalAlign: "top",
                        }}
                      >
                        {row.businessName}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          verticalAlign: "top",
                        }}
                      >
                        {row.website !== "—" ? (
                          <a
                            href={row.website}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "#38bdf8",
                              textDecoration: "none",
                              wordBreak: "break-word",
                            }}
                          >
                            {row.website}
                          </a>
                        ) : (
                          <span style={{ color: "#64748b" }}>—</span>
                        )}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          color: "#cbd5e1",
                          verticalAlign: "top",
                        }}
                      >
                        {row.status}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          color: row.viewed ? "#22c55e" : "#64748b",
                          fontWeight: 700,
                          verticalAlign: "top",
                        }}
                      >
                        {row.viewed ? "Yes" : "No"}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          color: row.clicked ? "#22c55e" : "#64748b",
                          fontWeight: 700,
                          verticalAlign: "top",
                        }}
                      >
                        {row.clicked ? "Yes" : "No"}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          color: row.lastCta ? "#cbd5e1" : "#64748b",
                          verticalAlign: "top",
                        }}
                      >
                        {row.lastCta || "—"}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          color: "#f8fafc",
                          fontWeight: 800,
                          verticalAlign: "top",
                        }}
                      >
                        {row.score}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          verticalAlign: "top",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "999px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 800,
                            ...tempStyles,
                          }}
                        >
                          {row.temperature}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          color: "#cbd5e1",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(row.requestedAt)}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          color: "#cbd5e1",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(row.lastActivity)}
                      </td>

                      <td
                        style={{
                          padding: "16px 18px",
                          verticalAlign: "top",
                        }}
                      >
                        <a
                          href={`/audit/${row.auditId}`}
                          style={{
                            color: "#38bdf8",
                            textDecoration: "none",
                            fontWeight: 700,
                          }}
                        >
                          View Report
                        </a>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      style={{
                        padding: "28px 18px",
                        color: "#64748b",
                        textAlign: "center",
                      }}
                    >
                      No audit activity found yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}