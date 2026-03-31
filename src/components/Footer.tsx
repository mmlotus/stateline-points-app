"use client";

import Link from "next/link";
import styles from "./Navigation/Navbar.module.css";
import Image from "next/image";
import { Copyright } from "lucide-react";

export default function Footer() {
    return (
        <footer className={styles.nav}>
            <div className={styles.left}>
                <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
                <Link href="/terms" className={styles.link}>Terms of Service</Link>
            </div>
            <div className={styles.right}>
                <Copyright size={15} />2026
                <span style={{ marginLeft: "10px" }}>
                    <Image src="/logos/slsturbo.svg" alt="BLACKTOP" width={10} height={10} className={styles.logo} />
                </span>
            </div>
        </footer>
    );
}