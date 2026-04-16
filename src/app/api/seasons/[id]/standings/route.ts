import { NextResponse } from "next/server";
import sql from "@/lib/db";

type RouteContext = {
    params: Promise<{ id: string}>;
};

export async function GET(req: Request, context: RouteContext) {
    try {
        const { id: seasonId } = await context.params;

        const url = new URL(req.url);
        const class_id = url.searchParams.get("class_id");
        const as_of_date = url.searchParams.get("as_of_date");

        if (!seasonId) {
            return NextResponse.json(
                { error: "season_id required" },
                { status: 400 }
            );
        }

        if (as_of_date) {
            const standings = await sql`
                SELECT
                    scc.id AS season_class_car_id,
                    scc.season_id,
                    scc.class_id,
                    c.name AS class_name,
                    scc.car_number AS registration_car_number,
                    scc.car_number AS car_number,
                    scc.primary_driver_id,
                    pd.name AS primary_driver_name,
                    scc.co_driver_id,
                    cd.name AS co_driver_name,
                    scc.is_active,

                    COALESCE(SUM(cet.total_points), 0) AS total_points,
                    COALESCE(SUM(cet.total_pay), 0) AS total_pay,
                    COUNT(DISTINCT cet.event_id) AS events_count

                FROM season_class_cars scc
                INNER JOIN classes c
                    ON c.id = scc.class_id
                INNER JOIN drivers pd
                    ON pd.id = scc.primary_driver_id
                LEFT JOIN drivers cd
                    ON cd.id = scc.co_driver_id
                LEFT JOIN event_entries ee
                    ON ee.season_class_car_id = scc.id
                LEFT JOIN calculated_event_totals cet
                    ON cet.entry_id = ee.id
                LEFT JOIN events ev
                    ON ev.id = cet.event_id

                WHERE scc.season_id = ${seasonId}
                    AND (${class_id}::uuid IS NULL OR scc.class_id = ${class_id}::uuid)
                    AND (
                        cet.id IS NULL
                        OR ev.event_date <= ${as_of_date}
                    )

                GROUP BY
                    scc.id,
                    scc.season_id,
                    scc.class_id,
                    c.name,
                    scc.car_number,
                    scc.primary_driver_id,
                    pd.name,
                    scc.co_driver_id,
                    cd.name,
                    scc.is_active

                ORDER BY
                    total_points DESC,
                    car_number ASC
            `;

            return NextResponse.json({
                success: true,
                season_id: seasonId,
                class_id: class_id ?? null,
                as_of_date,
                standings,
            });
        }

        const standings = await sql`
            SELECT
                sta.id,
                sta.season_id,
                sta.class_id,
                sta.season_class_car_id,
                sta.total_points,
                sta.total_pay,
                sta.events_count,
                sta.updated_at,

                c.name AS class_name,
                scc.car_number AS registration_car_number,
                scc.car_number AS car_number,
                scc.primary_driver_id,
                pd.name AS primary_driver_name,
                scc.co_driver_id,
                cd.name AS co_driver_name,
                scc.is_active

            FROM season_championship_standings sta
            INNER JOIN season_class_cars scc
                ON scc.id = sta.season_class_car_id
            INNER JOIN classes c
                ON c.id = sta.class_id
            INNER JOIN drivers pd
                ON pd.id = scc.primary_driver_id
            LEFT JOIN drivers cd
                ON cd.id = scc.co_driver_id

            WHERE sta.season_id = ${seasonId}
                AND (${class_id}::uuid IS NULL OR sta.class_id = ${class_id}::uuid)

            ORDER BY
                sta.total_points DESC,
                car_number ASC
        `;

        return NextResponse.json({
            success: true,
            season_id: seasonId,
            class_id: class_id ?? null,
            as_of_date: null,
            standings,
        });
    } catch (error) {
        console.error("GET /api/seasons/[id]/standings error:", error);
        return NextResponse.json(
            { error: "Failed to fetch season standings." },
            { status: 500 }
        );
    }
}