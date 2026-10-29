
import { NextRequest, NextResponse } from "next/server";
import { generateAiAuditReport } from "@/app/lib/ai-audit-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function POST(req: NextRequest) {
  // Only allow testing on the dedicated preview branch.
  if (
    process.env.VERCEL_ENV !== "preview" ||
    process.env.VERCEL_GIT_COMMIT_REF !== "feature/ai-audit-reports"
  ) {
    return NextResponse.json(
      { error: "Test unavailable" },
      { status: 404 }
    );
  }

  // Require a separate secret, never the OpenAI API key.
  const secret = process.env.AI_AUDIT_TEST_SECRET;
  const supplied = req.headers.get("x-audit-test-secret");

  if (!secret || !supplied || supplied !== secret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const evidence = {
    businessName: "Example Timber Supplies",
    website: "https://example.com",
    scannedPages: 2,
    limitedScan: false,
    findings: [
      "Homepage contains 0 form elements.",
      "Homepage contains 2 button elements.",
      "Contact page contains 1 form element.",
      "A phone number was detected on the homepage."
    ]
  };

  try {
    const report = await generateAiAuditReport(evidence);

    return NextResponse.json({
      ok: true,
      evidence,
      report
    });
  } catch (error) {
    console.error("AI test failed:", error);

    return NextResponse.json(
      { error: "AI test failed" },
      { status: 500 }
    );
  }
}
