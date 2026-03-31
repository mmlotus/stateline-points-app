"use client";

import styles from "@/styles/Global.module.css";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useCurrentUser } from "@/lib/useCurrentUser";
import Banner from "@/components/Images/banner";
import Link from "next/link";
import CardImg from "@/components/Images/card-img";
import { systemUpdates } from "@/components/Updates/SysUpdRegistry";
import SystemUpdates from "@/components/Updates/SystemUpdates";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function HomePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useCurrentUser();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/login");
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) return <LoadingSpinner />;

    if (!isAuthenticated) return null;

    const name = user.name ? user.name.split(" ")[0] : "";

    const hasUpdates = systemUpdates.length > 0;

    return (
        <div className={styles.pageWrapper}>
            <Banner
                type="default"
                title={!name ? "Dashboard" : `${name}'s Dashboard`}
                subtitle={`I eat losers for breakfast.`}
            />

            {/* Main User Cards */}
            <div className={styles.grid}>
                <Link href="/season" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="trophy" alt="" />
                    </div>
                    <h2>Season Schedule</h2>
                </Link>
                <Link href="/entries" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="car" alt="" />
                    </div>
                    <h2>Event Entries</h2>
                </Link>
                <Link href="/results" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="flag" alt="" />
                    </div>
                    <h2>Results</h2>
                </Link>
                <Link href="/drivers" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="helmet" alt="" />
                    </div>
                    <h2>Drivers</h2>
                </Link>
                <Link href="/standings" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="medal" alt="" />
                    </div>
                    <h2>Champion Standings</h2>
                </Link>
                <Link href="/season-class-cars" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="seat" alt="" />
                    </div>
                    <h2>Season Registrations</h2>
                </Link>
                <Link href="/settings/schemes" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="dash" alt="" />
                    </div>
                    <h2>Schemes</h2>
                </Link>
                <Link href="/classes" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="wheel" alt="" />
                    </div>
                    <h2>Classes</h2>
                </Link>
                <Link href="/tires" className={styles.card}>
                    <div className={styles.cardImgWrapper}>
                        <CardImg name="tire" alt="" />
                    </div>
                    <h2>Tires</h2>
                </Link>
            </div>

            {/* UPDATES SECTION */}
            {hasUpdates && (
                <>
                    <div className={styles.sep} />
                    <SystemUpdates minToShow={1} />
                </>
            )}
        </div>
    );
}
