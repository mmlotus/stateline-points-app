import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const rows = await sql`
            SELECT
                e.id,
                e.season_id,
                e.event_date,
                e.name,
                e.status,
                e.notes,
                e.created_at,

                COALESCE(
                    ARRAY_AGG(DISTINCT c.name ORDER BY c.name)
                    FILTER (WHERE c.name IS NOT NULL),
                    ARRAY[]::text[]
                ) AS class_names

            FROM events e
            LEFT JOIN event_classes ec
                ON ec.event_id = e.id
            LEFT JOIN classes c
                ON c.id = ec.class_id
            
            WHERE e.event_date >= CURRENT_DATE
                AND e.status NOT IN ('completed', 'cancelled')

            GROUP BY
                e.id,
                e.season_id,
                e.event_date,
                e.name,
                e.status,
                e.notes,
                e.created_at

            ORDER BY e.event_date ASC, e.created_at ASC
        `;

        return NextResponse.json(rows, { status: 200 });
    } catch (error) {
        console.error("GET /api/events/upcoming-for-entries error:", error);
        return NextResponse.json(
            { error: "Failed to load upcoming events for entries." },
            { status: 500 }
        );
    }
}