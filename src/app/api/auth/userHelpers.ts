import sql from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function getUserByEmail(email: string) {
    const rows = await sql`
        SELECT * FROM users
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
    `;

    return rows[0] || null;
}

export async function getUserById(userId: string) {
    const rows = await sql`
        SELECT name, email
        FROM users
        WHERE id = ${userId}
        LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        name: row.name?.trim(),
        email: row.email?.trim(),
    };
}

export async function getCurrentUser(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.email) {
        throw new Error("Unauthorized");
    }

    return {
        email: token.email,
        name: token.name,
        email_verified: token.email_verified,
        id: token.sub ?? null,
        role: token.role,
    };
}