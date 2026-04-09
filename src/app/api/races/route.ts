import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { hasErrorCode } from "@/lib/api-errors";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const race_group_id = url.searchParams.get("race_group_id");

        if (!race_group_id) {
            return NextResponse.json(
                { error: "race_group_id is required" },
                { status: 400 }
            );
        }

        const races = await sql`
            SELECT *
            FROM races
            WHERE race_group_id = ${race_group_id}
            ORDER BY order_index ASC, race_num ASC, created_at ASC
        `;

        return NextResponse.json(races);
    } catch (error) {
        console.error("Error fetching races:", error);
        return NextResponse.json(
            { error: "Failed to fetch races" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { race_group_id, race_num, name, notes, transfer_count } = body ?? {};

        if (!race_group_id || !race_num) {
            return NextResponse.json(
                { error: "race_group_id and race_num are required" },
                { status: 400 }
            );
        }

        const created = await sql`
            INSERT INTO races (
                race_group_id,
                race_num,
                name,
                status,
                notes,
                order_index,
                transfer_count
            )
            VALUES (
                ${race_group_id},
                ${race_num},
                ${name ?? null},
                'scheduled',
                ${notes ?? null},
                ${race_num},
                ${transfer_count ?? 0}
            )
            RETURNING *
        `;

        return NextResponse.json(created[0]);
    } catch (error: unknown) {
        if (hasErrorCode(error) && error.code === "23505") {
            return NextResponse.json(
                { error: "Race number already exists in this group" },
                { status: 409 }
            );
        }

        console.error("Error creating race:", error);
        return NextResponse.json(
            { error: "Failed to create race" },
            { status: 500 }
        );
    }
}