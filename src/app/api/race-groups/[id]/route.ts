import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { hasErrorCode } from "@/lib/api-errors";

const GROUP_CONFIG: Record<
    string,
    { title: string; order_index: number }
> = {
    qualifying: { title: "Qualifying", order_index: 10 },
    heat: { title: "Heats", order_index: 20 },
    feature_d: { title: "D Features", order_index: 30 },
    feature_c: { title: "C Features", order_index: 40 },
    feature_b: { title: "B Features", order_index: 50 },
    feature_a: { title: "A Features", order_index: 60 },
};

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const group = await sql`
            SELECT *
            FROM race_groups
            WHERE id = ${id}
        `;

        if (!group.length) {
            return NextResponse.json(
                { error: "Race group not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(group[0]);
    } catch (error) {
        console.error("Error fetching race group:", error);
        return NextResponse.json(
            { error: "Failed to fetch race group" },
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
        const { group_type, notes, status } = body ?? {};

        const existing = await sql`
            SELECT *
            FROM race_groups
            WHERE id = ${id}
        `;

        if (!existing.length) {
            return NextResponse.json(
                { error: "Race group not found" },
                { status: 404 }
            );
        }

        const current = existing[0];

        const nextGroupType = group_type ?? current.group_type;
        const config = GROUP_CONFIG[nextGroupType];

        if (!config) {
            return NextResponse.json(
                { error: "Invalid group_type" },
                { status: 400 }
            );
        }

        const nextStatus = status ?? current.status;
        const allowedStatuses = ["scheduled", "completed", "skipped"];

        if (!allowedStatuses.includes(nextStatus)) {
            return NextResponse.json(
                { error: "Invalid status" },
                { status: 400 }
            );
        }

        const updated = await sql`
            UPDATE race_groups
            SET
                group_type = ${nextGroupType},
                title = ${config.title},
                order_index = ${config.order_index},
                status = ${nextStatus},
                notes = ${notes ?? current.notes}
            WHERE id = ${id}
            RETURNING *
        `;

        return NextResponse.json(updated[0]);
    } catch (error: unknown) {
        if (hasErrorCode(error) && error.code === "23505") {
            return NextResponse.json(
                { error: "Race group already exists for this class." },
                { status: 409 }
            );
        }

        console.error("Error updating race group:", error);
        return NextResponse.json(
            { error: "Failed to update race group" },
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
            DELETE FROM race_groups
            WHERE id = ${id}
            RETURNING *
        `;

        if (!deleted.length) {
            return NextResponse.json(
                { error: "Race group not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            deleted: deleted[0],
        });
    } catch (error) {
        console.error("Error deleting race groups:", error);
        return NextResponse.json(
            { error: "Failed to delete race group" },
            { status: 500 }
        );
    }
}