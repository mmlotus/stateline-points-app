import { NextResponse } from "next/server";
import sql from "@/lib/db";

type TagRow = {
    id: string;
    name: string;
    created_at: string;
};

function normalizeTagNames(values: unknown): string[] {
    if (!Array.isArray(values)) return [];

    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const trimmed = String(value || "").trim();
        if (!trimmed) continue;

        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;

        seen.add(key);
        result.push(trimmed);
    }

    return result;
}

function normalizeTagIds(values: unknown): string[] {
    if (!Array.isArray(values)) return [];

    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const trimmed = String(value || "").trim();
        if (!trimmed) continue;
        if (seen.has(trimmed)) continue;

        seen.add(trimmed);
        result.push(trimmed);
    }

    return result;
}

async function getDriverById(driverId: string) {
    const rows = await sql`
        SELECT
            d.id,
            d.name,
            d.default_car,
            d.is_active,
            d.created_at,
            COALESCE(
                json_agg(
                    DISTINCT jsonb_build_object(
                        'id', t.id,
                        'name', t.name,
                        'created_at', t.created_at
                    )
                ) FILTER (WHERE t.id IS NOT NULL),
                 '[]'::json
            ) AS tags
        FROM drivers d
        LEFT JOIN drivers_tags dt
            ON dt.driver_id = d.id
        LEFT JOIN tags t
            ON t.id = dt.tag_id
        WHERE d.id = ${driverId}
        GROUP BY d.id, d.name, d.default_car, d.is_active, d.created_at
        LIMIT 1
    `;

    return rows[0] || null;
}

export async function GET() {
    try {
        const drivers = await sql`
            SELECT
                d.id,
                d.name,
                d.default_car,
                d.is_active,
                d.created_at,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', t.id,
                            'name', t.name,
                            'created_at', t.created_at
                        )
                    ) FILTER (WHERE t.id IS NOT NULL),
                     '[]'::json
                ) AS tags
            FROM drivers d
            LEFT JOIN drivers_tags dt
                ON dt.driver_id = d.id
            LEFT JOIN tags t
                ON t.id = dt.tag_id
            GROUP BY d.id, d.name, d.default_car, d.is_active, d.created_at
            ORDER BY d.name
        `;

        return NextResponse.json(drivers, { status: 200 });
    } catch (error) {
        console.error("GET /api/drivers error:", error);
        return NextResponse.json(
            { error: "Failed to fetch drivers." },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const name = body?.name?.trim();
        const default_car = body?.default_car?.trim() || null;
        const is_active = typeof body?.is_active === "boolean" ? body.is_active : true;
        const tag_ids = normalizeTagIds(body?.tag_ids);
        const new_tags = normalizeTagNames(body?.new_tags);

        if (!name) {
            return NextResponse.json(
                { error: "name is required" },
                { status: 400 }
            );
        }

        const duplicate = await sql`
            SELECT id
            FROM drivers
            WHERE LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

        if (duplicate.length) {
            return NextResponse.json(
                { error: "A driver with that name already exists." },
                { status: 409 }
            );
        }

        const resolvedTagIds: string[] = [...tag_ids];

        if (tag_ids.length) {
            const existingTags = await sql`
                SELECT id
                FROM tags
                WHERE id = ANY(${tag_ids})
            `;

            if (existingTags.length !== tag_ids.length) {
                return NextResponse.json(
                    { error: "One or more selected tags were not found." },
                    { status: 400 }
                );
            }
        }

        for (const tagName of new_tags) {
            const existing = (await sql`
                SELECT id, name, created_at
                FROM tags
                WHERE LOWER(name) = LOWER(${tagName})
                LIMIT 1
            `) as TagRow[];

            if (existing.length) {
                if (!resolvedTagIds.includes(existing[0].id)) {
                    resolvedTagIds.push(existing[0].id);
                }
                continue;
            }

            const insertedTag = (await sql`
                INSERT INTO tags (name)
                VALUES (${tagName})
                RETURNING id, name, created_at
            `) as TagRow[];

            if (insertedTag[0] && !resolvedTagIds.includes(insertedTag[0].id)) {
                resolvedTagIds.push(insertedTag[0].id);
            }
        }

        const inserted = await sql`
            INSERT INTO drivers (name, default_car, is_active)
            VALUES (${name}, ${default_car}, ${is_active})
            RETURNING id
        `;

        const driverId = inserted[0]?.id;

        if (!driverId) {
            return NextResponse.json(
                { error: "Failed to create driver." },
                { status: 500 }
            );
        }

        for (const tagId of resolvedTagIds) {
            await sql`
                INSERT INTO drivers_tags (driver_id, tag_id)
                VALUES (${driverId}, ${tagId})
                ON CONFLICT (driver_id, tag_id) DO NOTHING
            `;
        }

        const createdDriver = await getDriverById(driverId);

        return NextResponse.json(createdDriver, { status: 201 });
    } catch (error) {
        console.error("POST /api/drivers error:", error);
        return NextResponse.json(
            { error: "Failed to create driver." },
            { status: 500 }
        );
    }
}