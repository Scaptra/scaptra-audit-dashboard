import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

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

    if (
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
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

    await transporter.verify();
    console.log("SMTP connection verified successfully");

    await transporter.sendMail({
      from: `"Scaptra Audit" <${fromEmail}>`,
      to: recipientEmail,
      subject: "Your Scaptra Website Audit",
      html: `
        <h2>Your Website Audit is Ready</h2>
        <p><strong>Business:</strong> ${businessName}</p>
        <p><strong>Website:</strong> ${website}</p>
        <p>View your audit report here:</p>
        <p><a href="${auditLink}">${auditLink}</a></p>
      `,
    });

    await transporter.sendMail({
      from: `"Scaptra Audit" <${fromEmail}>`,
      to: internalEmail,
      subject: "New Scaptra Audit Lead",
      html: `
        <h3>New Audit Lead</h3>
        <p><strong>Business:</strong> ${businessName}</p>
        <p><strong>Website:</strong> ${website}</p>
        <p><strong>Email:</strong> ${recipientEmail}</p>
        <p><strong>Audit:</strong> <a href="${auditLink}">${auditLink}</a></p>
      `,
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