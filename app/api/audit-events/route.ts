import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Audit event tracking is temporarily disabled" },
    { status: 503 }
  );
}
