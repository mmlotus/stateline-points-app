import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const seasonId = url.searchParams.get("season_id");

        if (!seasonId) {
            return NextResponse.json({ error: "season_id required" }, { status: 400 });
        }

        const events = await sql`
            SELECT
                e.id,
                e.season_id,
                e.event_date,
                e.name,
                e.status,
                e.notes,
                e.created_at,
                COALESCE(
                    ARRAY_AGG(c.name ORDER BY c.name)
                    FILTER (WHERE c.name IS NOT NULL),
                    ARRAY[]::text[]
                ) AS class_names
            FROM events e
            LEFT JOIN event_classes ec
                ON ec.event_id = e.id
            LEFT JOIN classes c
                ON c.id = ec.class_id
            WHERE e.season_id = ${seasonId}
            GROUP BY
                e.id,
                e.season_id,
                e.event_date,
                e.name,
                e.status,
                e.notes,
                e.created_at
            ORDER BY e.event_date ASC, e.created_at ASC
        `;

        return NextResponse.json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { season_id, event_date, name, status, notes, class_ids } = body ?? {};

        if (!season_id || !event_date || !name) {
            return NextResponse.json(
                { error: "season_id, event_date, and name are required" },
                { status: 400 }
            );
        }

        if (!Array.isArray(class_ids) || !class_ids.length) {
            return NextResponse.json(
                { error: "Please select at least one class." },
                { status: 400 }
            );
        }

        const safeStatus = (status && String(status).trim()) ? String(status).trim() : "scheduled";
        const safeNotes = (notes && String(notes).trim()) ? String(notes).trim() : null;

        const inserted = await sql`
            INSERT INTO events (
                season_id,
                event_date,
                name,
                status,
                notes,
                created_at
            )
            VALUES (
                ${season_id},
                ${event_date},
                ${name},
                ${safeStatus},
                ${safeNotes},
            NOW()
            )
            RETURNING id
        `;

        const eventId = inserted[0].id;

        for (const classId of class_ids) {
            await sql`
                INSERT INTO event_classes (
                    event_id,
                    class_id,
                    created_at
                )
                VALUES (
                    ${eventId},
                    ${classId},
                    NOW()
                )
            `;
        }

        return NextResponse.json({ id: eventId });
    } catch (error) {
        console.error("Error creating event:", error);
        return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
    }
}