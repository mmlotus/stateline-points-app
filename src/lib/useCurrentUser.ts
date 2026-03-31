import { useSession } from "next-auth/react";

export function useCurrentUser() {
    const { data: session, status, update } = useSession();

    const isAuthenticated = status === "authenticated";
    const isLoading = status === "loading";

    const user = {
        email: session?.user?.email || "",
        name: session?.user?.name || "",
        email_verified: session?.user?.email_verified ?? 0,
        role: session?.user?.role || "",
    };

    return {
        isAuthenticated,
        isLoading,
        update,
        user,
    };
}