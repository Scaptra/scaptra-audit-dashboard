import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendAuditReportEmailParams = {
  to: string;
  businessName: string;
  reportUrl: string;
  isLimitedScan?: boolean;
};

export async function sendAuditReportEmail({
  to,
  businessName,
  reportUrl,
  isLimitedScan = false,
}: SendAuditReportEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!process.env.AUDIT_FROM_EMAIL) {
    throw new Error("Missing AUDIT_FROM_EMAIL");
  }

  const subject = isLimitedScan
    ? `Your Scaptra audit for ${businessName} is ready`
    : `Your Scaptra audit report for ${businessName}`;

  const headline = isLimitedScan
    ? "Your audit is ready"
    : "Your audit report is ready";

  const message = isLimitedScan
    ? "This website appears to use security protection that limited the automated scan. We have still prepared a report with the next recommended steps."
    : "Your website audit has been completed and your report is ready to view.";

  const cta = isLimitedScan
    ? "Open Your Limited Audit Report"
    : "Open Your Audit Report";

  const { error } = await resend.emails.send({
    from: process.env.AUDIT_FROM_EMAIL,
    to,
    subject,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; background:#020617; color:#e2e8f0; padding:32px;">
        <div style="max-width:640px; margin:0 auto; background:#0f172a; border:1px solid #1e293b; border-radius:20px; padding:32px;">
          <div style="color:#38bdf8; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:12px;">
            Scaptra Audit
          </div>

          <h1 style="margin:0 0 16px; font-size:32px; line-height:1.2; color:#f8fafc;">
            ${headline}
          </h1>

          <p style="margin:0 0 16px; font-size:18px; line-height:1.7; color:#cbd5e1;">
            ${message}
          </p>

          <p style="margin:0 0 24px; font-size:16px; line-height:1.7; color:#cbd5e1;">
            Business: <strong style="color:#f8fafc;">${businessName}</strong>
          </p>

          <a
            href="${reportUrl}"
            style="display:inline-block; padding:16px 24px; background:linear-gradient(90deg,#38bdf8 0%,#6366f1 100%); color:#020617; text-decoration:none; font-weight:800; border-radius:12px; font-size:16px;"
          >
            ${cta}
          </a>

          <p style="margin:24px 0 0; font-size:14px; line-height:1.7; color:#94a3b8;">
            If the button does not work, copy and paste this link into your browser:
          </p>

          <p style="margin:8px 0 0; font-size:14px; line-height:1.7; color:#bae6fd; word-break:break-word;">
            ${reportUrl}
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send audit report email");
  }
}