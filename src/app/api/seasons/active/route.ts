import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET() {
    try {
        const rows = await sql`
            SELECT id, year, name, is_active, created_at
            FROM seasons
            WHERE is_active = TRUE
            LIMIT 1
        `;

        return NextResponse.json(rows[0] ?? null);
    } catch (error) {
        console.error("Error fetching active season:", error);
        return NextResponse.json({ error: "Failed to fetch active season" }, { status: 500 });
    }
}