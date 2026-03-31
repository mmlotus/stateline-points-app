import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { DriverUpdatePayload } from "@/types";

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

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const driver = await getDriverById(id);

        if (!driver) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }

        return NextResponse.json(driver, { status: 200 });
    } catch (error) {
        console.error("GET /api/drivers/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch driver." },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = (await req.json()) as DriverUpdatePayload;

        const name = body?.name?.trim();
        const default_car = body?.default_car?.trim() || null;
        const is_active = typeof body?.is_active === "boolean" ? body.is_active : true;
        const tag_ids = normalizeTagIds(body?.tag_ids);
        const new_tags = normalizeTagNames(body?.new_tags);

        if (!name) {
            return NextResponse.json({ error: "Driver name is required" }, { status: 400 });
        }

        const duplicate = await sql`
            SELECT id
            FROM drivers
            WHERE LOWER(name) = LOWER(${name})
                AND id <> ${id}
            LIMIT 1
        `;

        if (duplicate.length) {
            return NextResponse.json(
                { error: "A driver with that name already exists." },
                { status: 409 }
            );
        }

        const existing = await sql`
            SELECT id
            FROM drivers
            WHERE id = ${id}
            LIMIT 1
        `;

        if (!existing.length) {
            return NextResponse.json(
                { error: "Driver not found." },
                { status: 404 }
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

        await sql`
            UPDATE drivers
            SET
                name = ${name},
                default_car = ${default_car},
                is_active = ${is_active}
            WHERE id = ${id}
        `;

        await sql`
            DELETE FROM drivers_tags
            WHERE driver_id = ${id}
        `;

        for (const tagId of resolvedTagIds) {
            await sql`
                INSERT INTO drivers_tags (driver_id, tag_id)
                VALUES (${id}, ${tagId})
                ON CONFLICT (driver_id, tag_id) DO NOTHING
            `;
        }

        const updatedDriver = await getDriverById(id);

        return NextResponse.json(updatedDriver, { status: 200 });
    } catch (error) {
        console.error("PATCH /api/drivers/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update driver." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        await sql`
            DELETE FROM drivers WHERE id = ${id}
        `;
        return new NextResponse(null, { status: 204 });
    } catch (err) {
        console.error("DELETE /api/drivers/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete driver." }, { status: 500 });
    }
}