import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { QuickAddEntryPayload } from "@/types";
import { hasErrorCode } from "@/lib/api-errors";

type RouteContext = {
    params: Promise<{ id: string }>;
};

async function driverHasClassConflict(
    season_id: string,
    class_id: string,
    driver_id: string
) {
    if (!driver_id) return false;

    const rows = await sql`
        SELECT id
        FROM season_class_cars
        WHERE season_id = ${season_id}
            AND class_id = ${class_id}
            AND (
                primary_driver_id = ${driver_id}
                OR co_driver_id = ${driver_id}
            )
        LIMIT 1
    `;

    return rows.length > 0;
}

async function validateQuickAddRules(args: {
    season_id: string;
    class_id: string;
    primary_driver_id?: string;
    co_driver_id?: string | null;
}) {
    const { season_id, class_id, primary_driver_id, co_driver_id } = args;

    if (primary_driver_id && co_driver_id && primary_driver_id === co_driver_id) {
        return "Primary driver and co-driver cannot be the same.";
    }

    if (primary_driver_id) {
        const primaryConflict = await driverHasClassConflict(
            season_id, class_id, primary_driver_id
        );

        if (primaryConflict) {
            return "This primary driver is already registered under another car in this class for this season.";
        }
    }

    if (co_driver_id) {
        const coConflict = await driverHasClassConflict(
            season_id, class_id, co_driver_id
        );

        if (coConflict) {
            return "This co-driver is already registered under another car in this class for this season.";
        }
    }

    return null;
}

async function eventCarNumExists(args: {
    event_id: string;
    class_id: string;
    car_number: string;
}) {
    const { event_id, class_id, car_number } = args;

    const rows = await sql`
        SELECT ee.id
        FROM event_entries ee
        INNER JOIN season_class_cars scc
            ON scc.id = ee.season_class_car_id
        WHERE ee.event_id = ${event_id}
            AND scc.class_id = ${class_id}
            AND COALESCE(ee.override_car_number, scc.car_number) = ${car_number}
        LIMIT 1
    `;

    return rows.length > 0;
}

export async function POST(req: Request, context: RouteContext) {
    try {
        const { id: eventId } = await context.params;

        const body = (await req.json()) as QuickAddEntryPayload;
        const {
            class_id,
            car_number,
            override_car_number,
            primary_driver_id,
            primary_driver_name,
            co_driver_id,
            is_active,
        } = body ?? {};

        const trimmedCarNumber = String(car_number || "").trim();
        const trimmedPrimaryDriverName = String(primary_driver_name || "").trim();

        const trimmedOverrideCarNum = String(override_car_number || "").trim();
        const normalizedOverrideCarNum = trimmedOverrideCarNum || null;

        if (!class_id || !trimmedCarNumber) {
            return NextResponse.json(
                { error: "class_id & car_number are required." },
                { status: 400 }
            );
        }

        if (!primary_driver_id && !trimmedPrimaryDriverName) {
            return NextResponse.json(
                { error: "Provide either primary_driver_id or primary_driver_name." },
                { status: 400 }
            );
        }

        if (primary_driver_id && trimmedPrimaryDriverName) {
            return NextResponse.json(
                { error: "Provide either primary_driver_id or primary_driver_name, not both." },
                { status: 400 }
            );
        }

        const eventRows = await sql`
            SELECT id, season_id
            FROM events
            WHERE id = ${eventId}
            LIMIT 1
        `;

        if (!eventRows.length) {
            return NextResponse.json(
                { error: "Event not found." },
                { status: 404 }
            );
        }

        const eventRow = eventRows[0];

        const eventClassRows = await sql`
            SELECT 1
            FROM event_classes
            WHERE event_id = ${eventId}
                AND class_id = ${class_id}
            LIMIT 1
        `;

        if (!eventClassRows.length) {
            return NextResponse.json(
                { error: "That class is not assigned to this event." },
                { status: 400 }
            );
        }

        if (primary_driver_id) {
            const primaryDriverRows = await sql`
                SELECT id
                FROM drivers
                WHERE id = ${primary_driver_id}
                LIMIT 1
            `;

            if (!primaryDriverRows.length) {
                return NextResponse.json(
                    { error: "Primary driver not found." },
                    { status: 404 }
                );
            }
        }

        if (co_driver_id) {
            const coDriverRows = await sql`
                SELECT id
                FROM drivers
                WHERE id = ${co_driver_id}
                LIMIT 1
            `;

            if (!coDriverRows.length) {
                return NextResponse.json(
                    { error: "Co-driver not found." },
                    { status: 404 }
                );
            }
        }

        const ruleError = await validateQuickAddRules({
            season_id: eventRow.season_id,
            class_id,
            primary_driver_id,
            co_driver_id,
        });

        if (ruleError) {
            return NextResponse.json({ error: ruleError }, { status: 400 });
        }

        const baseNumTaken = await eventCarNumExists({
            event_id: eventId,
            class_id,
            car_number: trimmedCarNumber,
        });

        if (baseNumTaken && !normalizedOverrideCarNum) {
            return NextResponse.json(
                {
                    error: `Car ${trimmedCarNumber} is already entered for this class for this event.
                    Enter a temp # for tonight only.` },
                { status: 409 }
            );
        }

        if (normalizedOverrideCarNum) {
            const overrideTaken = await eventCarNumExists({
                event_id: eventId,
                class_id,
                car_number: normalizedOverrideCarNum,
            });

            if (overrideTaken) {
                return NextResponse.json(
                    {
                        error: `Car ${normalizedOverrideCarNum} is already entered for this class for this event.
                        Choose a different temp #.` },
                    { status: 409 }
                );
            }
        }

        let result;

        if (primary_driver_id) {
            result = await sql`
            WITH inserted_season_class_car AS (
                INSERT INTO season_class_cars (
                    season_id,
                    class_id,
                    car_number,
                    primary_driver_id,
                    co_driver_id,
                    is_active
                )
                VALUES (
                    ${eventRow.season_id},
                    ${class_id},
                    ${trimmedCarNumber},
                    ${primary_driver_id},
                    ${co_driver_id || null},
                    ${typeof is_active === "boolean" ? is_active : true}
                )
                RETURNING *
            ),
            inserted_event_entry AS (
                INSERT INTO event_entries (
                    event_id,
                    season_class_car_id,
                    override_car_number
                )
                SELECT
                    ${eventId},
                    id,
                    ${normalizedOverrideCarNum}
                FROM inserted_season_class_car
                RETURNING *
            )   
            SELECT
                row_to_json(inserted_season_class_car) AS season_class_car,
                row_to_json(inserted_event_entry) AS event_entry
            FROM inserted_season_class_car, inserted_event_entry
        `;
        } else {
            result = await sql`
            WITH inserted_driver AS (
                INSERT INTO drivers (
                    name,
                    default_car
                )
                VALUES (
                    ${trimmedPrimaryDriverName},
                    ${trimmedCarNumber}
                )
                RETURNING *
            ),
            inserted_season_class_car AS (
                INSERT INTO season_class_cars (
                    season_id,
                    class_id,
                    car_number,
                    primary_driver_id,
                    co_driver_id,
                    is_active
                )
                SELECT
                    ${eventRow.season_id},
                    ${class_id},
                    ${trimmedCarNumber},
                    inserted_driver.id,
                    ${co_driver_id || null},
                    ${typeof is_active === "boolean" ? is_active : true}
                FROM inserted_driver
                RETURNING *
            ),
            inserted_event_entry AS (
                INSERT INTO event_entries (
                    event_id,
                    season_class_car_id,
                    override_car_number
                )
                SELECT
                    ${eventId},
                    id,
                    ${normalizedOverrideCarNum}
                FROM inserted_season_class_car
                RETURNING *
            )
            SELECT
                row_to_json(inserted_driver) AS driver,
                row_to_json(inserted_season_class_car) AS season_class_car,
                row_to_json(inserted_event_entry) AS event_entry
            FROM inserted_driver, inserted_season_class_car, inserted_event_entry
        `;
        }

        return NextResponse.json({
            ...result[0],
            override_car_number: normalizedOverrideCarNum,
        },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("POST /api/events/[id]/quick-add-entry error:", error);

        if (hasErrorCode(error) && error.code === "23505") {
            return NextResponse.json(
                { error: "A duplicate registration or entry was attempted." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Failed to quick add entry." },
            { status: 500 }
        );
    }
}