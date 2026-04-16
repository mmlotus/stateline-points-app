import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { hasErrorCode } from "@/lib/api-errors";
import { markEventComplete } from "@/lib/syncEventStatus";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const race = await sql`
            SELECT *
            FROM races
            WHERE id = ${id}
        `;

        if (!race.length) {
            return NextResponse.json(
                { error: "Race not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(race[0]);
    } catch (error) {
        console.error("Error fetching race:", error);
        return NextResponse.json(
            { error: "Failed to fetch race" },
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
        const { race_num, name, notes, status, order_index, transfer_count } = body ?? {};

        const existing = await sql`
            SELECT *
            FROM races
            WHERE id = ${id}
        `;

        if (!existing.length) {
            return NextResponse.json(
                { error: "Race not found" },
                { status: 404 }
            );
        }

        const current = existing[0];

        const nextStatus = status ?? current.status;
        const allowedStatuses = ["scheduled", "completed", "rain out", "cancelled"];

        if (!allowedStatuses.includes(nextStatus)) {
            return NextResponse.json(
                { error: "Invalid status" },
                { status: 400 }
            );
        }

        const updated = await sql`
            UPDATE races
            SET
                race_num = ${race_num ?? current.race_num},
                name = ${name ?? current.name},
                notes = ${notes ?? current.notes},
                status = ${nextStatus},
                order_index = ${order_index ?? current.order_index},
                transfer_count = ${transfer_count ?? current.transfer_count}
            WHERE id = ${id}
            RETURNING *
        `;

        const eventRows = await sql`
            SELECT ec.event_id
            FROM races ra
            INNER JOIN race_groups rg
                ON rg.id = ra.race_group_id
            INNER JOIN event_classes ec
                ON ec.id = rg.event_class_id
            WHERE ra.id = ${id}
            LIMIT 1
        `;

        if (eventRows.length) {
            await markEventComplete(eventRows[0].event_id);
        }

        return NextResponse.json(updated[0]);
    } catch (error: unknown) {
        if (hasErrorCode(error) && error.code === "23505") {
            return NextResponse.json(
                { error: "Race number already exists in this group" },
                { status: 409 }
            );
        }

        console.error("Error updating race:", error);
        return NextResponse.json(
            { error: "Failed to update race" },
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
        const deleted = await sql`
            DELETE FROM races
            WHERE id = ${id}
            RETURNING *
        `;

        if (!deleted.length) {
            return NextResponse.json(
                { error: "Race not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            deleted: deleted[0],
        });
    } catch (error) {
        console.error("Error deleting race:", error);
        return NextResponse.json(
            { error: "Failed to delete race" },
            { status: 500 }
        );
    }
}