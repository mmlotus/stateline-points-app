import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { SchemeBreakdownRow, SchemeLine, SchemeSavePayload } from "@/types";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const scheme = await sql`
            SELECT * FROM schemes WHERE id = ${id}
        `;

        if (!scheme.length) {
            return NextResponse.json({ error: "Scheme not found." }, { status: 404 });
        }

        const breakdowns = (await sql`
            SELECT * FROM scheme_breakdowns
            WHERE scheme_id = ${id}
            ORDER BY type ASC
        `) as SchemeBreakdownRow[];

        const breakdownIds = breakdowns.map((b) => b.id);

        let lines: SchemeLine[] = [];
        if (breakdownIds.length) {
            lines = (await sql`
                SELECT *
                FROM scheme_lines
                WHERE breakdown_id = ANY(${breakdownIds})
                ORDER BY start_position ASC
            `) as SchemeLine[];
        }

        const breakdownsWithLines = breakdowns.map((b) => ({
            ...b,
            transfer_exclusion_races:
                typeof b.transfer_exclusion_races === "string"
                    ? JSON.parse(b.transfer_exclusion_races)
                    : b.transfer_exclusion_races ?? [],
            lines: lines.filter((l) => l.breakdown_id === b.id),
        }));

        return NextResponse.json({
            ...scheme[0],
            breakdowns: breakdownsWithLines,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch scheme" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = (await req.json()) as SchemeSavePayload;
        const {
            name,
            description,
            type,
            is_active,
            show_up_points_enabled,
            show_up_start_points,
            show_up_non_start_points,
            continuous_feature_points,
            pay_show_b_main,
            add_points_enabled,
            add_points_label,
            breakdowns,
        } = body;

        const aFeature = (breakdowns || []).find((x) => x.type === "a_feature");
        const aRm = aFeature?.result_modifiers ?? null;

        await sql`
            UPDATE schemes
            SET name = ${name},
                description = ${description},
                type = ${type},
                is_active = ${is_active},
                show_up_points_enabled = ${show_up_points_enabled},
                show_up_start_points = ${show_up_start_points},
                show_up_non_start_points = ${show_up_non_start_points},
                continuous_feature_points = ${continuous_feature_points},
                pay_show_b_main = ${pay_show_b_main ?? false},
                add_points_enabled = ${add_points_enabled ?? false},
                add_points_label = ${add_points_label},
                updated_at = NOW()
            WHERE id = ${id}
        `;

        await sql`DELETE FROM scheme_breakdowns WHERE scheme_id = ${id}`;

        for (const b of breakdowns) {
            const rmToUse =
                continuous_feature_points && aRm && (b.type === "b_feature" || b.type === "c_feature")
                    ? aRm
                    : b.result_modifiers;

            const inserted = await sql`
                INSERT INTO scheme_breakdowns(
                    scheme_id,
                    type,
                    exclude_show_up_points,
                    result_modifiers,
                    transfer_exclusions_enabled,
                    transfer_exclusion_races,
                    passing_points_enabled,
                    passing_points_gain_value,
                    passing_points_lost_value)
                VALUES (
                    ${id},
                    ${b.type},
                    ${b.exclude_show_up_points},
                    ${JSON.stringify(rmToUse)},
                    ${b.transfer_exclusions_enabled ?? false},
                    ${b.transfer_exclusion_races ?? []},
                    ${b.passing_points_enabled ?? false},
                    ${b.passing_points_gain_value ?? 0},
                    ${b.passing_points_lost_value ?? 0}
                )
                RETURNING id
            `;

            const breakdownId = inserted[0].id;

            for (const line of b.lines) {
                const isPlus = line.start_position.endsWith("+");
                const start = parseInt(line.start_position.replace("+", ""), 10);
                const end = isPlus ? null : start;

                await sql`
                INSERT INTO scheme_lines
                    (breakdown_id, start_position, end_position, value)
                VALUES (${breakdownId}, ${start}, ${end}, ${line.value})
            `;
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update scheme" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        await sql`
            DELETE FROM scheme_lines
            WHERE breakdown_id IN (
                SELECT id FROM scheme_breakdowns WHERE scheme_id = ${id}
            )
        `;

        await sql`
            DELETE FROM scheme_breakdowns
            WHERE scheme_id = ${id}
        `;

        const deleted = await sql`
            DELETE FROM schemes
            WHERE id = ${id}
            RETURNING id
        `;

        if (!deleted.length) {
            return NextResponse.json({ error: "Scheme not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to delete scheme." },
            { status: 500 }
        );
    }
}