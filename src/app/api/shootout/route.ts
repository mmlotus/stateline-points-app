import { NextResponse } from "next/server";
import sql from "@/lib/db";

const SHOOTOUT_DATES = [
    "2026-08-06", // Day 1
    "2026-08-07", // Day 2
    "2026-08-08", // Day 3
];

//const SHOOTOUT_CLASSES = [
//    "Bandoleros",
//    "Legends",
// ];

export async function GET() {
    try {
        const rows = await sql`
            SELECT
                event_id,
                event_date,
                event_name,
                class_id,
                class_name,
                season_class_car_id,
                car_number,
                primary_driver_name,
                co_driver_name,
                co_driver_drove,
                total_points
            FROM shootout_frozen_standings
            ORDER BY
                class_name ASC,
                event_date ASC,
                total_points DESC
        `;

        //        const rows = await sql`
        //            SELECT
        //                e.id AS event_id,
        //                e.event_date,
        //                e.name AS event_name,
        //                c.id AS class_id,
        //                c.name AS class_name,
        //                ee.season_class_car_id,
        //                COALESCE(
        //                    ee.override_car_number,
        //                    scc.car_number
        //                ) AS car_number,
        //                pd.name AS primary_driver_name,
        //                cd.name AS co_driver_name,
        //                ee.co_driver_drove,
        //                cet.total_points
        //            FROM calculated_event_totals cet
        //            INNER JOIN events e
        //                ON e.id = cet.event_id
        //            INNER JOIN classes c
        //                ON c.id = cet.class_id
        //            INNER JOIN event_entries ee
        //                ON ee.id = cet.entry_id
        //            INNER JOIN season_class_cars scc
        //                ON scc.id = ee.season_class_car_id
        //            INNER JOIN drivers pd
        //                ON pd.id = scc.primary_driver_id
        //            LEFT JOIN drivers cd
        //                ON cd.id = scc.co_driver_id
        //            WHERE e.event_date::date IN (
        //                ${SHOOTOUT_DATES[0]}::date,
        //                ${SHOOTOUT_DATES[1]}::date,
        //                ${SHOOTOUT_DATES[2]}::date
        //            )
        //            AND c.name IN (
        //                ${SHOOTOUT_CLASSES[0]},
        //                ${SHOOTOUT_CLASSES[1]}
        //            )
        //            ORDER BY
        //                c.name ASC,
        //                e.event_date ASC,
        //                cet.total_points DESC
        //       `;

        return NextResponse.json({
            dates: SHOOTOUT_DATES,
            rows,
        });
    } catch (error) {
        console.error("GET /api/shootout error:", error);

        return NextResponse.json(
            { error: "Failed to load Shootout standings." },
            { status: 500 }
        );
    }
}