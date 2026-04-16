import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { rebuildSeasonStandingsForClass } from "@/lib/rebuildSeasonStandings";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: event_id } = await params;

        const url = new URL(req.url);
        const class_id = url.searchParams.get("class_id");

        if (!event_id || !class_id) {
            return NextResponse.json(
                { error: "event_id & class_id are required." },
                { status: 400 }
            );
        }

        const totalsMeta = await sql`
            SELECT
                points_scheme_id,
                pay_scheme_id
            FROM calculated_event_totals
            WHERE event_id = ${event_id}
                AND class_id = ${class_id}
            LIMIT 1
        `;

        let points_scheme_id: string | null = null;
        let pay_scheme_id: string | null = null;

        if (totalsMeta.length) {
            points_scheme_id = totalsMeta[0].points_scheme_id ?? null;
            pay_scheme_id = totalsMeta[0].pay_scheme_id ?? null;
        }

        const awards = await sql`
        SELECT
            cra.id,
            cra.event_id,
            cra.class_id,
            cra.race_id,
            cra.result_id,
            cra.entry_id,
            cra.points_scheme_id,
            cra.pay_scheme_id,
            cra.breakdown_type,
            cra.finish_position,
            cra.transferred,
            cra.base_points,
            cra.show_up_points,
            cra.passing_points,
            cra.manual_points_adj,
            cra.awarded_points,
            cra.base_pay,
            cra.show_up_pay,
            cra.manual_pay_adj,
            cra.awarded_pay,
            cra.points_blocked,
            cra.pay_blocked,
            cra.pay_to_other,
            cra.pay_to_name,
            cra.calculated_at,

            c.name AS class_name,
            scc.car_number AS registration_car_number,
            COALESCE(ee.override_car_number, scc.car_number) AS car_number,
            pd.name AS primary_driver_name,
            cd.name AS co_driver_name,
            ee.co_driver_drove,

            ra.name AS race_name,
            ra.race_num,
            ra.order_index AS race_order_index,
            rg.group_type AS race_group_type,
            rg.order_index AS race_group_order_index

        FROM calculated_race_awards cra
        INNER JOIN event_entries ee
            ON ee.id = cra.entry_id
        INNER JOIN season_class_cars scc
            ON scc.id = ee.season_class_car_id
        INNER JOIN classes c
            ON c.id = scc.class_id
        INNER JOIN drivers pd
            ON pd.id = scc.primary_driver_id
        LEFT JOIN drivers cd
            ON cd.id = scc.co_driver_id
        INNER JOIN races ra
            ON ra.id = cra.race_id
        INNER JOIN race_groups rg
            ON rg.id = ra.race_group_id
        WHERE cra.event_id = ${event_id}
            AND cra.class_id = ${class_id}
        ORDER BY
            rg.order_index ASC,
            ra.order_index ASC,
            ra.race_num ASC,
            cra.finish_position ASC NULLS LAST,
            cra.calculated_at ASC
    `;

        const totals = await sql`
        SELECT
            cet.id,
            cet.event_id,
            cet.class_id,
            cet.entry_id,
            cet.points_scheme_id,
            cet.pay_scheme_id,
            cet.total_points,
            cet.total_pay,
            cet.base_show_up_points,
            cet.base_show_up_pay,
            cet.manual_show_up_points_adj,
            cet.manual_show_up_pay_adj,
            cet.calculated_at,

            ee.no_points AS points_blocked,
            ee.no_pay AS pay_blocked,
            ee.pay_to_other,
            ee.pay_to_name,
            ee.co_driver_drove,

            c.name AS class_name,
            scc.car_number AS registration_car_number,
            COALESCE(ee.override_car_number, scc.car_number) AS car_number,
            pd.name AS primary_driver_name,
            cd.name AS co_driver_name

        FROM calculated_event_totals cet
        INNER JOIN event_entries ee
            ON ee.id = cet.entry_id
        INNER JOIN season_class_cars scc
            ON scc.id = ee.season_class_car_id
        INNER JOIN classes c
            ON c.id = scc.class_id
        INNER JOIN drivers pd
            ON pd.id = scc.primary_driver_id
        LEFT JOIN drivers cd
            ON cd.id = scc.co_driver_id
        WHERE cet.event_id = ${event_id}
            AND cet.class_id = ${class_id}
        ORDER BY
            cet.total_points DESC,
            car_number ASC
    `;

        return NextResponse.json({
            success: true,
            event_id,
            class_id,
            points_scheme_id,
            pay_scheme_id,
            awards,
            totals,
        });
    } catch (error) {
        console.error("GET /api/points-pay/event/id:", error);
        return NextResponse.json(
            { error: "Failed to fetch saved points/pay." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: event_id } = await params;
        const url = new URL(req.url);
        const class_id = url.searchParams.get("class_id");

        if (!event_id || !class_id) {
            return NextResponse.json(
                { error: "event_id and class_id are required." },
                { status: 400 }
            );
        }

        await sql`BEGIN`;

        try {
            await sql`
                DELETE FROM calculated_race_awards
                WHERE event_id = ${event_id}
                    AND class_id = ${class_id}
            `;

            await sql`
                DELETE FROM calculated_event_totals
                WHERE event_id = ${event_id}
                    AND class_id = ${class_id}
            `;

            await sql`COMMIT`;

            await rebuildSeasonStandingsForClass({ event_id, class_id });

            return NextResponse.json({
                success: true,
                event_id,
                class_id,
            });
        } catch (error) {
            await sql`ROLLBACK`;
            throw error;
        }
    } catch (err) {
        console.error("DELETE /api/points-pay/event/[id] error:", err);
        return NextResponse.json({ error: "Failed to clear points/pay assignments." }, { status: 500 });
    }
}