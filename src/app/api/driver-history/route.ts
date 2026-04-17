import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const season_id = url.searchParams.get("season_id");
        const season_class_car_id = url.searchParams.get("season_class_car_id");

        if (!season_id || !season_class_car_id) {
            return NextResponse.json(
                { error: "season_id and season_class_car_id are required." },
                { status: 400 }
            );
        }

        const rows = await sql`
            SELECT
                e.id AS event_id,
                e.event_date,
                e.name AS event_name,
                e.status AS event_status,

                c.id AS class_id,
                c.name AS class_name,

                ee.id AS entry_id,
                scc.id AS season_class_car_id,
                scc.car_number AS registration_car_number,
                COALESCE(ee.override_car_number, scc.car_number) AS car_number,

                pd.name AS primary_driver_name,
                cd.name AS co_driver_name,
                ee.co_driver_drove,

                cet.total_points,
                cet.total_pay,
                cet.base_show_up_points,
                cet.base_show_up_pay,
                cet.manual_show_up_points_adj,
                cet.manual_show_up_pay_adj,

                cra.id AS award_id,
                cra.race_id,
                cra.breakdown_type,
                cra.finish_position,
                cra.transferred,
                cra.base_points,
                cra.show_up_points,
                cra.passing_points,
                cra.add_points_awarded,
                cra.manual_points_adj,
                cra.awarded_points,
                cra.base_pay,
                cra.show_up_pay,
                cra.manual_pay_adj,
                cra.awarded_pay,
                cra.points_blocked,
                cra.pay_blocked,

                r.name AS race_name,
                r.race_num,
                r.order_index AS race_order_index,
                rg.group_type AS race_group_type,
                rg.order_index AS race_group_order_index

            FROM season_class_cars scc
            INNER JOIN event_entries ee
                ON ee.season_class_car_id = scc.id
            INNER JOIN events e
                On e.id = ee.event_id
            INNER JOIN classes c
                ON c.id = scc.class_id
            INNER JOIN drivers pd
                ON pd.id = scc.primary_driver_id
            LEFT JOIN drivers cd
                ON cd.id = scc.co_driver_id
            LEFT JOIN calculated_event_totals cet
                ON cet.entry_id = ee.id
                AND cet.event_id = e.id
                AND cet.class_id = scc.class_id
            LEFT JOIN calculated_race_awards cra
                ON cra.entry_id = ee.id
                AND cra.event_id = e.id
                AND cra.class_id = scc.class_id
            LEFT JOIN races r
                ON r.id = cra.race_id
            LEFT JOIN race_groups rg
                ON rg.id = r.race_group_id
            WHERE scc.season_id = ${season_id}
                AND scc.id = ${season_class_car_id}
            ORDER BY
                e.event_date ASC,
                rg.order_index ASC NULLS LAST,
                r.order_index ASC NULLS LAST,
                r.race_num ASC NULLS LAST,
                cra.finish_position ASC NULLS LAST
        `;

        if (!rows.length) {
            return NextResponse.json({
                season_id,
                season_class_car_id,
                summary: null,
                events: [],
            });
        }

        const first = rows[0];

        const eventsMap = new Map<string, {
            event_id: string;
            event_date: string;
            event_name: string;
            event_status: string;
            total_points: number;
            total_pay: number;
            base_show_up_points: number;
            base_show_up_pay: number;
            manual_show_up_points_adj: number;
            manual_show_up_pay_adj: number;
            races: Array<{
                award_id: string;
                race_id: string;
                race_name: string | null;
                race_num: number | null;
                race_order_index: number | null;
                race_group_type: string | null;
                race_group_order_index: number | null;
                breakdown_type: string | null;
                finish_position: number | null;
                transferred: boolean;
                base_points: number;
                show_up_points: number;
                passing_points: number;
                add_points_awarded: number;
                manual_points_adj: number;
                awarded_points: number;
                base_pay: number;
                show_up_pay: number;
                manual_pay_adj: number;
                awarded_pay: number;
                points_blocked: boolean;
                pay_blocked: boolean;
            }>;
        }>();

        for (const row of rows) {
            if (!eventsMap.has(row.event_id)) {
                eventsMap.set(row.event_id, {
                    event_id: row.event_id,
                    event_date: row.event_date,
                    event_name: row.event_name,
                    event_status: row.event_status,
                    total_points: Number(row.total_points ?? 0),
                    total_pay: Number(row.total_pay ?? 0),
                    base_show_up_points: Number(row.base_show_up_points ?? 0),
                    base_show_up_pay: Number(row.base_show_up_pay ?? 0),
                    manual_show_up_points_adj: Number(row.manual_show_up_points_adj ?? 0),
                    manual_show_up_pay_adj: Number(row.manual_show_up_pay_adj ?? 0),
                    races: [],
                });
            }

            if (row.award_id) {
                eventsMap.get(row.event_id)!.races.push({
                    award_id: row.award_id,
                    race_id: row.race_id,
                    race_name: row.race_name,
                    race_num: row.race_num,
                    race_order_index: row.race_order_index,
                    race_group_type: row.race_group_type,
                    race_group_order_index: row.race_group_order_index,
                    breakdown_type: row.breakdown_type,
                    finish_position: row.finish_position,
                    transferred: Boolean(row.transferred),
                    base_points: Number(row.base_points ?? 0),
                    show_up_points: Number(row.show_up_points ?? 0),
                    passing_points: Number(row.passing_points ?? 0),
                    add_points_awarded: Number(row.add_points_awarded ?? 0),
                    manual_points_adj: Number(row.manual_points_adj ?? 0),
                    awarded_points: Number(row.awarded_points ?? 0),
                    base_pay: Number(row.base_pay ?? 0),
                    show_up_pay: Number(row.show_up_pay ?? 0),
                    manual_pay_adj: Number(row.manual_pay_adj ?? 0),
                    awarded_pay: Number(row.awarded_pay ?? 0),
                    points_blocked: Boolean(row.points_blocked),
                    pay_blocked: Boolean(row.pay_blocked),
                });
            }
        }

        return NextResponse.json({
            season_id,
            season_class_car_id,
            summary: {
                season_class_car_id: first.season_class_car_id,
                class_id: first.class_id,
                class_name: first.class_name,
                registration_car_number: first.registration_car_number,
                car_number: first.car_number,
                primary_driver_name: first.primary_driver_name,
                co_driver_name: first.co_driver_name,
                co_driver_drove: Boolean(first.co_driver_drove),
            },
            events: Array.from(eventsMap.values()),
        });
    } catch (error) {
        console.error("GET /api/driver-history error:", error);
        return NextResponse.json(
            { error: "Failed to load driver history." },
            { status: 500 }
        );
    }
}