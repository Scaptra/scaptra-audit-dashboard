export default function HomePage() {
  return (
    <main className="min-h-screen p-10">
      <h1 style={{fontSize:"32px", fontWeight:"bold"}}>
        Scaptra Audit Dashboard
      </h1>

      <p style={{marginTop:"10px"}}>
        Control panel for running and viewing website audits.
      </p>

      <div style={{marginTop:"40px"}}>

        <div style={{marginBottom:"20px"}}>
          <h2>Run Audit</h2>
          <p>Start a new website audit.</p>
        </div>

        <div style={{marginBottom:"20px"}}>
          <h2>Audit Reports</h2>
          <p>View completed audits and results.</p>
        </div>

        <div>
          <h2>Settings</h2>
          <p>Manage integrations and configuration.</p>
        </div>

      </div>
    </main>
  );
}