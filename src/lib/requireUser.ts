import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/auth/userHelpers";

type HandlerWithUser = (
  req: NextRequest,
  user: Awaited<ReturnType<typeof getCurrentUser>>
) => Promise<NextResponse>;

export function requireUser(handler: HandlerWithUser) {
  async function withUser(req: NextRequest): Promise<NextResponse> {
    try {
      const user = await getCurrentUser(req);
      return await handler(req, user);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return withUser;
}
