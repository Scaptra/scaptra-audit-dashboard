import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

const BOOKING_URL = "https://api.leadconnectorhq.com/widget/booking/a9PnMq5n6AtbQvx4YDVN";

function escapeHtml(input: unknown): string {
  return String(input ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function validUuid(input: unknown): input is string {
  return typeof input === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

function isEmail(input: unknown): input is string {
  return typeof input === "string" && input.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function section(title: string, body: unknown): string {
  if (typeof body !== "string" || !body.trim()) return "";
  return `<section style="margin:24px 0"><h2 style="color:#38bdf8;font-size:18px">${escapeHtml(title)}</h2><p style="white-space:pre-line;line-height:1.7;color:#cbd5e1">${escapeHtml(body)}</p></section>`;
}

export async function POST(req: NextRequest) {
  try {
    const { reportId } = await req.json();
    if (!validUuid(reportId)) return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });

    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, AUDIT_FROM_EMAIL } = process.env;
    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !AUDIT_FROM_EMAIL) {
      console.error("Full report delivery is missing server configuration");
      return NextResponse.json({ error: "Email delivery is not configured" }, { status: 503 });
    }

    const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Atomic, database-enforced 24-hour cooldown. Requires the migration described below.
    // Fail closed if the RPC is absent or unavailable: never create an unrestricted mail relay.
    const { data: allowed, error: limitError } = await db.rpc("claim_audit_report_email", {
      p_report_id: reportId,
    });
    if (limitError) {
      console.error("Full report cooldown check failed", limitError.message);
      return NextResponse.json({ error: "Report requests are temporarily unavailable" }, { status: 503 });
    }
    if (allowed !== true) {
      return NextResponse.json({ error: "This report was already requested recently. Please check your inbox." }, { status: 429 });
    }

    const { data: report, error: reportError } = await db.from("audit_reports")
      .select("id,submission_id,executive_summary,engagement_flow_map,lead_leakage_summary,automation_opportunity_matrix,implementation_blueprint")
      .eq("id", reportId).single();
    if (reportError || !report?.submission_id) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const [{ data: score }, { data: submission }] = await Promise.all([
      db.from("audit_scores").select("total_score,scoring_notes").eq("submission_id", report.submission_id).single(),
      db.from("audit_submissions").select("business_id").eq("id", report.submission_id).single(),
    ]);
    if (!score || !submission?.business_id) return NextResponse.json({ error: "Report details unavailable" }, { status: 404 });

    const recipient = score.scoring_notes?.submission_contact?.email;
    if (!isEmail(recipient)) return NextResponse.json({ error: "No valid email was supplied for this audit" }, { status: 422 });

    const { data: business } = await db.from("businesses").select("business_name,website")
      .eq("id", submission.business_id).single();
    const businessName = business?.business_name || "Your business";
    const limited = score.scoring_notes?.limited_scan === true;
    const matrix = report.automation_opportunity_matrix;
    const opportunities = matrix && typeof matrix === "object" && !Array.isArray(matrix)
      ? Object.values(matrix).slice(0, 5).map((item: any) => {
          if (!item || typeof item !== "object") return "";
          return `<li style="margin:12px 0"><strong>${escapeHtml(item.title)}</strong><div>${escapeHtml(item.description)}</div></li>`;
        }).join("")
      : "";
    const scoreLabel = limited ? "Limited scan — manual review recommended" :
      typeof score.total_score === "number" ? `Website snapshot score: ${Math.round(score.total_score)}/100` : "Website review";

    const html = `<div style="background:#020617;padding:24px;color:#e2e8f0;font-family:Arial,sans-serif">
      <div style="max-width:640px;margin:auto;background:#0f172a;border:1px solid #334155;border-radius:16px;padding:28px">
      <p style="color:#38bdf8;font-size:12px;letter-spacing:2px;font-weight:bold">SCAPTRA · DIGITAL ENGAGEMENT REPORT</p>
      <h1 style="color:#fff">${escapeHtml(businessName)}</h1>
      <p>${escapeHtml(business?.website)}</p><p><strong>${escapeHtml(scoreLabel)}</strong></p>
      <p style="color:#94a3b8">Based on publicly visible website information. Internal response times, CRM performance and lost revenue cannot be verified by this scan.</p>
      ${section("Executive summary", report.executive_summary)}
      ${section("Customer enquiry journey", report.engagement_flow_map)}
      ${section("Areas to investigate", report.lead_leakage_summary)}
      ${opportunities ? `<section><h2 style="color:#38bdf8">Practical opportunities</h2><ul style="line-height:1.6">${opportunities}</ul></section>` : ""}
      ${section("Suggested next steps", report.implementation_blueprint)}
      <p style="margin-top:28px">Would you like to discuss which improvements matter most for your business?</p>
      <a href="${BOOKING_URL}" style="display:inline-block;background:#38bdf8;color:#020617;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Book a free 15-minute walkthrough</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:30px">Scaptra · Free report, no obligation</p>
      </div></div>`;

    const resend = new Resend(RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from: AUDIT_FROM_EMAIL,
      to: recipient,
      subject: `Your free Scaptra detailed report — ${businessName}`,
      html,
    });
    if (sendError) {
      console.error("Full report email failed", sendError.message);
      return NextResponse.json({ error: "Unable to send the report right now" }, { status: 502 });
    }
    return NextResponse.json({ success: true, message: "Your report has been sent to the email address used for the audit." });
  } catch (error) {
    console.error("Full report request failed", error);
    return NextResponse.json({ error: "Unable to process the report request" }, { status: 500 });
  }
}
