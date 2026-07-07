"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import selectStyles from "@/styles/CustomSelect.module.css";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Class, Season, StandingRow } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatDate, todayDate } from "@/components/Formatter";
import { ChevronDown, History } from "lucide-react";
import { getClassDisplayName } from "@/lib/getClassName";
import { useSession } from "next-auth/react";

export default function StandingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const seasonIdFromUrl = searchParams.get("season_id");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { status } = useSession();

    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const [season, setSeason] = useState<Season | null>(null);
    const [selectedSeasonId, setSelectedSeasonId] = useState("");

    const [allClasses, setAllClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState("");

    const selectedClassObj = allClasses.find((c) => c.id === selectedClassId);
    const selectedClass = selectedClassObj ? getClassDisplayName(selectedClassObj) : "Class";

    const [standings, setStandings] = useState<StandingRow[]>([]);

    const [searchTerm, setSearchTerm] = useState("");

    const [dateFilter, setDateFilter] = useState("");
    const [applyFilterDate, setApplyFilterDate] = useState("");
    const [lastEventDateOfSeason, setLastEventDateOfSeason] = useState("");

    const isLoggedIn = status === "authenticated";

    const classStandings = useMemo(() => {
        if (!selectedClassId) return [];

        return standings.filter((row) => row.class_id === selectedClassId);
    }, [standings, selectedClassId]);

    const rankedStandings = useMemo(() => {
        const sorted = [...classStandings].sort((a, b) => {
            if (Number(b.total_points) !== Number(a.total_points)) {
                return Number(b.total_points) - Number(a.total_points);
            }

            return (a.car_number || "").localeCompare(b.car_number || "", undefined, {
                numeric: true,
                sensitivity: "base",
            });
        });

        return sorted.map((row, index) => ({
            ...row,
            rank: index + 1,
        }));
    }, [classStandings]);

    const filteredStandings = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return rankedStandings.filter((row) => {
            const matchesClass = !selectedClassId || row.class_id === selectedClassId;
            const name = (row.primary_driver_name || "").toLowerCase();
            const coDriver = (row.co_driver_name || "").toLowerCase();
            const carNumber = (row.car_number || "").toLowerCase();

            const matchesSearch =
                !term || name.includes(term) || coDriver.includes(term) || carNumber.includes(term);

            return matchesClass && matchesSearch;
        });
    }, [rankedStandings, selectedClassId, searchTerm]);

    const loadSeason = useCallback(async () => {
        try {
            if (seasonIdFromUrl) {
                const seasonsRes = await fetch("/api/seasons?with_points=true", {
                    cache: "no-store",
                });

                const seasonsJson = await seasonsRes.json();

                if (!seasonsRes.ok) {
                    toast.error(seasonsJson?.error || "Failed to load seasons.");
                    setLoading(false);
                    return;
                }

                const selectedSeason = (seasonsJson as Season[]).find(
                    (s) => s.id === seasonIdFromUrl
                );

                if (!selectedSeason) {
                    toast.error("Selected season was not found.");
                    setLoading(false);
                    return;
                }

                setSeason(selectedSeason);
                setSelectedSeasonId(selectedSeason.id);
                return;
            }

            const sRes = await fetch("/api/seasons/active", { cache: "no-store" });
            const sJson = await sRes.json();

            if (!sRes.ok) {
                toast.error(sJson?.error || "Failed to load season.");
                setLoading(false);
                return;
            }

            setSeason(sJson);
            setSelectedSeasonId(sJson.id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load season.");
            setLoading(false);
        }
    }, [seasonIdFromUrl]);

    useEffect(() => {
        async function loadPage() {
            if (!selectedSeasonId) return;

            setLoading(true);

            try {
                const standingsUrl = applyFilterDate
                    ? `/api/seasons/${selectedSeasonId}/standings?as_of_date=${applyFilterDate}`
                    : `/api/seasons/${selectedSeasonId}/standings`;

                const [classesRes, standingsRes, lastEventRes] = await Promise.all([
                    fetch(`/api/classes`, { cache: "no-store" }),
                    fetch(standingsUrl, { cache: "no-store" }),
                    fetch(`/api/events/last-date?season_id=${selectedSeasonId}`, { cache: "no-store" }),
                ]);

                const classesJson = await classesRes.json();
                const standingsJson = await standingsRes.json();
                const lastEventJson = await lastEventRes.json();

                if (!classesRes.ok) {
                    toast.error(classesJson?.error || "Failed to load all classes.");
                    router.back();
                    return;
                }

                if (!standingsRes.ok) {
                    toast.error(standingsJson?.error || "Failed to load championship standings.");
                    router.back();
                    return;
                }

                if (!lastEventRes.ok) {
                    toast.error(lastEventJson?.error || "Failed to load last event date.");
                    router.back();
                    return;
                }

                setAllClasses(classesJson || []);
                setStandings(standingsJson.standings || []);
                setLastEventDateOfSeason(lastEventJson.last_event_date || "");

                if ((classesJson || []).length > 0) {
                    setSelectedClassId((prev) => prev || classesJson[0].id);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load championship standings page.");
                router.back();
            } finally {
                setLoading(false);
            }
        }

        loadPage();
    }, [selectedSeasonId, applyFilterDate, router]);

    useEffect(() => {
        loadSeason();
    }, [loadSeason]);

    useEffect(() => {
        const handler = () => {
            setLoading(true);
            loadSeason();
        };

        window.addEventListener("season-changed", handler);
        return () => window.removeEventListener("season-changed", handler);
    }, [loadSeason]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const eventsCount = filteredStandings[0]?.events_count ?? 0;

    function findDate() {
        const isPastSeason = season ? season.year < new Date().getFullYear() : false;

        let displayDate = "";

        if (applyFilterDate.length > 0) {
            displayDate = formatDate(applyFilterDate);
        } else if (isPastSeason) {
            displayDate = formatDate(lastEventDateOfSeason);
        } else {
            displayDate = formatDate(todayDate());
        }

        return displayDate;
    }

    if (loading) return <LoadingSpinner />;

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>{`Championship Standings for ${season?.year}`}</h1>

                {isLoggedIn && (
                    <div className={custStyles.tools}>
                        <button
                            className={styles.buttonSecondary}
                            onClick={() => {
                                router.push("/season");
                            }}
                        >
                            Reverse
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.keyPanel}>
                <h2 className={styles.subheading}>Classes</h2>

                <div className={selectStyles.customSelect} ref={dropdownRef}>
                    <button
                        type="button"
                        className={selectStyles.customSelectTrigger2}
                        onClick={() => setOpen((o) => !o)}
                        disabled={loading}
                    >
                        {selectedClass}
                        <ChevronDown size={12} className={`${selectStyles.chevron} ${open ? selectStyles.chevronOpen : ""}`} />
                    </button>

                    {open && (
                        <div className={selectStyles.customSelectMenu} style={{ width: 250 }}>
                            {allClasses.map((cls) => (
                                <div
                                    key={cls.id}
                                    className={`${selectStyles.customSelectItem} ${cls.id === selectedClassId ? selectStyles.activeItem : ""
                                        }`}
                                    onClick={() => {
                                        setSelectedClassId(cls.id);
                                        setOpen(false);
                                    }}
                                >
                                    {getClassDisplayName(cls)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div
                className={custStyles.tools}
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    marginBottom: "1rem",
                }}
            >
                <div>
                    <label className={styles.label} style={{ visibility: "hidden" }}>Search</label>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Search by name or car #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ minWidth: "260px" }}
                    />
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                    }}
                >
                    <label className={styles.label} style={{ display: "block", marginBottom: "0.35rem" }}>
                        View standings as of:
                    </label>
                    <input
                        className={styles.input}
                        style={{ width: 180, minWidth: 180 }}
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </div>

                <div>
                    <button
                        className={styles.button}
                        type="button"
                        onClick={() => {
                            if (dateFilter === applyFilterDate) return;

                            setLoading(true);
                            setApplyFilterDate(dateFilter);
                        }}
                    >
                        Filter
                    </button>

                    <button
                        className={styles.link}
                        type="button"
                        onClick={() => {
                            setDateFilter("");
                            setSearchTerm("");

                            if (applyFilterDate) {
                                setLoading(true);
                                setApplyFilterDate("");
                            }
                        }}
                    >
                        Clear filters
                    </button>
                </div>
            </div>

            <div className={custStyles.tableWrap} style={{ marginBottom: 75 }}>
                <table className={custStyles.table}>
                    <thead>
                        <tr>
                            <th colSpan={4} className={custStyles.favoritesHeader}>{selectedClass}</th>
                            <th
                                colSpan={2}
                                className={custStyles.favoritesHeader}
                                style={{
                                    fontSize: 14,
                                    fontWeight: "normal",
                                    color: "#888888"
                                }}>
                                {eventsCount} event(s) as of {findDate()}
                            </th>
                        </tr>
                    </thead>
                    <thead>
                        <tr>
                            <th style={{ textAlign: "center" }}>Position</th>
                            <th style={{ textAlign: "center" }}>Car #</th>
                            <th style={{ textAlign: "center" }}>Competitor/Team</th>
                            <th style={{ textAlign: "center" }}>Points</th>
                            <th style={{ textAlign: "center" }}>Earnings</th>
                            <th style={{ textAlign: "center", width: 40 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {!filteredStandings.length ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className={styles.muted}
                                    style={{
                                        textAlign: "center",
                                        padding: "2rem 1rem",
                                    }}
                                >
                                    No championship points/pay recorded yet for this class!
                                </td>
                            </tr>
                        ) : (
                            filteredStandings.map((row) => (
                                <tr key={row.season_class_car_id}>
                                    <td style={{ textAlign: "center" }}>{row.rank}</td>
                                    <td style={{ textAlign: "center" }}>{row.car_number}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <div>{row.primary_driver_name}</div>
                                        {row.co_driver_name ? (
                                            <div className={custStyles.subtle}>{row.co_driver_name}</div>
                                        ) : null}
                                    </td>
                                    <td style={{ textAlign: "center" }}>{row.total_points}</td>
                                    <td style={{ textAlign: "center" }}>${row.total_pay}</td>
                                    <td className={custStyles.right} style={{ width: 40 }}>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() =>
                                                router.push(`/driver-history/${selectedSeasonId}/${row.season_class_car_id}`)
                                            }
                                            aria-label="See driver history"
                                            title="See driver's events"
                                        >
                                            <History size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}