import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { auditId, eventType, eventValue } = body;

    if (!auditId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("audit_events").insert({
      audit_id: auditId,
      event_type: eventType,
      event_value: eventValue ?? null,
    });

    if (error) {
      console.error("Audit event insert error:", error);
      return NextResponse.json(
        { error: "Failed to store audit event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Audit event route error:", error);
    return NextResponse.json(
      { error: "Unexpected error while storing audit event" },
      { status: 500 }
    );
  }
}