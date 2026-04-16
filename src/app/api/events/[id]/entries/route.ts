import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { EventEntryCreatePayload, EventEntryUpdatePayload } from "@/types";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
        }

        const rows = await sql`
            SELECT
                ee.id,
                ee.event_id,
                ee.season_class_car_id,
                ee.override_car_number,
                ee.co_driver_drove,
                ee.no_points,
                ee.no_pay,
                ee.pay_to_other,
                ee.pay_to_name,
                ee.notes,
                ee.created_at,
                ee.updated_at,

                scc.season_id,
                scc.class_id,
                c.name AS class_name,
                scc.car_number AS registration_car_number,
                COALESCE(ee.override_car_number, scc.car_number) AS car_number,
                scc.primary_driver_id,
                pd.name AS primary_driver_name,
                scc.co_driver_id,
                cd.name AS co_driver_name,
                scc.is_active

            FROM event_entries ee
            INNER JOIN season_class_cars scc
                ON scc.id = ee.season_class_car_id
            INNER JOIN classes c
                ON c.id = scc.class_id
            INNER JOIN drivers pd
                ON pd.id = scc.primary_driver_id
            LEFT JOIN drivers cd
                ON cd.id = scc.co_driver_id
            WHERE ee.event_id = ${eventId}
            ORDER BY c.name ASC, ee.created_at ASC, pd.name ASC
        `;

        return NextResponse.json(rows);
    } catch (error) {
        console.error("GET /api/events/[id]/entries error:", error);
        return NextResponse.json({ error: "Failed to fetch event entries" }, { status: 500 });
    }
}

export async function POST(req: Request, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;
        const body = (await req.json()) as EventEntryCreatePayload;
        const { season_class_car_id, override_car_number, co_driver_drove } = body ?? {};

        const trimmedOverrideCarNumber = String(override_car_number || "").trim();
        const normalizedOverrideCarNumber = trimmedOverrideCarNumber || null;
        const normalizedCoDriverDrove = Boolean(co_driver_drove);

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
        }

        if (!season_class_car_id) {
            return NextResponse.json(
                { error: "season_class_car_id is required" },
                { status: 400 }
            );
        }

        const eventRows = await sql`
            SELECT id, season_id
            FROM events
            WHERE id = ${eventId}
            LIMIT 1
       `;

        if (eventRows.length === 0) {
            return NextResponse.json({ error: "Event not found." }, { status: 404 });
        }

        const eventRow = eventRows[0];

        const sccRows = await sql`
            SELECT id, season_id, class_id, car_number, is_active
            FROM season_class_cars
            WHERE id = ${season_class_car_id}
            LIMIT 1
        `;

        if (sccRows.length === 0) {
            return NextResponse.json({ error: "Season class car not found." }, { status: 404 });
        }

        const scc = sccRows[0];

        if (scc.season_id !== eventRow.season_id) {
            return NextResponse.json(
                { error: "This registration does not belong to the same season as the event" },
                { status: 400 }
            );
        }

        const eventClassRows = await sql`
            SELECT 1
            FROM event_classes
            WHERE event_id = ${eventId}
                AND class_id = ${scc.class_id}
            LIMIT 1
        `;

        if (eventClassRows.length === 0) {
            return NextResponse.json(
                { error: "That car's class is not assigned to this event." },
                { status: 400 }
            );
        }

        const effectiveCarNumber = normalizedOverrideCarNumber || scc.car_number;

        const duplicateNumberRows = await sql`
            SELECT ee.id
            FROM event_entries ee
            INNER JOIN season_class_cars existing_scc
                ON existing_scc.id = ee.season_class_car_id
            WHERE ee.event_id = ${eventId}
                AND existing_scc.class_id = ${scc.class_id}
                AND COALESCE(ee.override_car_number, existing_scc.car_number) = ${effectiveCarNumber}
            LIMIT 1
        `;

        if (duplicateNumberRows.length > 0) {
            return NextResponse.json(
                {
                    error: `That car # is already being used in this class for this event.
                    Enter a different car # for tonight only.` },
                { status: 409 }
            );
        }

        const inserted = await sql`
            INSERT INTO event_entries (
                event_id,
                season_class_car_id,
                override_car_number,
                co_driver_drove
            )
            VALUES (
                ${eventId},
                ${season_class_car_id},
                ${normalizedOverrideCarNumber},
                ${normalizedCoDriverDrove}
            )
            ON CONFLICT (event_id, season_class_car_id) DO NOTHING
            RETURNING *
        `;

        if (inserted.length === 0) {
            return NextResponse.json(
                { error: "This car is already entered for the event" },
                { status: 409 }
            );
        }

        return NextResponse.json(inserted[0], { status: 201 });
    } catch (error) {
        console.error("POST /api/events/[id]/entries error:", error);
        return NextResponse.json({ error: "Failed to create event entry" }, { status: 500 });
    }
}

export async function PATCH(req: Request, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;
        const url = new URL(req.url);
        const entryId = url.searchParams.get("entry_id");

        const body = (await req.json()) as EventEntryUpdatePayload;
        const { co_driver_drove, no_points, no_pay, pay_to_other, pay_to_name, notes } = body ?? {};

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required." }, { status: 400 });
        }

        if (!entryId) {
            return NextResponse.json({ error: "entry_id is required." }, { status: 400 });
        }

        const existingRows = await sql`
            SELECT id
            FROM event_entries
            WHERE id = ${entryId}
                AND event_id = ${eventId}
            LIMIT 1
        `;

        if (!existingRows.length) {
            return NextResponse.json(
                { error: "Event entry not found." },
                { status: 404 }
            );
        }

        const updated = await sql`
            UPDATE event_entries
            SET
                co_driver_drove = COALESCE(${co_driver_drove}, co_driver_drove),
                no_points = COALESCE(${no_points}, no_points),
                no_pay = COALESCE(${no_pay}, no_pay),
                pay_to_other = COALESCE(${pay_to_other}, pay_to_other),
                pay_to_name = COALESCE(${pay_to_name}, pay_to_name),
                notes = COALESCE(${notes}, notes),
                updated_at = now()
            WHERE id = ${entryId}
                AND event_id = ${eventId}
            RETURNING *
        `;

        return NextResponse.json(updated[0], { status: 200 });
    } catch (error) {
        console.error("PATCH /api/events/[id]/entries error:", error);
        return NextResponse.json(
            { error: "Failed to update event entry." },
            { status: 500 }
        );
    }
}