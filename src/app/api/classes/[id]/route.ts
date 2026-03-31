import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const rows = await sql`
            SELECT id, name, created_at
            FROM classes
            WHERE id = ${id}
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
            SET name = ${name}
            WHERE id = ${id}
            RETURNING id, name, created_at
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