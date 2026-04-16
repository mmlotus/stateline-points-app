import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const classes = await sql`
            SELECT
                c.id,
                c.name,
                c.created_at,
                c.default_points_scheme_id,
                c.default_pay_scheme_id,
                ps.name AS default_points_scheme_name,
                pay.name AS default_pay_scheme_name
            FROM classes c
            LEFT JOIN schemes ps
                ON ps.id = c.default_points_scheme_id
            LEFT JOIN schemes pay
                ON pay.id = c.default_pay_scheme_id
            ORDER BY c.name ASC
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
        const default_points_scheme_id = body?.default_points_scheme_id || null;
        const default_pay_scheme_id = body?.default_pay_scheme_id || null;

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
            INSERT INTO classes (
                name,
                default_points_scheme_id,
                default_pay_scheme_id    
            )
            VALUES (
                ${name},
                ${default_points_scheme_id},
                ${default_pay_scheme_id}
            )
            RETURNING id, name, created_at, default_points_scheme_id, default_pay_scheme_id
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