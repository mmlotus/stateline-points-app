import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const season_id = url.searchParams.get("season_id");

        if (!season_id) {
            return NextResponse.json({ error: "season_id required" }, { status: 400 });
        }

        const rows = await sql`
            SELECT MAX(event_date) AS last_event_date
            FROM events
            WHERE season_id = ${season_id}
        `;

        return NextResponse.json({
            last_event_date: rows[0]?.last_event_date ?? null,
        });
    } catch (error) {
        console.error("GET /api/events/last-date error:", error);
        return NextResponse.json(
            { error: "Failed to fetch last event date." },
            { status: 500 }
        );
    }
}