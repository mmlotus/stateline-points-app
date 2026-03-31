declare module "next-auth" {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            email_verified?: number;
            role?: string | null;
        };
    }

    interface User {
        email_verified?: number;
        role?: string | null;
    }

    interface JWT {
        email?: string;
        email_verified?: number;
        role?: string | null;
    }
}

export {};