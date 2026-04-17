import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { RaceGroupType, ResultWithDetails, SchemeBreakdownRow, SchemeBreakdownType, SchemeLine, SchemeWithBreakdowns } from "@/types";
import { calcEventTotals, calcResultAward, getShowUpPointsForEntry } from "@/lib/pointsPayCalculator";
import { rebuildSeasonStandingsForClass } from "@/lib/rebuildSeasonStandings";

async function loadSchemeWithBreakdowns(id: string): Promise<SchemeWithBreakdowns | null> {
    //Load parent scheme row first
    const schemeRows = await sql`
        SELECT *
        FROM schemes
        WHERE id = ${id}
        LIMIT 1
    `;

    if (!schemeRows.length) {
        return null;
    }

    const breakdowns = (await sql`
            SELECT *
            FROM scheme_breakdowns
            WHERE scheme_id = ${id}
            ORDER BY type ASC
    `) as SchemeBreakdownRow[];

    const breakdownIds = breakdowns.map((row) => row.id);

    let lines: SchemeLine[] = [];
    if (breakdownIds.length) {
        lines = (await sql`
            SELECT *
            FROM scheme_lines
            WHERE breakdown_id = ANY(${breakdownIds})    
            ORDER BY start_position ASC
        `) as SchemeLine[];
    }

    return {
        ...schemeRows[0],
        breakdowns: breakdowns.map((breakdown) => ({
            ...breakdown,
            lines: lines.filter((line) => line.breakdown_id === breakdown.id),
        })),
    } as SchemeWithBreakdowns;
}

async function loadEntriesForEventClass(eventId: string, classId: string) {
    const rows = await sql`
        SELECT
            ee.id,
            ee.no_points,
            ee.no_pay
        FROM event_entries ee
        INNER JOIN season_class_cars scc
            ON scc.id = ee.season_class_car_id
        WHERE ee.event_id = ${eventId}
            AND scc.class_id = ${classId}
        ORDER BY ee.id ASC
    `;

    return rows as Array<{
        id: string;
        no_points: boolean;
        no_pay: boolean;
    }>;
}

async function loadResultsForEventClass(
    eventId: string,
    classId: string
): Promise<(ResultWithDetails & {
    race_group_type: RaceGroupType;
    race_group_id: string;
    race_group_order_index: number;
    race_name: string | null;
    race_num: number;
    race_order_index: number;
    race_transfer_count: number;
})[]
> {
    const rows = await sql`
        SELECT
            r.id,
            r.race_id,
            r.entry_id,
            r.finish_position,
            r.dns,
            r.dnf,
            r.dq,
            r.bf,
            r.transferred,
            r.add_points_value,
            r.notes,
            r.created_at,

            ee.event_id,
            ee.season_class_car_id,
            ee.override_car_number,
            ee.no_points,
            ee.no_pay,
            ee.pay_to_other,
            ee.pay_to_name,
            ee.co_driver_drove,

            scc.season_id,
            scc.class_id,
            c.name AS class_name,
            scc.car_number AS registration_car_number,
            COALESCE(ee.override_car_number, scc.car_number) AS car_number,
            scc.primary_driver_id,
            pd.name AS primary_driver_name,
            scc.co_driver_id,
            cd.name AS co_driver_name,
            scc.is_active,

            ra.name AS race_name,
            ra.race_num,
            ra.order_index AS race_order_index,
            ra.transfer_count AS race_transfer_count,
            rg.id AS race_group_id,
            rg.group_type AS race_group_type,
            rg.order_index AS race_group_order_index

        FROM results r
        INNER JOIN races ra
            ON ra.id = r.race_id
        INNER JOIN race_groups rg
            ON rg.id = ra.race_group_id
        INNER JOIN event_classes ec
            ON ec.id = rg.event_class_id
        INNER JOIN event_entries ee
            ON ee.id = r.entry_id
        INNER JOIN season_class_cars scc
            ON scc.id = ee.season_class_car_id
        INNER JOIN classes c
            ON c.id = scc.class_id
        INNER JOIN drivers pd
            ON pd.id = scc.primary_driver_id
        LEFT JOIN drivers cd
            ON cd.id = scc.co_driver_id
        WHERE ec.event_id = ${eventId}
            AND ec.class_id = ${classId}
        ORDER BY
            rg.order_index ASC,
            ra.order_index ASC,
            ra.race_num ASC,
            r.finish_position ASC NULLS LAST,
            r.created_at ASC
    `;

    return rows as (ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_group_id: string;
        race_group_order_index: number;
        race_name: string | null;
        race_num: number;
        race_order_index: number;
        race_transfer_count: number;
    })[];
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const event_id = body?.event_id as string | undefined;
        const class_id = body?.class_id as string | undefined;
        const points_scheme_id = (body?.points_scheme_id ?? null) as string | null;
        const pay_scheme_id = (body?.pay_scheme_id ?? null) as string | null;

        if (!event_id || !class_id) {
            return NextResponse.json(
                { error: "event_id and class_id are required" },
                { status: 400 }
            );
        }

        if (!points_scheme_id && !pay_scheme_id) {
            return NextResponse.json(
                { error: "At least one of points_scheme_id or pay_scheme_id is required." },
                { status: 400 }
            );
        }

        const [pointsScheme, payScheme, results, entries] = await Promise.all([
            points_scheme_id ? loadSchemeWithBreakdowns(points_scheme_id) : Promise.resolve(null),
            pay_scheme_id ? loadSchemeWithBreakdowns(pay_scheme_id) : Promise.resolve(null),
            loadResultsForEventClass(event_id, class_id),
            loadEntriesForEventClass(event_id, class_id),
        ]);

        if (points_scheme_id && !pointsScheme) {
            return NextResponse.json(
                { error: "Points scheme not found." },
                { status: 404 }
            );
        }

        if (pay_scheme_id && !payScheme) {
            return NextResponse.json(
                { error: "Pay scheme not found." },
                { status: 404 }
            );
        }

        const existingAdj = await sql`
            SELECT
                result_id,
                manual_points_adj,
                manual_pay_adj
            FROM calculated_race_awards
            WHERE event_id = ${event_id}
                AND class_id = ${class_id}
        `;

        const existingShowUpAdj = await sql`
            SELECT
                entry_id,
                manual_show_up_points_adj,
                manual_show_up_pay_adj
            FROM calculated_event_totals
            WHERE event_id = ${event_id}
                AND class_id = ${class_id}
        `;

        const showUpAdjustsByEntryId = new Map<
            string,
            {
                manual_show_up_points_adj: number;
                manual_show_up_pay_adj: number;
            }
        >();

        for (const row of existingShowUpAdj) {
            showUpAdjustsByEntryId.set(row.entry_id, {
                manual_show_up_points_adj: Number(row.manual_show_up_points_adj ?? 0),
                manual_show_up_pay_adj: Number(row.manual_show_up_pay_adj ?? 0),
            });
        }

        const adjustsByResultId = new Map<
            string,
            {
                manual_points_adj: number;
                manual_pay_adj: number;
            }
        >();

        for (const row of existingAdj) {
            adjustsByResultId.set(row.result_id, {
                manual_points_adj: Number(row.manual_points_adj ?? 0),
                manual_pay_adj: Number(row.manual_pay_adj ?? 0),
            });
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

            const awardsToSave: Array<{
                result_id: string;
                race_id: string;
                entry_id: string;
                breakdown_type: SchemeBreakdownType;
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
                pay_to_other: boolean;
                pay_to_name: string | null;
            }> = [];

            for (const result of results) {
                const calculated = calcResultAward({
                    result,
                    allResults: results,
                    pointsScheme,
                    payScheme,
                });

                const existingAdj = adjustsByResultId.get(result.id);
                const manual_points_adj = existingAdj?.manual_points_adj ?? 0;
                const manual_pay_adj = existingAdj?.manual_pay_adj ?? 0;

                awardsToSave.push({
                    result_id: result.id,
                    race_id: result.race_id,
                    entry_id: result.entry_id,
                    ...calculated,
                    manual_points_adj,
                    manual_pay_adj,
                });
            }

            const insertedAwards = [];

            for (const award of awardsToSave) {
                const inserted = await sql`
                    INSERT INTO calculated_race_awards (
                        event_id,
                        class_id,
                        race_id,
                        result_id,
                        entry_id,
                        points_scheme_id,
                        pay_scheme_id,
                        breakdown_type,
                        finish_position,
                        transferred,
                        base_points,
                        show_up_points,
                        passing_points,
                        add_points_awarded,
                        manual_points_adj,
                        awarded_points,
                        base_pay,
                        show_up_pay,
                        manual_pay_adj,
                        awarded_pay,
                        points_blocked,
                        pay_blocked,
                        pay_to_other,
                        pay_to_name
                    )
                    VALUES (
                        ${event_id},
                        ${class_id},
                        ${award.race_id},
                        ${award.result_id},
                        ${award.entry_id},
                        ${points_scheme_id},
                        ${pay_scheme_id},
                        ${award.breakdown_type},
                        ${award.finish_position},
                        ${award.transferred},
                        ${award.base_points},
                        ${award.show_up_points},
                        ${award.passing_points},
                        ${award.add_points_awarded},
                        ${award.manual_points_adj},
                        ${award.awarded_points},
                        ${award.base_pay},
                        ${award.show_up_pay},
                        ${award.manual_pay_adj},
                        ${award.awarded_pay},
                        ${award.points_blocked},
                        ${award.pay_blocked},
                        ${award.pay_to_other},
                        ${award.pay_to_name}
                    )
                    RETURNING *
                `;

                insertedAwards.push(inserted[0]);
            }

            const raceTotals = calcEventTotals(awardsToSave.map((award) => ({
                entry_id: award.entry_id,
                awarded_points: award.awarded_points + award.manual_points_adj,
                awarded_pay: award.awarded_pay + award.manual_pay_adj,
            })));

            const raceTotalsByEntryId = new Map(raceTotals.map((row) => [row.entry_id, row]));

            const totals = entries.map((entry) => {
                const raceTotal = raceTotalsByEntryId.get(entry.id);
                const existingShowUp = showUpAdjustsByEntryId.get(entry.id);

                const base_show_up_points = getShowUpPointsForEntry({
                    entry_id: entry.id,
                    entered_entry_ids: entries.map((e) => e.id),
                    pointsScheme,
                    points_blocked_by_entry_id: Object.fromEntries(
                        entries.map((e) => [e.id, Boolean(e.no_points)])
                    ),
                });
                const base_show_up_pay = 0;
                const manual_show_up_points_adj = existingShowUp?.manual_show_up_points_adj ?? 0;
                const manual_show_up_pay_adj = existingShowUp?.manual_show_up_pay_adj ?? 0;

                return {
                    entry_id: entry.id,
                    total_points: Number(raceTotal?.total_points ?? 0) + base_show_up_points + manual_show_up_points_adj,
                    total_pay: Number(raceTotal?.total_pay ?? 0) + base_show_up_pay + manual_show_up_pay_adj,
                    base_show_up_points,
                    base_show_up_pay,
                    manual_show_up_points_adj,
                    manual_show_up_pay_adj,
                };
            });

            const insertedTotals = [];

            for (const total of totals) {
                const inserted = await sql`
                    INSERT INTO calculated_event_totals (
                        event_id,
                        class_id,
                        entry_id,
                        points_scheme_id,
                        pay_scheme_id,
                        total_points,
                        total_pay,
                        base_show_up_points,
                        base_show_up_pay,
                        manual_show_up_points_adj,
                        manual_show_up_pay_adj
                    )
                    VALUES (
                        ${event_id},
                        ${class_id},
                        ${total.entry_id},
                        ${points_scheme_id},
                        ${pay_scheme_id},
                        ${total.total_points},
                        ${total.total_pay},
                        ${total.base_show_up_points},
                        ${total.base_show_up_pay},
                        ${total.manual_show_up_points_adj},
                        ${total.manual_show_up_pay_adj}
                    )
                    RETURNING *
                `;

                insertedTotals.push(inserted[0]);
            }

            const awardsWithNames = await sql`
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
                    cra.add_points_awarded,
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
                ORDER BY cra.race_id ASC, cra.finish_position ASC NULLS LAST, cra.calculated_at ASC
            `;

            const totalsWithNames = await sql`
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
                ORDER BY cet.total_points DESC, car_number ASC
            `;

            await sql`COMMIT`;

            await rebuildSeasonStandingsForClass({ event_id, class_id });

            return NextResponse.json({
                success: true,
                event_id,
                class_id,
                points_scheme_id,
                pay_scheme_id,
                awards: awardsWithNames,
                totals: totalsWithNames,
            });
        } catch (error) {
            await sql`ROLLBACK`;
            throw error;
        }
    } catch (error) {
        console.error("POST /api/points-pay/calculate error:", error);
        return NextResponse.json(
            { error: "Failed to calculate points/pay." },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();

        const event_id = body?.event_id as string | undefined;
        const class_id = body?.class_id as string | undefined;
        const adjustments = (body?.adjustments ?? []) as Array<{
            award_id: string;
            manual_points_adj?: number | null;
            manual_pay_adj?: number | null;
        }>;
        const show_up_adjustments = (body?.show_up_adjustments ?? []) as Array<{
            entry_id: string;
            manual_show_up_points_adj?: number | null;
            manual_show_up_pay_adj?: number | null;
        }>;

        if (!event_id || !class_id) {
            return NextResponse.json(
                { error: "event_id and class_id are required." },
                { status: 400 }
            );
        }

        if (!Array.isArray(adjustments)) {
            return NextResponse.json(
                { error: "adjustments must be an array." },
                { status: 400 }
            );
        }

        if (!Array.isArray(show_up_adjustments)) {
            return NextResponse.json(
                { error: "show_up_adjustments must be an array." },
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
        } else {
            const awardsMeta = await sql`
                SELECT
                    points_scheme_id,
                    pay_scheme_id
                FROM calculated_race_awards
                WHERE event_id = ${event_id}
                    AND class_id = ${class_id}
                LIMIT 1
            `;

            if (awardsMeta.length) {
                points_scheme_id = awardsMeta[0].points_scheme_id ?? null;
                pay_scheme_id = awardsMeta[0].pay_scheme_id ?? null;
            }
        }

        const [pointsScheme, payScheme] = await Promise.all([
            points_scheme_id ? loadSchemeWithBreakdowns(points_scheme_id) : Promise.resolve(null),
            pay_scheme_id ? loadSchemeWithBreakdowns(pay_scheme_id) : Promise.resolve(null),
        ]);

        const entries = await loadEntriesForEventClass(event_id, class_id);

        if (points_scheme_id && !pointsScheme) {
            return NextResponse.json(
                { error: "Points scheme not found." },
                { status: 404 }
            );
        }

        if (pay_scheme_id && !payScheme) {
            return NextResponse.json(
                { error: "Pay scheme not found." },
                { status: 404 }
            );
        }

        await sql`BEGIN`;

        try {
            for (const adjustment of adjustments) {
                if (!adjustment.award_id) continue;

                const manual_points_adj = Number(adjustment.manual_points_adj ?? 0);
                const manual_pay_adj = Number(adjustment.manual_pay_adj ?? 0);

                await sql`
                    UPDATE calculated_race_awards
                    SET
                        manual_points_adj = ${manual_points_adj},
                        manual_pay_adj = ${manual_pay_adj}
                    WHERE id = ${adjustment.award_id}
                        AND event_id = ${event_id}
                        AND class_id = ${class_id}
                `;
            }

            const showUpAdjustsByEntryId = new Map<string, { manual_show_up_points_adj: number; manual_show_up_pay_adj: number; }>();

            for (const adjustment of show_up_adjustments) {
                if (!adjustment.entry_id) continue;

                showUpAdjustsByEntryId.set(adjustment.entry_id, {
                    manual_show_up_points_adj: Number(adjustment.manual_show_up_points_adj ?? 0),
                    manual_show_up_pay_adj: Number(adjustment.manual_show_up_pay_adj ?? 0),
                });
            }

            const awardsToTotal = (await sql`
                SELECT
                    entry_id,
                    awarded_points,
                    manual_points_adj,
                    awarded_pay,
                    manual_pay_adj
                FROM calculated_race_awards
                WHERE event_id = ${event_id}
                    AND class_id = ${class_id}
            `) as Array<{
                entry_id: string;
                awarded_points: number | string | null;
                manual_points_adj: number | string | null;
                awarded_pay: number | string | null;
                manual_pay_adj: number | string | null;
            }>;
            
            const raceTotals = calcEventTotals(
                awardsToTotal.map((award) => ({
                    entry_id: award.entry_id,
                    awarded_points:
                        Number(award.awarded_points ?? 0) +
                        Number(award.manual_points_adj ?? 0),
                    awarded_pay:
                        Number(award.awarded_pay ?? 0) +
                        Number(award.manual_pay_adj ?? 0),
                })));

            const raceTotalsByEntryId = new Map(raceTotals.map((row) => [row.entry_id, row]));

            const totals = entries.map((entry) => {
                const raceTotal = raceTotalsByEntryId.get(entry.id);
                const existingShowUp = showUpAdjustsByEntryId.get(entry.id);

                const base_show_up_points = getShowUpPointsForEntry({
                    entry_id: entry.id,
                    entered_entry_ids: entries.map((e) => e.id),
                    pointsScheme,
                    points_blocked_by_entry_id: Object.fromEntries(
                        entries.map((e) => [e.id, Boolean(e.no_points)])
                    ),
                });

                const base_show_up_pay = 0;
                const manual_show_up_points_adj = existingShowUp?.manual_show_up_points_adj ?? 0;
                const manual_show_up_pay_adj = existingShowUp?.manual_show_up_pay_adj ?? 0;

                return {
                    entry_id: entry.id,
                    total_points: Number(raceTotal?.total_points ?? 0) + base_show_up_points + manual_show_up_points_adj,
                    total_pay: Number(raceTotal?.total_pay ?? 0) + base_show_up_pay + manual_show_up_pay_adj,
                    base_show_up_points,
                    base_show_up_pay,
                    manual_show_up_points_adj,
                    manual_show_up_pay_adj,
                };
            });

            await sql`
                DELETE FROM calculated_event_totals
                WHERE event_id = ${event_id}
                    AND class_id = ${class_id}
            `;

            for (const total of totals) {
                await sql`
                    INSERT INTO calculated_event_totals (
                        event_id,
                        class_id,
                        entry_id,
                        points_scheme_id,
                        pay_scheme_id,
                        total_points,
                        total_pay,
                        base_show_up_points,
                        base_show_up_pay,
                        manual_show_up_points_adj,
                        manual_show_up_pay_adj
                    )
                    VALUES (
                        ${event_id},
                        ${class_id},
                        ${total.entry_id},
                        ${points_scheme_id},
                        ${pay_scheme_id},
                        ${total.total_points},
                        ${total.total_pay},
                        ${total.base_show_up_points},
                        ${total.base_show_up_pay},
                        ${total.manual_show_up_points_adj},
                        ${total.manual_show_up_pay_adj}
                    )
                `;
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

            const totalsWithNames = await sql`
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

            await sql`COMMIT`;

            await rebuildSeasonStandingsForClass({ event_id, class_id });

            return NextResponse.json({
                success: true,
                event_id,
                class_id,
                points_scheme_id,
                pay_scheme_id,
                awards,
                totals: totalsWithNames,
            });
        } catch (error) {
            await sql`ROLLBACK`;
            throw error;
        }
    } catch (error) {
        console.error("PATCH /api/points-pay/calculate error:", error);
        return NextResponse.json(
            { error: "Failed to save manual adjustments." },
            { status: 500 }
        );
    }
}