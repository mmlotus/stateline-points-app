import { NextResponse } from "next/server";
import sql from "@/lib/db";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
        }

        const eventRows = await sql`
            SELECT id, season_id
            FROM events
            WHERE id = ${eventId}
            LIMIT 1
        `;

        if (eventRows.length === 0) {
            return NextResponse.json({ error: "Event not found." }, { status: 404 });
        }

        const eventRow = eventRows[0];

        const rows = await sql`
            SELECT
                scc.id,
                scc.season_id,
                scc.class_id,
                c.name AS class_name,
                scc.car_number,
                scc.primary_driver_id,
                pd.name AS primary_driver_name,
                scc.co_driver_id,
                cd.name AS co_driver_name,
                scc.is_active,
                scc.created_at,
                scc.updated_at,

                EXISTS (
                    SELECT 1
                    FROM event_entries ee
                    WHERE ee.event_id = ${eventId}
                        AND ee.season_class_car_id = scc.id
                ) AS already_entered

            FROM season_class_cars scc
            INNER JOIN classes c
                ON c.id = scc.class_id
            INNER JOIN drivers pd
                ON pd.id = scc.primary_driver_id
            LEFT JOIN drivers cd
                ON cd.id = scc.co_driver_id
            INNER JOIN event_classes ec
                ON ec.class_id = scc.class_id
                AND ec.event_id = ${eventId}
            WHERE scc.season_id = ${eventRow.season_id}
                AND scc.is_active = TRUE
            ORDER BY c.name ASC, scc.car_number ASC, pd.name ASC
        `;

        return NextResponse.json(rows);
    } catch (error) {
        console.error("GET /api/events/[id]/entry-options error:", error);
        return NextResponse.json({ error: "Failed to fetch entry options" }, { status: 500 });
    }
}