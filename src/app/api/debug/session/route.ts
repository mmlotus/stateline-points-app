import { authOptions } from "@/lib/authOptions";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";


export async function GET() {
    const session = await getServerSession(authOptions);
    return NextResponse.json({
        hasSession: !!session,
        session,
    });
}