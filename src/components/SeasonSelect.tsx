"use client";

import { Season } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import styles from "@/styles/CustomSelect.module.css";
import { ChevronDown } from "lucide-react";

export default function SeasonSelect({
    newSeasonHref = "/season/new"
}: {
    newSeasonHref?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [seasons, setSeasons] = useState<Season[]>([]);
    const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function loadData() {
        try {
            const [allRes, activeRes] = await Promise.all([
                fetch("/api/seasons", { cache: "no-store" }),
                fetch("/api/seasons/active", { cache: "no-store" }),
            ]);

            if (!allRes.ok || !activeRes.ok) throw new Error("Failed to load seasons");

            const all = (await allRes.json()) as Season[];
            const active = (await activeRes.json()) as Season | null;

            setSeasons(all);
            setActiveSeasonId(active?.id ?? null);
        } catch {
            toast.error("Failed to load seasons");
        }
    }

    useEffect(() => {
        loadData();
    }, []);

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

    const showSeasonSelect = pathname === "/season";

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
                            onClick={() => activateSeason(s.id)}
                        >
                            {s.name}
                        </div>
                    ))}

                    <div
                        className={`${styles.customSelectItem} ${styles.createItem}`}
                        onClick={() => router.push(newSeasonHref)}
                    >
                        + Create New Season
                    </div>
                </div>
            )}
        </div>
    );
}