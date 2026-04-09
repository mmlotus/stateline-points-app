import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { SchemeBreakdownRow } from "@/types";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // Load the original scheme
        const schemeRows = await sql`
            SELECT * FROM schemes WHERE id = ${id} LIMIT 1
        `;
        const scheme = schemeRows?.[0];

        if (!scheme) {
            return NextResponse.json({ error: "Scheme not found." }, { status: 404 });
        }

        // Create the new scheme (copy)
        const newName = `${scheme.name} (copy)`;

        const inserted = await sql`
            INSERT INTO schemes (
                name,
                type,
                is_active,
                show_up_points_enabled,
                show_up_start_points,
                show_up_non_start_points,
                continuous_feature_points,
                pay_show_b_main,
                add_points_enabled,
                add_points_label
            )
            VALUES (
                ${newName},
                ${scheme.type},
                ${scheme.is_active},
                ${scheme.show_up_points_enabled},
                ${scheme.show_up_start_points},
                ${scheme.show_up_non_start_points},
                ${scheme.continuous_feature_points},
                ${scheme.pay_show_b_main ?? false},
                ${scheme.add_points_enabled ?? false},
                ${scheme.add_points_label}
            )
            RETURNING id
        `;

        const newSchemeId = inserted[0].id;

        // Copy breakdowns and lines
        const breakdowns = (await sql`
            SELECT * FROM scheme_breakdowns
            WHERE scheme_id = ${id}
            ORDER BY type ASC
        `) as SchemeBreakdownRow[];

        const aRow = breakdowns.find((x) => x.type === "a_feature");

        const aRm =
            aRow ? (typeof aRow.result_modifiers === "string"
                ? aRow.result_modifiers
                : JSON.stringify(aRow.result_modifiers))
                : null;

        for (const b of breakdowns) {
            const rmRaw =
                typeof b.result_modifiers === "string"
                    ? b.result_modifiers
                    : JSON.stringify(b.result_modifiers);

            const rmToUse =
                scheme.continuous_feature_points && aRm &&
                    (b.type === "b_feature" || b.type === "c_feature" || b.type === "d_feature")
                    ? aRm : rmRaw;

            const createdBreakdown = await sql`
                INSERT INTO scheme_breakdowns (
                    scheme_id,
                    type,
                    exclude_show_up_points,
                    result_modifiers,
                    transfer_exclusions_enabled,
                    transfer_exclusion_races,
                    passing_points_enabled,
                    passing_points_gain_value,
                    passing_points_lost_value
                )
                VALUES (
                    ${newSchemeId},
                    ${b.type},
                    ${b.exclude_show_up_points},
                    ${rmToUse}::jsonb,
                    ${b.transfer_exclusions_enabled ?? false},
                    ${b.transfer_exclusion_races ?? []},
                    ${b.passing_points_enabled ?? false},
                    ${b.passing_points_gain_value ?? 0},
                    ${b.passing_points_lost_value ?? 0}
                )
                RETURNING id
            `;

            const newBreakdownId = createdBreakdown[0].id;

            const lines = await sql`
                SELECT * FROM scheme_lines
                WHERE breakdown_id = ${b.id}
                ORDER BY start_position ASC
            `;

            for (const line of lines) {
                await sql`
                    INSERT INTO scheme_lines (
                        breakdown_id,
                        start_position,
                        end_position,
                        value
                    )
                    VALUES (
                        ${newBreakdownId},
                        ${line.start_position},
                        ${line.end_position},
                        ${line.value}
                    )
                `;
            }
        }

        return NextResponse.json({ id: newSchemeId });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to duplicate scheme" },
            { status: 500 }
        );
    }
}