import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const tags = await sql`
            SELECT id, name, created_at
            FROM tags
            ORDER BY LOWER(name) ASC
        `;

        return NextResponse.json(tags, { status: 200 });
    } catch (error) {
        console.error("GET /api/tags error:", error);
        return NextResponse.json(
            { error: "Failed to fetch tags." },
            { status: 500 }
        );
    }
}