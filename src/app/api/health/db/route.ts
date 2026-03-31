import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`SELECT 1 as connected`;
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
