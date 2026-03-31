"use client";

import Link from "next/link";
import styles from "./Navbar.module.css";
import { Orbitron } from "next/font/google";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import Breadcrumbs from "./Breadcrumbs";
import Image from "next/image";
import SeasonSelect from "../SeasonSelect";

const orbitron = Orbitron({
    weight: ["900"],
    subsets: ["latin"],
});

export default function Navbar() {
    const { isAuthenticated, user } = useCurrentUser();
    const pathname = usePathname();

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;

        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };

        const handleScroll = () => {
            setMenuOpen(false);
        };

        document.addEventListener("mousedown", handleClick);
        document.addEventListener("scroll", handleScroll, true);

        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("scroll", handleScroll, true);
        };
    }, [menuOpen]);

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
            window.location.href = "/login";
        } catch (err) {
            console.error("Sign out failed:", err);
            toast.error("We're having trouble signing you out.");
        }
    };

    const showNav =
        isAuthenticated &&
        pathname !== "/" &&
        pathname !== "/login" &&
        pathname !== "/home";

    const isSched =
        isAuthenticated &&
        pathname.startsWith("/season");

    console.log("auth:", isAuthenticated);
    console.log("path:", pathname);


    return (
        <nav className={styles.nav}>
            <div className={styles.left}>
                <div className={styles.brand}>
                    <Image src="/logos/slsturbo.svg" alt="" width={20} height={20} className={styles.logo} />
                    <div className={`${styles.title} ${orbitron.className}`}>BLACKTOP</div>
                    <Breadcrumbs />
                </div>
            </div>

            <div className={styles.right}>
                {isSched && <SeasonSelect />}
                {showNav && (
                    <>
                        {/* Hamburger */}
                        <button
                            type="button"
                            aria-label="Open menu"
                            className={styles.hamburger}
                            onClick={() => setMenuOpen(true)}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>

                        {/* Slide-out menu */}
                        <div ref={menuRef} className={`${styles.mobileMenu} ${menuOpen ? styles.open : ""}`}>
                            <button className={styles.closeBtn} onClick={() => setMenuOpen(false)}>✕</button>
                            {isAuthenticated && (
                                <>
                                    <Link href="/home" className={styles.link}>HOME</Link>
                                    <Link href="/season" className={styles.link}>Schedule</Link>
                                    <Link href="/classes" className={styles.link}>Classes</Link>
                                    <Link href="/drivers" className={styles.link}>Drivers</Link>
                                    <Link href="/season-class-cars" className={styles.link}>Registrations</Link>
                                    <Link href="/entries" className={styles.link}>Entries</Link>
                                    <Link href="/results" className={styles.link}>Results</Link>
                                    <Link href="/standings" className={styles.link}>Points/Pay</Link>
                                    {user.role === "admin" && (
                                        <>
                                            <Link href="/settings/schemes" className={styles.link}>Manage Schemes</Link>
                                            <Link href="/tires" className={styles.link}>Manage Tires</Link>
                                        </>
                                    )}
                                </>
                            )}
                            <button onClick={() => {
                                setMenuOpen(false); handleSignOut();
                            }} className={styles.link}>LOGOUT</button>
                        </div>
                    </>
                )}

                {isAuthenticated && pathname === "/home" && (
                    <button onClick={handleSignOut} className={styles.link}>LOGOUT</button>
                )}
            </div>
        </nav >
    );
}