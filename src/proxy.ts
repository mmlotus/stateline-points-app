import { NextRequest, NextResponse } from "next/server";

function hasSessionCookie(req: NextRequest) {
    const dev = req.cookies.get("next-auth.session-token")?.value;
    const secure = req.cookies.get("__Secure-next-auth.session-token")?.value;
    return Boolean(dev || secure);
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    //Public exceptions
    function isPublicPath(pathname: string) {
        const isPublicStandingsApi =
            pathname === "/api/seasons" ||
            pathname === "/api/seasons/active" ||
            pathname === "/api/classes" ||
            pathname === "/api/events/last-date" ||
            pathname === "/api/driver-history" ||
            /^\/api\/seasons\/[^/]+\/standings$/.test(pathname);

        return (
            pathname.startsWith("/_next") ||
            pathname.startsWith("/api/auth") ||
            pathname.startsWith("/public") ||
            pathname === "/" ||
            pathname === "/login" ||
            pathname === "/privacy" ||
            pathname === "/terms" ||
            pathname.startsWith("/standings") ||
            pathname.startsWith("/driver-history") ||
            isPublicStandingsApi ||
            /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?|ttf)$/i.test(pathname)
        );
    }

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    if (!hasSessionCookie(req)) {
        if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};