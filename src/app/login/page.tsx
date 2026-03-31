"use client";

import { Suspense, useMemo, useState } from "react";
import styles from "../../styles/Global.module.css";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

const DOMAIN_OPTIONS = [
    "gmail.com",
    "raceidaho.com",
    "outlook.com",
    "hotmail.com",
];

function SignInContent() {
    const { status } = useSession();

    const [identifier, setIdentifier] = useState("");
    const [domain, setDomain] = useState(DOMAIN_OPTIONS[0] || "");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // If already logged in, bounce to home
    useEffect(() => {
        if (status === "authenticated") {
            window.location.href = "/home";
        }
    }, [status]);

    // Build email - if user typed something containing "@", treat it as a full email; otherwise, append the selected domain
    const email = useMemo(() => {
        const val = identifier.trim().toLowerCase();
        if (!val) return "";
        if (val.includes("@")) return val;
        return domain ? `${val}@${domain}` : val;
    }, [identifier, domain]);

    const handleLogin = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const result = await signIn("credentials", {
            email, password, redirect: false, callbackUrl: "/home",
        });

        setLoading(false);

        if (result?.error) {
            setErrorMsg("Invalid email or password.");
            return;
        }

        window.location.href = result?.url || "/home";
    };

    const showDomainDropdown = !identifier.includes("@");

    return (
        <div className={styles.centeredPanel}>
            <h1 className={styles.heading}>SIGN IN</h1>

            <form className={styles.form} onSubmit={handleLogin}>
                {/* Username/email + domain dropdown row */}
                <div className={styles.emailRow}>
                    <input
                        type="text"
                        placeholder="email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className={`${styles.input} ${styles.usernameInput}`}
                        autoComplete="username"
                    />

                    {showDomainDropdown && (
                        <select
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className={`${styles.input} ${styles.domainSelect}`}
                        >
                            {DOMAIN_OPTIONS.map((d) => (
                                <option key={d} value={d}>
                                    @{d}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <input
                    type="password"
                    placeholder="*********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    style={{ marginTop: "10px" }}
                    autoComplete="current-password"
                />

                <button
                    type="submit"
                    className={styles.button}
                    style={{ marginTop: "12px" }}
                    disabled={loading || !email || !password}
                >
                    {loading ? "Turning left..." : "SEND IT"}
                </button>

                {errorMsg && (
                    <div className={styles.errorText}>{errorMsg}</div>
                )}
            </form>
        </div>
    );
}

export default function SignIn() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignInContent />
        </Suspense>
    );

}