"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DriverHistoryEventRow, DriverHistoryResponse } from "@/types";
import { useSortableData } from "@/lib/useSortableData";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import { formatDate } from "@/components/Formatter";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";

export default function DriverHistoryPage() {
    const router = useRouter();
    const params = useParams<{ seasonId: string; seasonClassCarId: string }>();

    const { status } = useSession();
    const isLoggedIn = status === "authenticated";

    const seasonId = params.seasonId;
    const seasonClassCarId = params.seasonClassCarId;

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<DriverHistoryResponse | null>(null);

    const {
        SortHeader,
        sortedData: sortedEvents,
        paginatedData: paginatedEvents,
        currentPage,
        setCurrentPage,
        perPage,
        setPerPage,
    } = useSortableData<DriverHistoryEventRow>({
        data: history?.events ?? [],
        initialKey: "event_date",
        dateKeys: ["event_date"],
        initialPerPage: 25,
    });

    const loadDriverHistory = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/driver-history?season_id=${seasonId}&season_class_car_id=${seasonClassCarId}`,
                { cache: "no-store" }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to load driver history.");
            }

            setHistory(data as DriverHistoryResponse);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load driver history.");
        } finally {
            setLoading(false);
        }
    }, [seasonId, seasonClassCarId]);

    useEffect(() => {
        if (!seasonId || !seasonClassCarId) return;
        loadDriverHistory();
    }, [seasonId, seasonClassCarId, loadDriverHistory]);

    const driverName = history?.summary?.primary_driver_name;
    const coDriverName = history?.summary?.co_driver_name ?? "";
    const driverNames = coDriverName ? `${driverName} / ${coDriverName}` : driverName;

    if (loading) return <LoadingSpinner />

    return (
        <>
            <div className={custStyles.wrap}>
                <div className={custStyles.header}>
                    <h1 className={styles.heading}>Driver History for</h1>
                    {history && (
                        <div className={styles.subheading}>
                            {driverNames}
                        </div>
                    )}

                    <div className={custStyles.tools}>
                        <button
                            className={styles.buttonSecondary}
                            onClick={() => router.push("/standings")}
                        >
                            Reverse
                        </button>
                    </div>
                </div>

                <Pagination
                    currentPage={currentPage}
                    perPage={perPage}
                    totalItems={sortedEvents.length}
                    onPageChange={setCurrentPage}
                    onPerPageChange={setPerPage}
                    label="events"
                />

                <div className={custStyles.tableWrap}>
                    <table className={custStyles.table}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "center" }}><SortHeader label="Date" sortKey="event_date" /></th>
                                <th style={{ textAlign: "center" }}><SortHeader label="Event" sortKey="event_name" /></th>
                                <th style={{ textAlign: "center" }}>Races</th>
                                <th style={{ textAlign: "center" }}><SortHeader label="Points" sortKey="total_points" /></th>
                                <th style={{ textAlign: "center" }}><SortHeader label="Pay" sortKey="total_pay" /></th>
                                <th style={{ textAlign: "center" }}><SortHeader label="Status" sortKey="event_status" /></th>
                                <th style={{ textAlign: "center" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {!paginatedEvents.length ? (
                                <tr>
                                    <td colSpan={7} className={custStyles.empty}>
                                        No event history found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedEvents.map((event) => (
                                    <tr key={event.event_id}>
                                        <td style={{ textAlign: "center" }}>{formatDate(event.event_date)}</td>
                                        <td style={{ textAlign: "center" }}>{event.event_name}</td>
                                        <td style={{ textAlign: "center" }}>
                                            {event.races?.length ? event.races.map((race) => {
                                                const raceLabel = race.race_name || race.breakdown_type || "Race";
                                                const finish = race.finish_position ? `P${race.finish_position}` : "-";
                                                return `${raceLabel} (${finish})`;
                                            })
                                                .join(", ")
                                                : "-"}
                                        </td>
                                        <td style={{ textAlign: "center" }}>{event.total_points}</td>
                                        <td style={{ textAlign: "center" }}>${event.total_pay}</td>
                                        <td style={{ textAlign: "center" }}>{event.event_status}</td>
                                        <td className={custStyles.right} style={{ width: 40 }}>
                                            {isLoggedIn && (
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() =>
                                                        router.push(`/season/${seasonId}/events/${event.event_id}/points-pay?class_id=${history?.summary?.class_id}`)
                                                    }
                                                    aria-label="Go to event"
                                                    title="Go to event"
                                                >
                                                    <ArrowRight size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}