import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const rows = await sql`
            SELECT
                c.id,
                c.name,
                c.created_at,
                c.default_points_scheme_id,
                c.default_pay_scheme_id,
                ps.name AS default_points_scheme_name,
                pay.name AS default_pay_scheme_name
            FROM classes c
            LEFT JOIN schemes ps
                ON ps.id = c.default_points_scheme_id
            LEFT JOIN schemes pay
                ON pay.id = c.default_pay_scheme_id
            WHERE c.id = ${id}
            LIMIT 1
        `;

        if (!rows.length) {
            return NextResponse.json(
                { error: "Class not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(rows[0], { status: 200 });
    } catch (error) {
        console.error("GET /api/classes/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch class." },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await req.json();

        const name = body?.name?.trim();
        const default_points_scheme_id = body?.default_points_scheme_id || null;
        const default_pay_scheme_id = body?.default_pay_scheme_id || null;

        if (!name) {
            return NextResponse.json({ error: "Class name is required" }, { status: 400 });
        }

        const existing = await sql`
            SELECT id
            FROM classes
            WHERE id = ${id}
            LIMIT 1
        `;

        if (!existing.length) {
            return NextResponse.json(
                { error: "Class not found." },
                { status: 404 }
            );
        }

        const duplicate = await sql`
            SELECT id
            FROM classes
            WHERE LOWER(name) = LOWER(${name})
                AND id <> ${id}
            LIMIT 1
        `;

        if (duplicate.length) {
            return NextResponse.json(
                { error: "A class with that name already exists." },
                { status: 409 }
            );
        }

        const updated = await sql`
            UPDATE classes
            SET
                name = ${name},
                default_points_scheme_id = ${default_points_scheme_id},
                default_pay_scheme_id = ${default_pay_scheme_id}
            WHERE id = ${id}
            RETURNING id, name, created_at, default_points_scheme_id, default_pay_scheme_id
        `;

        return NextResponse.json(updated[0], { status: 200 });
    } catch (error) {
        console.error("PATCH /api/classes/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update class." },
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
            DELETE FROM classes WHERE id = ${id}
        `;
        return new NextResponse(null, { status: 204 });
    } catch (err) {
        console.error("DELETE /api/classes/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
    }
}