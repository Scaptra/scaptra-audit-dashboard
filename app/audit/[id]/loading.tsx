export default function AuditReportLoading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 55%, #000000 100%)",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: "24px",
          padding: "40px 32px",
          background: "rgba(15,23,42,0.72)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#38bdf8",
            marginBottom: "14px",
          }}
        >
          Scaptra Audit
        </div>

        <h1
          style={{
            fontSize: "42px",
            lineHeight: 1.1,
            margin: "0 0 14px 0",
            fontWeight: 800,
          }}
        >
          Building your audit report
        </h1>

        <p
          style={{
            margin: "0 0 28px 0",
            fontSize: "18px",
            lineHeight: 1.6,
            color: "#cbd5e1",
          }}
        >
          We’re scanning the website, checking lead capture signals, and
          preparing your report. This usually takes 10–30 seconds.
        </p>

        <div
          style={{
            height: "10px",
            borderRadius: "999px",
            overflow: "hidden",
            background: "rgba(148,163,184,0.15)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #38bdf8, #2563eb)",
              animation: "scaptraPulse 1.4s ease-in-out infinite",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
            color: "#cbd5e1",
            fontSize: "16px",
          }}
        >
          <div>• Scanning page structure</div>
          <div>• Checking contact and booking signals</div>
          <div>• Reviewing response and automation readiness</div>
          <div>• Finalising your report</div>
        </div>

        <style>{`
          @keyframes scaptraPulse {
            0% { transform: translateX(-20%); opacity: 0.7; }
            50% { transform: translateX(80%); opacity: 1; }
            100% { transform: translateX(180%); opacity: 0.7; }
          }
        `}</style>
      </div>
    </main>
  );
}