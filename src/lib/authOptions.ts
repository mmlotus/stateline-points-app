import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/app/api/auth/userHelpers";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24 * 2, //48 hours
    },
    jwt: {
        maxAge: 60 * 60 * 24 * 2, //same as session
    },

    providers: [
        CredentialsProvider({
            name: "Email + Password",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },

            async authorize(credentials) {
                const email = (credentials?.email || "").toLowerCase().trim();
                const password = credentials?.password || "";
                if (!email || !password) return null;

                const user = await getUserByEmail(email);
                if (!user) return null;

                const ok = await bcrypt.compare(password, user.password_hash);
                if (!ok) return null;

                return {
                    id: user.id,
                    name: user.name || user.email,
                    email: user.email,
                };
            },
        }),
    ],

    pages: {
        signIn: "/login",
    },

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.email = user.email;
                token.name = user.name;
            }

            if (token.email) {
                const dbUser = await getUserByEmail(String(token.email).toLowerCase());
                if (dbUser) {
                    token.email_verified = dbUser.email_verified ?? 0;
                    token.role = dbUser.role ?? "user";
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.email = (token.email as string) || "";
                session.user.name = (token.name as string) || session.user.email || "";
                session.user.email_verified = (token.email_verified as number) ?? 0;
                session.user.role = (token.role as string) || "user";
            }
            return session;
        },

        redirect({ url, baseUrl }) {
            // If a callbackUrl is explicitly provided (i.e. signOut), use it
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            else if (url.startsWith(baseUrl)) return url;
            return `${baseUrl}/home`; // Default fallback
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
