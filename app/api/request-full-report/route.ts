import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOKING_URL = "https://api.leadconnectorhq.com/widget/booking/a9PnMq5n6AtbQvx4YDVN";
const MAX_BODY_BYTES = 4096;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validUuid(input: unknown): input is string {
  return typeof input === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

function isEmail(input: unknown): input is string {
  return typeof input === "string" && input.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function section(title: string, body: unknown): string {
  if (typeof body !== "string" || !body.trim()) return "";
  return `<section style="margin:24px 0"><h2 style="color:#38bdf8;font-size:18px">${escapeHtml(title)}</h2><p style="white-space:pre-line;line-height:1.7;color:#cbd5e1">${escapeHtml(body)}</p></section>`;
}

export async function POST(req: NextRequest) {
  let releaseClaim: (() => Promise<void>) | null = null;
  let sendingStarted = false;

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return json({ error: "Request is too large" }, 413);
    }

    let payload: unknown;
    try {
      const raw = await req.text();
      if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
        return json({ error: "Request is too large" }, 413);
      }
      payload = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON request" }, 400);
    }

    const reportId = asRecord(payload)?.reportId;
    if (!validUuid(reportId)) return json({ error: "Invalid report ID" }, 400);

    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, AUDIT_FROM_EMAIL } = process.env;
    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !AUDIT_FROM_EMAIL) {
      console.error("Full report delivery is missing server configuration");
      return json({ error: "Email delivery is not configured" }, 503);
    }

    const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // This RPC must atomically enforce the 24-hour cooldown and return a UUID
    // claim token on success. Missing/broken RPC means delivery fails closed.
    const { data: requestToken, error: limitError } = await db.rpc("claim_audit_report_email_v2", {
      p_report_id: reportId,
    });
    if (limitError) {
      console.error("Full report cooldown check failed", limitError.message);
      return json({ error: "Report requests are temporarily unavailable" }, 503);
    }
    if (!validUuid(requestToken)) {
      return json({ error: "This report was already requested recently. Please check your inbox." }, 429);
    }

    releaseClaim = async () => {
      const { error } = await db.rpc("release_audit_report_email", {
        p_report_id: reportId,
        p_request_token: requestToken,
      });
      if (error) console.error("Failed to release report request", error.message);
    };

    const failBeforeSend = async (message: string, status: number) => {
      await releaseClaim?.();
      releaseClaim = null;
      return json({ error: message }, status);
    };

    const { data: report, error: reportError } = await db.from("audit_reports")
      .select("id,submission_id,executive_summary,engagement_flow_map,lead_leakage_summary,automation_opportunity_matrix,implementation_blueprint")
      .eq("id", reportId).single();
    if (reportError || !report?.submission_id) return await failBeforeSend("Report not found", 404);

    const [scoreResult, submissionResult] = await Promise.all([
      db.from("audit_scores").select("total_score,scoring_notes").eq("submission_id", report.submission_id).single(),
      db.from("audit_submissions").select("business_id").eq("id", report.submission_id).single(),
    ]);
    const score = scoreResult.data;
    const submission = submissionResult.data;
    if (scoreResult.error || submissionResult.error || !score || !submission?.business_id) {
      return await failBeforeSend("Report details unavailable", 404);
    }

    const scoringNotes = asRecord(score.scoring_notes);
    const contact = asRecord(scoringNotes?.submission_contact);
    const recipient = contact?.email;
    if (!isEmail(recipient)) return await failBeforeSend("No valid email was supplied for this audit", 422);

    const { data: business, error: businessError } = await db.from("businesses")
      .select("business_name,website").eq("id", submission.business_id).single();
    if (businessError || !business) return await failBeforeSend("Business details unavailable", 404);

    const businessName = typeof business.business_name === "string" && business.business_name.trim()
      ? business.business_name.trim()
      : "Your business";
    const limited = scoringNotes?.limited_scan === true;
    const matrix = asRecord(report.automation_opportunity_matrix);
    const opportunities = matrix
      ? Object.values(matrix).slice(0, 5).map((value: unknown) => {
          const item = asRecord(value);
          if (!item) return "";
          return `<li style="margin:12px 0"><strong>${escapeHtml(item.title)}</strong><div>${escapeHtml(item.description)}</div></li>`;
        }).filter(Boolean).join("")
      : "";

    const scoreLabel = limited ? "Limited scan — manual review recommended" :
      typeof score.total_score === "number" && Number.isFinite(score.total_score)
        ? `Website snapshot score: ${Math.round(score.total_score)}/100`
        : "Website review";

    const html = `<div style="background:#020617;padding:24px;color:#e2e8f0;font-family:Arial,sans-serif">
      <div style="max-width:640px;margin:auto;background:#0f172a;border:1px solid #334155;border-radius:16px;padding:28px">
      <p style="color:#38bdf8;font-size:12px;letter-spacing:2px;font-weight:bold">SCAPTRA · DIGITAL ENGAGEMENT REPORT</p>
      <h1 style="color:#fff">${escapeHtml(businessName)}</h1>
      <p>${escapeHtml(business.website)}</p><p><strong>${escapeHtml(scoreLabel)}</strong></p>
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
    sendingStarted = true;
    const { error: sendError } = await resend.emails.send({
      from: AUDIT_FROM_EMAIL,
      to: recipient,
      subject: `Your free Scaptra detailed report — ${businessName}`,
      html,
    });
    if (sendError) {
      console.error("Full report email failed", sendError.message);
      await releaseClaim();
      releaseClaim = null;
      return json({ error: "Unable to send the report right now" }, 502);
    }

    // A successful provider acceptance keeps the cooldown claim in place.
    releaseClaim = null;
    return json({ success: true, message: "Your report has been sent to the email address used for the audit." });
  } catch (error) {
    console.error("Full report request failed", error);
    // Before contacting the mail provider, a failed attempt can safely be released.
    // Once sending starts, a network exception may mean the provider accepted the
    // message despite the error. Keep the cooldown to avoid duplicate emails.
    if (!sendingStarted && releaseClaim) {
      try { await releaseClaim(); } catch (releaseError) {
        console.error("Failed to release report request after exception", releaseError);
      }
    }
    return json({ error: "Unable to process the report request" }, 500);
  }
}
