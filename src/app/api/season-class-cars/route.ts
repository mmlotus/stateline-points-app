import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { isRookieStatus, SeasonClassCarCreatePayload, SeasonClassCarUpdatePayload } from "@/types";
import { hasErrorCode } from "@/lib/api-errors";

async function driverHasClassConflict(
    season_id: string,
    class_id: string,
    driver_id: string,
    exclude_id?: string
) {
    if (!driver_id) return false;

    let rows;

    if (exclude_id) {
        rows = await sql`
            SELECT id
            FROM season_class_cars
            WHERE season_id = ${season_id}
                AND class_id = ${class_id}
                AND id <> ${exclude_id}
                AND (
                    primary_driver_id = ${driver_id}
                    OR co_driver_id = ${driver_id}
                )
            LIMIT 1
        `;
    } else {
        rows = await sql`
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
    }

    return rows.length > 0;
}

async function validateSeasonClassCarRules(args: {
    season_id: string;
    class_id: string;
    primary_driver_id: string;
    co_driver_id?: string | null;
    exclude_id?: string;
}) {
    const {
        season_id,
        class_id,
        primary_driver_id,
        co_driver_id,
        exclude_id,
    } = args;

    if (co_driver_id && co_driver_id === primary_driver_id) {
        return "Primary driver & co-driver cannot be the same.";
    }

    const primaryConflict = await driverHasClassConflict(
        season_id, class_id, primary_driver_id, exclude_id
    );

    if (primaryConflict) {
        return "This primary driver is already assigned under another car in this class for this season.";
    }

    if (co_driver_id) {
        const coConflict = await driverHasClassConflict(
            season_id, class_id, co_driver_id, exclude_id
        );

        if (coConflict) {
            return "This co-driver is already registered under another car in this class for this season.";
        }
    }

    return null;
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const season_id = url.searchParams.get("season_id");
        const class_id = url.searchParams.get("class_id");

        if (!season_id) {
            return NextResponse.json(
                { error: "season_id is required." },
                { status: 400 }
            );
        }

        let rows;

        if (class_id) {
            rows = await sql`
                SELECT
                    scc.id,
                    scc.season_id,
                    scc.class_id,
                    c.class_sponsor,
                    c.name AS class_name,
                    scc.car_number,
                    scc.primary_driver_id,
                    pd.name AS primary_driver_name,
                    scc.co_driver_id,
                    cd.name AS co_driver_name,
                    scc.is_active,
                    scc.rookie_status,
                    scc.created_at,
                    scc.updated_at
                FROM season_class_cars scc
                INNER JOIN classes c
                    ON c.id = scc.class_id
                INNER JOIN drivers pd
                    ON pd.id = scc.primary_driver_id
                LEFT JOIN drivers cd
                    ON cd.id = scc.co_driver_id
                WHERE scc.season_id = ${season_id}
                    AND scc.class_id = ${class_id}
                ORDER BY c.name ASC, scc.car_number ASC, pd.name ASC
            `;
        } else {
            rows = await sql`
                SELECT
                    scc.id,
                    scc.season_id,
                    scc.class_id,
                    c.class_sponsor,
                    c.name AS class_name,
                    scc.car_number,
                    scc.primary_driver_id,
                    pd.name AS primary_driver_name,
                    scc.co_driver_id,
                    cd.name AS co_driver_name,
                    scc.is_active,
                    scc.rookie_status,
                    scc.created_at,
                    scc.updated_at
                FROM season_class_cars scc
                INNER JOIN classes c
                    ON c.id = scc.class_id
                INNER JOIN drivers pd
                    ON pd.id = scc.primary_driver_id
                LEFT JOIN drivers cd
                    ON cd.id = scc.co_driver_id
                WHERE scc.season_id = ${season_id}
                ORDER BY c.name ASC, scc.car_number ASC, pd.name ASC
            `;
        }

        return NextResponse.json(rows, { status: 200 });
    } catch (error) {
        console.error("GET /api/season-class-cars error:", error);
        return NextResponse.json(
            { error: "Failed to load season class cars." },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as SeasonClassCarCreatePayload;
        const {
            season_id,
            class_id,
            car_number,
            primary_driver_id,
            co_driver_id,
            is_active,
            rookie_status,
        } = body ?? {};

        const submittedRookieStatus = rookie_status?.trim();
        const safeRookieStatus = isRookieStatus(submittedRookieStatus) ? submittedRookieStatus : "unknown";

        if (!season_id || !class_id || !car_number || !primary_driver_id) {
            return NextResponse.json(
                { error: "season_id, class_id, car_number, and primary_driver_id are required." },
                { status: 400 }
            );
        }

        const ruleError = await validateSeasonClassCarRules({
            season_id, class_id, primary_driver_id, co_driver_id,
        });

        if (ruleError) {
            return NextResponse.json({ error: ruleError }, { status: 400 });
        }

        const inserted = await sql`
            INSERT INTO season_class_cars (
                season_id,
                class_id,
                car_number,
                primary_driver_id,
                co_driver_id,
                is_active,
                rookie_status
            )
            VALUES (
                ${season_id},
                ${class_id},
                ${car_number.trim()},
                ${primary_driver_id},
                ${co_driver_id || null},
                ${typeof is_active === "boolean" ? is_active : true},
                ${safeRookieStatus}
            )
            RETURNING *
        `;

        return NextResponse.json(inserted[0], { status: 201 });
    } catch (error: unknown) {
        console.error("POST /api/season-class-cars error:", error);

        if (hasErrorCode(error) && error.code === "23505") {
            return NextResponse.json(
                { error: "That car # is already registered in this class for this season." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Failed to create season class car." },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const body = (await req.json()) as SeasonClassCarUpdatePayload;
        const {
            id,
            season_id,
            class_id,
            car_number,
            primary_driver_id,
            co_driver_id,
            is_active,
            rookie_status,
        } = body ?? {};

        const submittedRookieStatus = rookie_status?.trim();
        const safeRookieStatus = typeof submittedRookieStatus === "string"
            ? isRookieStatus(submittedRookieStatus)
                ? submittedRookieStatus
                : "unknown"
            : null;

        if (!id || !season_id || !class_id || !car_number || !primary_driver_id) {
            return NextResponse.json(
                { error: "id, season_id, class_id, car_number, & primary_driver_id are required." },
                { status: 400 }
            );
        }

        const ruleError = await validateSeasonClassCarRules({
            season_id, class_id, primary_driver_id, co_driver_id, exclude_id: id,
        });

        if (ruleError) {
            return NextResponse.json({ error: ruleError }, { status: 400 });
        }

        const updated = await sql`
            UPDATE season_class_cars
            SET
                season_id = ${season_id},
                class_id = ${class_id},
                car_number = ${car_number.trim()},
                primary_driver_id = ${primary_driver_id},
                co_driver_id = ${co_driver_id || null},
                is_active = ${is_active},
                rookie_status = COALESCE(${safeRookieStatus}, rookie_status)
            WHERE id = ${id}
            RETURNING *
        `;

        if (!updated.length) {
            return NextResponse.json(
                { error: "Season class car not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0], { status: 200 });
    } catch (error: unknown) {
        console.error("PATCH /api/season-class-cars error:", error);

        if (hasErrorCode(error) && error.code === "23505") {
            return NextResponse.json(
                { error: "That car number is already registered in this class for this season." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Failed to update season class car." },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "id is required." },
                { status: 400 }
            );
        }

        const deleted = await sql`
            DELETE FROM season_class_cars
            WHERE id = ${id}
            RETURNING id
        `;

        if (!deleted.length) {
            return NextResponse.json(
                { error: "Season class car not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
        console.error("DELETE /api/season-class-cars error:", error);
        return NextResponse.json(
            { error: "Failed to delete season class car." },
            { status: 500 }
        );
    }
}