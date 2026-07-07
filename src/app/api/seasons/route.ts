import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const withPoints = url.searchParams.get("with_points") === "true";

        const seasons = withPoints
            ? await sql`
                SELECT DISTINCT
                    s.id, s.year, s.name, s.is_active, s.created_at
                FROM seasons s
                WHERE EXISTS (
                    SELECT 1
                    FROM season_championship_standings scs
                    WHERE scs.season_id = s.id
                        AND (
                            scs.total_points > 0
                            OR scs.events_count > 0
                        )
                )
                ORDER BY s.year DESC, s.created_at DESC
            `
            : await sql`
                SELECT id, year, name, is_active, created_at
                FROM seasons
                ORDER BY year DESC, created_at DESC
            `;

        return NextResponse.json(seasons);
    } catch (err) {
        console.error("GET /api/season error:", err);
        return NextResponse.json({ error: "Failed to load seasons" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { year, name } = body;

        if (!year || !name) {
            return NextResponse.json({ error: "Year and name are required" }, { status: 400 });
        }

        const existing = await sql`SELECT id FROM seasons WHERE year = ${year} LIMIT 1`;

        if (existing.length > 0) {
            return NextResponse.json({ error: `Season for ${year} already exists.` }, { status: 400 });
        }


        const inserted = await sql`
        INSERT INTO seasons (name, year, is_active)
        VALUES (${name}, ${year}, false)
        RETURNING id
    `;

        return NextResponse.json({ id: inserted[0].id });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create season" }, { status: 500 });
    }
}