"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AuditSubmittedPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(30,41,59,0.45) 0%, #020617 45%, #000000 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          border: "1px solid #1f2937",
          borderRadius: "24px",
          padding: "40px 32px",
          background: "rgba(15,23,42,0.82)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            color: "#38bdf8",
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "12px",
            fontWeight: 700,
          }}
        >
          Scaptra Audit
        </div>

        <h1
          style={{
            margin: "0 0 14px",
            color: "#f8fafc",
            fontSize: "38px",
            lineHeight: 1.15,
          }}
        >
          Your audit is now running
        </h1>

        <p
          style={{
            color: "#cbd5e1",
            fontSize: "17px",
            lineHeight: 1.7,
            marginBottom: "24px",
            maxWidth: "640px",
          }}
        >
          We’re scanning the website and preparing your report now. This usually
          takes less than a minute. A report link has been generated and can
          also be sent by email.
        </p>

        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "18px",
            padding: "18px",
            background: "rgba(2,6,23,0.65)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              color: "#e2e8f0",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            What happens next
          </div>

          <div style={{ display: "grid", gap: "8px", color: "#cbd5e1" }}>
            <div>1. We scan the site structure and lead capture signals</div>
            <div>2. We assess response readiness and automation opportunity</div>
            <div>3. Your audit report becomes available on the report page</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {id ? (
            <Link
              href={`/audit/${id}`}
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
              View Report
            </Link>
          ) : null}

          <Link
            href="/audit/new"
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
            Run Another Audit
          </Link>
        </div>
      </div>
    </main>
  );
}