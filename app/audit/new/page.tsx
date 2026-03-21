"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function readApiResponse(response: Response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error(rawText || "Unexpected non-JSON response from server.");
  }
}

export default function NewAuditPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const auditResponse = await fetch("/api/run-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName,
          website,
        }),
      });

      const auditData = await readApiResponse(auditResponse);

      if (!auditResponse.ok) {
        throw new Error(auditData.error || "Audit failed");
      }

      const auditId = auditData.auditId;

      const emailResponse = await fetch("/api/send-audit-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: email,
          businessName,
          website,
          auditId,
        }),
      });

      const emailData = await readApiResponse(emailResponse);

      if (!emailResponse.ok) {
        throw new Error(emailData.error || "Audit ran but email failed");
      }

      setMessage("Audit complete. Email sent successfully.");
      router.push(`/audit/submitted?id=${auditId}`);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(30,41,59,0.45) 0%, #020617 45%, #000000 100%)",
        color: "#ffffff",
        padding: "40px 20px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 1.1fr) minmax(320px, 0.9fr)",
            gap: "24px",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "28px",
              padding: "40px 34px",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.96) 55%, rgba(2,6,23,0.98) 100%)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                color: "#38bdf8",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              Scaptra Audit
            </div>

            <h1
              style={{
                margin: "0 0 16px",
                color: "#f8fafc",
                fontSize: "54px",
                lineHeight: 1.05,
                fontWeight: 800,
                maxWidth: "720px",
              }}
            >
              Find out where your website is losing enquiries
            </h1>

            <p
              style={{
                margin: "0 0 14px",
                color: "#cbd5e1",
                fontSize: "20px",
                lineHeight: 1.65,
                maxWidth: "760px",
              }}
            >
              Get a clear audit of your lead capture, response readiness, and
              automation opportunities — so you can see where revenue is being
              lost before more enquiries slip through the cracks.
            </p>

            <p
              style={{
                margin: "0 0 28px",
                color: "#94a3b8",
                fontSize: "15px",
                lineHeight: 1.7,
              }}
            >
              Takes 30–60 seconds. No login required. Your report is also sent
              to your email.
            </p>

            <div
              style={{
                display: "grid",
                gap: "14px",
                marginBottom: "30px",
              }}
            >
              {[
                "Lead capture analysis across key pages",
                "Response gaps and missed enquiry risks",
                "CRM and automation readiness signals",
                "Estimated revenue at risk from weak follow-up",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    border: "1px solid rgba(51,65,85,0.8)",
                    borderRadius: "16px",
                    padding: "14px 16px",
                    background: "rgba(15,23,42,0.65)",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      minWidth: "22px",
                      borderRadius: "999px",
                      background:
                        "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                      color: "#020617",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 800,
                      marginTop: "1px",
                    }}
                  >
                    ✓
                  </div>
                  <div
                    style={{
                      color: "#e2e8f0",
                      fontSize: "15px",
                      lineHeight: 1.6,
                    }}
                  >
                    {item}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                border: "1px solid rgba(56,189,248,0.18)",
                borderRadius: "18px",
                padding: "18px 20px",
                background:
                  "linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(99,102,241,0.08) 100%)",
              }}
            >
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Built for businesses that already get enquiries
              </div>
              <div
                style={{
                  color: "#cbd5e1",
                  fontSize: "14px",
                  lineHeight: 1.7,
                }}
              >
                Most businesses don’t need more leads first. They need better
                systems for handling the ones already coming in.
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "28px",
              padding: "36px 32px",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.98) 100%)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                color: "#f8fafc",
                fontSize: "30px",
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: "10px",
              }}
            >
              Request your audit
            </div>

            <p
              style={{
                color: "#94a3b8",
                fontSize: "15px",
                lineHeight: 1.7,
                marginTop: 0,
                marginBottom: "28px",
              }}
            >
              Enter your details below and Scaptra will generate your website
              audit report.
            </p>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              <div>
                <label
                  htmlFor="businessName"
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    color: "#f8fafc",
                    fontSize: "15px",
                    fontWeight: 700,
                  }}
                >
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  placeholder="Your business name"
                  style={{
                    width: "100%",
                    padding: "18px 16px",
                    borderRadius: "16px",
                    border: "1px solid #334155",
                    background: "rgba(2,6,23,0.78)",
                    color: "#ffffff",
                    fontSize: "16px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="website"
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    color: "#f8fafc",
                    fontSize: "15px",
                    fontWeight: 700,
                  }}
                >
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  required
                  placeholder="https://example.com"
                  style={{
                    width: "100%",
                    padding: "18px 16px",
                    borderRadius: "16px",
                    border: "1px solid #334155",
                    background: "rgba(2,6,23,0.78)",
                    color: "#ffffff",
                    fontSize: "16px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    marginBottom: "10px",
                    color: "#f8fafc",
                    fontSize: "15px",
                    fontWeight: 700,
                  }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  style={{
                    width: "100%",
                    padding: "18px 16px",
                    borderRadius: "16px",
                    border: "1px solid #334155",
                    background: "rgba(2,6,23,0.78)",
                    color: "#ffffff",
                    fontSize: "16px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  padding: "18px 20px",
                  borderRadius: "16px",
                  border: "none",
                  background: loading
                    ? "#475569"
                    : "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                  color: loading ? "#cbd5e1" : "#020617",
                  fontSize: "18px",
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading
                    ? "none"
                    : "0 12px 30px rgba(56,189,248,0.18)",
                }}
              >
                {loading ? "Running Audit..." : "Run Audit"}
              </button>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  textAlign: "center",
                  marginTop: "2px",
                }}
              >
                We’ll also send your report link to your email.
              </div>

              {message ? (
                <div
                  style={{
                    marginTop: "4px",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    background:
                      message.toLowerCase().includes("error") ||
                      message.toLowerCase().includes("failed") ||
                      message.toLowerCase().includes("wrong")
                        ? "rgba(127,29,29,0.35)"
                        : "rgba(21,128,61,0.2)",
                    border:
                      message.toLowerCase().includes("error") ||
                      message.toLowerCase().includes("failed") ||
                      message.toLowerCase().includes("wrong")
                        ? "1px solid rgba(248,113,113,0.35)"
                        : "1px solid rgba(74,222,128,0.25)",
                    color:
                      message.toLowerCase().includes("error") ||
                      message.toLowerCase().includes("failed") ||
                      message.toLowerCase().includes("wrong")
                        ? "#fecaca"
                        : "#bbf7d0",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  {message}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}