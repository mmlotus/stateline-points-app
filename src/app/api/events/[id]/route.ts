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
                e.id,
                e.season_id,
                e.event_date,
                e.name,
                e.status,
                e.notes,
                e.created_at,
                COALESCE(
                    ARRAY_AGG(ec.class_id) FILTER (WHERE ec.class_id IS NOT NULL),
                    ARRAY[]::uuid[]
                ) AS class_ids
            FROM events e
            LEFT JOIN event_classes ec
                ON ec.event_id = e.id
            WHERE e.id = ${id}
            GROUP BY
                e.id,
                e.season_id,
                e.event_date,
                e.name,
                e.status,
                e.notes,
                e.created_at
        `;

        if (!rows.length) {
            return NextResponse.json(
                { error: "Event not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(rows[0], { status: 200 });
    } catch (error) {
        console.error("GET /api/events/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to load event" },
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
        const { event_date, name, status, notes, class_ids } = body ?? {};

        if (!event_date || !name) {
            return NextResponse.json({ error: "event_date and name are required" }, { status: 400 });
        }

        if (!Array.isArray(class_ids) || !class_ids.length) {
            return NextResponse.json(
                { error: "Please select at least one class." },
                { status: 400 }
            );
        }

        const safeStatus = (status && String(status).trim()) ? String(status).trim() : "scheduled";
        const safeNotes = (notes && String(notes).trim()) ? String(notes).trim() : null;

        await sql`
            UPDATE events
            SET event_date = ${event_date},
                name = ${name},
                status = ${safeStatus},
                notes = ${safeNotes}
            WHERE id = ${id}
        `;

        await sql`
            DELETE FROM event_classes
            WHERE event_id = ${id}
        `;

        for (const classId of class_ids) {
            await sql`
                INSERT INTO event_classes (
                    event_id,
                    class_id,
                    created_at
                )
                VALUES (
                    ${id},
                    ${classId},
                    NOW()
                )
            `;
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("PATCH /api/events/[id] error:", err);
        return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await sql`
            DELETE FROM events WHERE id = ${id}
        `;
        return new NextResponse(null, { status: 204 });
    } catch (err) {
        console.error("DELETE /api/events/[id] error:", err);
        return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
    }
}