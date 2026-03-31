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

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const event_class_id = url.searchParams.get("event_class_id");

        if (!event_class_id) {
            return NextResponse.json(
                { error: "event_class_id is required" },
                { status: 400 }
            );
        }

        const groups = await sql`
            SELECT *
            FROM race_groups
            WHERE event_class_id = ${event_class_id}
            ORDER BY order_index ASC, created_at ASC
        `;

        return NextResponse.json(groups);
    } catch (error) {
        console.error("Error fetching race groups:", error);
        return NextResponse.json(
            { error: "Failed to fetch race groups." },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event_class_id, group_type, notes } = body ?? {};

        if (!event_class_id || !group_type) {
            return NextResponse.json(
                { error: "event_class_id and group_type are required" },
                { status: 400 }
            );
        }

        const config = GROUP_CONFIG[group_type];

        if (!config) {
            return NextResponse.json(
                { error: "Invalid group_type" },
                { status: 400 }
            );
        }

        const { title, order_index } = config;

        const created = await sql`
            INSERT INTO race_groups (
                event_class_id,
                group_type,
                title,
                order_index,
                status,
                notes
            )
            VALUES (
                ${event_class_id},
                ${group_type},
                ${title},
                ${order_index},
                'scheduled',
                ${notes ?? null}
            )
            RETURNING *
        `;

        return NextResponse.json(created[0]);
    } catch (error: unknown) {
        if (hasErrorCode(error) && error.code === "23505") {
            return NextResponse.json(
                { error: "Race group already exists for this class." },
                { status: 409 }
            );
        }

        console.error("Error creating race groups:", error);
        return NextResponse.json(
            { error: "Failed to create race group" },
            { status: 500 }
        );
    }
}