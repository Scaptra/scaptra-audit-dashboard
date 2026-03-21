import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientEmail, businessName, website, auditId } = body;

    if (!recipientEmail || !businessName || !website || !auditId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("Missing SMTP environment variables");
      return NextResponse.json(
        { error: "SMTP environment variables are missing" },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const auditLink = `${appUrl}/audit/${auditId}`;
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const internalEmail =
      process.env.INTERNAL_NOTIFICATION_EMAIL || process.env.SMTP_USER;

    const safeBusinessName = escapeHtml(businessName);
    const safeWebsite = escapeHtml(website);
    const safeRecipientEmail = escapeHtml(recipientEmail);
    const safeAuditLink = escapeHtml(auditLink);

    await transporter.verify();
    console.log("SMTP connection verified successfully");

    await transporter.sendMail({
      from: `"Scaptra Audit" <${fromEmail}>`,
      to: recipientEmail,
      subject: `Your Scaptra Website Audit for ${businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 24px;">
          <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0ea5e9; margin-bottom: 14px;">
            Scaptra Audit
          </div>

          <h2 style="margin: 0 0 16px; font-size: 30px; line-height: 1.2; color: #0f172a;">
            Your website audit is ready
          </h2>

          <p style="margin: 0 0 16px; color: #334155;">
            Thanks for requesting an audit. Your report has been generated and is ready to view.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 0 0 20px;">
            <p style="margin: 0 0 8px;"><strong>Business:</strong> ${safeBusinessName}</p>
            <p style="margin: 0 0 8px;"><strong>Website:</strong> ${safeWebsite}</p>
            <p style="margin: 0;"><strong>Report Link:</strong> <a href="${safeAuditLink}" style="color: #2563eb;">${safeAuditLink}</a></p>
          </div>

          <p style="margin: 0 0 18px; color: #334155;">
            This report highlights lead capture gaps, response readiness, and automation opportunities that may be affecting enquiries and revenue.
          </p>

          <div style="margin: 0 0 22px;">
            <a
              href="${safeAuditLink}"
              style="display: inline-block; background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 22px; border-radius: 12px;"
            >
              View Your Audit Report
            </a>
          </div>

          <p style="margin: 0 0 12px; color: #334155;">
            If you’d like help fixing the gaps identified in the report, just reply to this email.
          </p>

          <p style="margin: 24px 0 0; color: #475569;">
            Best regards,<br />
            Anthony Miller<br />
            Scaptra
          </p>
        </div>
      `,
      text: `Your website audit is ready.

Business: ${businessName}
Website: ${website}
Report link: ${auditLink}

If you'd like help fixing the gaps identified in the report, just reply to this email.

Best regards,
Anthony Miller
Scaptra`,
    });

    await transporter.sendMail({
      from: `"Scaptra Audit" <${fromEmail}>`,
      to: internalEmail,
      subject: "New Scaptra Audit Lead",
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; max-width: 680px; margin: 0 auto; padding: 24px;">
          <h3 style="margin-top: 0;">New Audit Lead</h3>
          <p><strong>Business:</strong> ${safeBusinessName}</p>
          <p><strong>Website:</strong> ${safeWebsite}</p>
          <p><strong>Email:</strong> ${safeRecipientEmail}</p>
          <p><strong>Audit:</strong> <a href="${safeAuditLink}">${safeAuditLink}</a></p>
        </div>
      `,
      text: `New Audit Lead

Business: ${businessName}
Website: ${website}
Email: ${recipientEmail}
Audit: ${auditLink}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}