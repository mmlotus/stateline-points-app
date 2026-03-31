import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { season_id } = body ?? {};

        if (!season_id) {
            return NextResponse.json({ error: "season_id required" }, { status: 400 });
        }

        await sql`UPDATE seasons SET is_active = FALSE WHERE is_active = TRUE`;
        await sql`UPDATE seasons SET is_active = TRUE WHERE id = ${season_id}`;

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("POST /api/seasons/activate error:", err);
        return NextResponse.json({ error: "Failed to activate season" }, { status: 500 });
    }
}