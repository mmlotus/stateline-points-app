import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { ResultInput, ResultsSavePayload } from "@/types";
import { markEventComplete } from "@/lib/syncEventStatus";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const race_id = url.searchParams.get("race_id");

        if (!race_id) {
            return NextResponse.json({ error: "race_id is required" }, { status: 400 });
        }

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
                ee.co_driver_drove,
                ee.no_points,
                ee.no_pay,
                ee.pay_to_other,
                ee.pay_to_name,

                scc.season_id,
                scc.class_id,
                c.name AS class_name,
                scc.car_number AS registration_car_number,
                COALESCE(ee.override_car_number, scc.car_number) AS car_number,
                scc.primary_driver_id,
                pd.name AS primary_driver_name,
                scc.co_driver_id,
                cd.name AS co_driver_name,
                scc.is_active

            FROM results r
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
            WHERE r.race_id = ${race_id}
            ORDER BY
                r.finish_position ASC NULLS LAST,
                r.created_at ASC
        `;

        return NextResponse.json(rows);
    } catch (error) {
        console.error("GET /api/results error:", error);
        return NextResponse.json(
            { error: "Failed to fetch results." },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const url = new URL(req.url);
        const race_id = url.searchParams.get("race_id");

        if (!race_id) {
            return NextResponse.json({ error: "race_id is required" }, { status: 400 });
        }

        const body = (await req.json()) as ResultsSavePayload;
        const results = Array.isArray(body?.results) ? body.results : [];

        const normalResults = results.filter((row) => !row.dns && !row.dq);
        const dnsResults = results.filter((row) => row.dns && !row.dq);
        const dqResults = results.filter((row) => row.dq);

        const orderedResults = [...normalResults, ...dnsResults, ...dqResults];

        const raceRows = await sql`
            SELECT
                ra.id,
                rg.event_class_id,
                ec.event_id,
                ec.class_id
            FROM races ra
            INNER JOIN race_groups rg
                ON rg.id = ra.race_group_id
            INNER JOIN event_classes ec
                ON ec.id = rg.event_class_id
            WHERE ra.id = ${race_id}
            LIMIT 1
        `;

        if (!raceRows.length) {
            return NextResponse.json({ error: "Race not found." }, { status: 404 });
        }

        const raceRow = raceRows[0];

        if (orderedResults.length > 0) {
            const entryIds = results.map((row) => row.entry_id);

            const validEntries = await sql`
                SELECT
                    ee.id,
                    scc.class_id
                FROM event_entries ee
                INNER JOIN season_class_cars scc
                    ON scc.id = ee.season_class_car_id
                WHERE ee.event_id = ${raceRow.event_id}
                    AND ee.id = ANY(${entryIds})
            `;

            if (validEntries.length !== entryIds.length) {
                return NextResponse.json(
                    { error: "One or more entries are invalid for this event." },
                    { status: 400 }
                );
            }

            const invalidClassEntry = validEntries.find((entry) => entry.class_id !== raceRow.class_id);
            if (invalidClassEntry) {
                return NextResponse.json(
                    { error: "One or more entries do not belong to this class." },
                    { status: 400 }
                );
            }
        }

        await sql`BEGIN`;

        try {
            const incomingEntryIds = orderedResults.map((row) => row.entry_id);

            if (incomingEntryIds.length > 0) {
                await sql`
                    DELETE FROM results
                    WHERE race_id = ${race_id}
                        AND NOT (entry_id = ANY(${incomingEntryIds}))
                `;
            } else {
                await sql`
                    DELETE FROM results
                    WHERE race_id = ${race_id}
                `;
            }

            for (let i = 0; i < orderedResults.length; i += 1) {
                const row: ResultInput = orderedResults[i];

                await sql`
                    INSERT INTO results (
                        race_id, entry_id, finish_position, dns, dnf, dq, bf, transferred, add_points_value, notes
                    )
                    VALUES (
                        ${race_id}, ${row.entry_id}, ${i + 1},
                        ${row.dns ?? false},
                        ${row.dnf ?? false},
                        ${row.dq ?? false},
                        ${row.bf ?? false},
                        ${row.transferred ?? false},
                        ${row.add_points_value ?? 0},
                        ${row.notes ?? null}
                    )
                    ON CONFLICT (race_id, entry_id)
                    DO UPDATE SET
                        finish_position = EXCLUDED.finish_position,
                        dns = EXCLUDED.dns,
                        dnf = EXCLUDED.dnf,
                        dq = EXCLUDED.dq,
                        bf = EXCLUDED.bf,
                        transferred = EXCLUDED.transferred,
                        add_points_value = EXCLUDED.add_points_value,
                        notes = EXCLUDED.notes
                `;
            }

            await sql`
                UPDATE races
                SET status = 'completed'
                WHERE id = ${race_id}
            `;

            await markEventComplete(raceRow.event_id);

            const savedRows = await sql`
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
                    scc.is_active

                FROM results r
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
                WHERE r.race_id = ${race_id}
                ORDER BY
                    r.finish_position ASC NULLS LAST,
                    r.created_at ASC
            `;

            await sql`COMMIT`;
            return NextResponse.json(savedRows);
        } catch (error) {
            await sql`ROLLBACK`;
            throw error;
        }
    } catch (error) {
        console.error("PUT /api/results error:", error);
        return NextResponse.json(
            { error: "Failed to save results." },
            { status: 500 }
        );
    }
}