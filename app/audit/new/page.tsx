"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error("API returned invalid JSON.");
    }
  }

  throw new Error(
    rawText.startsWith("<!DOCTYPE")
      ? "The server returned an HTML error page instead of JSON. Check the terminal for the real server error."
      : rawText || "Unexpected non-JSON response from server."
  );
}

export default function NewAuditPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
        throw new Error(auditData.error || "Failed to run audit");
      }

      const auditId =
        auditData.auditId || auditData.submissionId || auditData.id;

      if (!auditId) {
        throw new Error("Audit completed but no audit ID was returned");
      }

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
      router.push(`/audit/${auditId}`);
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
        background: "#000",
        color: "#fff",
        padding: "40px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          border: "1px solid #222",
          borderRadius: "18px",
          padding: "28px",
          background: "#0b0b0b",
        }}
      >
        <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "10px" }}>
          Scaptra Audit
        </div>

        <h1 style={{ fontSize: "36px", marginTop: 0, marginBottom: "12px" }}>
          Request a Website Audit
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
          Enter the business details below and Scaptra will generate an audit
          report and email the result.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label
              htmlFor="businessName"
              style={{ display: "block", marginBottom: "8px" }}
            >
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #333",
                background: "#111",
                color: "#fff",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="website"
              style={{ display: "block", marginBottom: "8px" }}
            >
              Website
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #333",
                background: "#111",
                color: "#fff",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              style={{ display: "block", marginBottom: "8px" }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #333",
                background: "#111",
                color: "#fff",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px 18px",
              borderRadius: "10px",
              border: "1px solid #444",
              background: loading ? "#222" : "#fff",
              color: loading ? "#999" : "#000",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Running Audit..." : "Run Audit"}
          </button>
        </form>

        {message ? (
          <div
            style={{
              marginTop: "18px",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #222",
              background: "#111",
              color: "#d1d5db",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}