import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { SchemeSavePayload } from "@/types";

export async function GET() {
  try {
    const schemes = await sql`
            SELECT id, name, description, type, is_active, created_at, updated_at
            FROM schemes
            ORDER BY created_at DESC
        `;

    return NextResponse.json(schemes);
  } catch (error) {
    console.error("Error fetching schemes:", error);
    return NextResponse.json(
      { error: "Failed to fetch schemes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const inserted = await sql`
      INSERT INTO schemes
        (name, description, type, is_active,
        show_up_points_enabled,
        show_up_start_points,
        show_up_non_start_points,
        continuous_feature_points,
        pay_show_b_main,
        add_points_enabled,
        add_points_label
        )
      VALUES (
          ${name},
          ${description},
          ${type},
          ${is_active},
          ${show_up_points_enabled},
          ${show_up_start_points},
          ${show_up_non_start_points},
          ${continuous_feature_points},
          ${pay_show_b_main ?? false},
          ${add_points_enabled ?? false},
          ${add_points_label ?? ""}
        )
      RETURNING id
    `;

    const schemeId = inserted[0].id;

    for (const b of breakdowns) {
      const rmToUse =
        continuous_feature_points && aRm && (b.type === "b_feature" || b.type === "c_feature")
          ? aRm
          : b.result_modifiers;

      const created = await sql`
        INSERT INTO scheme_breakdowns (
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
          ${schemeId},
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

      const breakdownId = created[0].id;

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

    return NextResponse.json({ id: schemeId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create scheme" }, { status: 500 });
  }
}