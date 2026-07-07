"use client";

import { Season } from "@/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import styles from "@/styles/CustomSelect.module.css";
import { ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";

export default function SeasonSelect({
    newSeasonHref = "/season/new"
}: {
    newSeasonHref?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: session, status } = useSession();

    const [seasons, setSeasons] = useState<Season[]>([]);
    const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const isStandingsPage = pathname === "/standings";
    const isSeasonPage = pathname === "/season";
    const showSeasonSelect = isSeasonPage || isStandingsPage;
    
    const isAdmin = status === "authenticated" && session?.user?.role === "admin";

    async function loadData() {
        try {
            const seasonsUrl = isStandingsPage
                ? "/api/seasons?with_points=true"
                : "/api/seasons";

            const [allRes, activeRes] = await Promise.all([
                fetch(seasonsUrl, { cache: "no-store" }),
                fetch("/api/seasons/active", { cache: "no-store" }),
            ]);

            if (!allRes.ok || !activeRes.ok) throw new Error("Failed to load seasons");

            const all = (await allRes.json()) as Season[];
            const active = (await activeRes.json()) as Season | null;

            const seasonIdFromUrl = searchParams.get("season_id");

            setSeasons(all);
            setActiveSeasonId(seasonIdFromUrl || active?.id || all[0]?.id || null);
        } catch {
            toast.error("Failed to load seasons");
        }
    }

    useEffect(() => {
        if (!showSeasonSelect) return;

        loadData();
    }, [showSeasonSelect, isStandingsPage, searchParams]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function activateSeason(seasonId: string) {
        const tId = toast.loading("Switching season...");
        setLoading(true);

        try {
            const res = await fetch("/api/seasons/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ season_id: seasonId }),
            });

            if (!res.ok) {
                toast.error("Failed to switch season", { id: tId });
                return;
            }

            setActiveSeasonId(seasonId);
            setOpen(false);
            toast.dismiss(tId);

            window.dispatchEvent(new CustomEvent("season-changed"));
            router.refresh();
        } catch {
            toast.error("Failed to switch season", { id: tId });
        } finally {
            setLoading(false);
        }
    }

    function seasonSelect(seasonId: string) {
        if (isStandingsPage) {
            setActiveSeasonId(seasonId);
            setOpen(false);
            router.push(`/standings?season_id=${seasonId}`);
            return;
        }

        activateSeason(seasonId);
    }

    if (!showSeasonSelect) return null;

    const activeSeasonName = seasons.find((s) => s.id === activeSeasonId)?.name || "Select Season";

    return (
        <div className={styles.customSelect} ref={dropdownRef}>
            <button
                type="button"
                className={styles.customSelectTrigger}
                onClick={() => setOpen((o) => !o)}
                disabled={loading}
            >
                {activeSeasonName}
                <ChevronDown size={12} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
            </button>

            {open && (
                <div className={styles.customSelectMenu}>
                    {seasons.map((s) => (
                        <div
                            key={s.id}
                            className={`${styles.customSelectItem} ${s.id === activeSeasonId ? styles.activeItem : ""
                                }`}
                            onClick={() => seasonSelect(s.id)}
                        >
                            {s.name}
                        </div>
                    ))}

                    {isAdmin && (
                        <div
                            className={`${styles.customSelectItem} ${styles.createItem}`}
                            onClick={() => router.push(newSeasonHref)}
                        >
                            + Create New Season
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}