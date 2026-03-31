import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const classes = await sql`
            SELECT id, name, created_at
            FROM classes
            ORDER BY name ASC
        `;

        return NextResponse.json(classes, { status: 200 });
    } catch (error) {
        console.error("GET /api/classes error:", error);
        return NextResponse.json(
            { error: "Failed to fetch classes." },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const name = body?.name?.trim();

        if (!name) {
            return NextResponse.json(
                { error: "Class name is required." },
                { status: 400 }
            );
        }

        const duplicate = await sql`
            SELECT id
            FROM classes
            WHERE LOWER(name) = LOWER(${name})
            LIMIT 1
        `;

        if (duplicate.length) {
            return NextResponse.json(
                { error: "A class with that name already exists." },
                { status: 409 }
            );
        }

        const inserted = await sql`
            INSERT INTO classes (name)
            VALUES (${name})
            RETURNING id, name, created_at
        `;

        return NextResponse.json(inserted[0], { status: 201 });
    } catch (error) {
        console.error("POST `/api/classes error:", error);
        return NextResponse.json(
            { error: "Failed to create class." },
            { status: 500 }
        );
    }
}