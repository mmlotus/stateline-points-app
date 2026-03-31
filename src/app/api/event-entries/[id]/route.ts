import { NextResponse } from "next/server";
import sql from "@/lib/db";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function DELETE(_req: Request, context: RouteContext) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: "Entry ID is required." }, { status: 400 });
        }

        const deleted = await sql`
            DELETE FROM event_entries
            WHERE id = ${id}
            RETURNING id
        `;

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Event entry not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("DELETE /api/event-entries/[id] error:", error);
        return NextResponse.json({ error: "Failed to delete event entry" }, { status: 500 });
    }
}