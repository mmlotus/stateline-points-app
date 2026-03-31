import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const event_id = url.searchParams.get("event_id");

        if (!event_id) {
            return NextResponse.json(
                { error: "event_id is required" },
                { status: 400 }
            );
        }

        const rows = await sql`
            SELECT
                ec.id,
                ec.event_id,
                ec.class_id,
                ec.created_at,
                c.name AS class_name
            FROM event_classes ec
            LEFT JOIN classes c
                on c.id = ec.class_id
            WHERE ec.event_id = ${event_id}
            ORDER BY c.name ASC, ec.created_at ASC
        `;

        return NextResponse.json(rows);
    } catch (error) {
        console.error("GET /api/event-classes error:", error);
        return NextResponse.json(
            { error: "Failed to load event classes." },
            { status: 500 }
        );
    }
}