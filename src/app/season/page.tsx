"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import { useEffect, useState } from "react";
import { EventRow, Season } from "@/types";
import { useRouter } from "next/navigation";
import { Flag, Medal, Pencil, TrashIcon, Trophy, UserRoundPen } from "lucide-react";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import { useSortableData } from "@/lib/useSortableData";
import { formatDate } from "@/components/Formatter";

export default function SeasonSchedulePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [season, setSeason] = useState<Season | null>(null);
    const [events, setEvents] = useState<(EventRow & { class_names: string[] })[]>([]);

    const {
        SortHeader,
        sortedData: sortedEvents,
        paginatedData: paginatedEvents,
        currentPage,
        setCurrentPage,
        perPage,
        setPerPage,
        totalPages,
    } = useSortableData<EventRow & { class_names: string[] }>({
        data: events,
        initialKey: "event_date",
        dateKeys: ["event_date", "created_at"],
        initialPerPage: 25,
    });

    async function loadSeasonEvents(showToast = false) {
        const tId = showToast ? toast.loading("Loading season schedule...") : undefined;

        try {
            const sRes = await fetch("/api/seasons/active", { cache: "no-store" });
            if (!sRes.ok) {
                if (tId) toast.error("Failed to load active season.", { id: tId });
                else toast.error("Failed to load active season schedule");
                return;
            }

            const s: Season | null = await sRes.json();
            setSeason(s);

            if (!s) {
                setEvents([]);
                if (tId) toast.dismiss(tId);
                return;
            }

            const eRes = await fetch(`/api/events?season_id=${encodeURIComponent(s.id)}`, { cache: "no-store" });

            if (!eRes.ok) {
                if (tId) toast.error("Failed to load events.", { id: tId });
                else toast.error("Failed to load events");
                return;
            }

            const e: (EventRow & { class_names: string[] })[] = await eRes.json();
            setEvents(e);

            if (tId) toast.dismiss(tId);
        } catch (err) {
            console.error(err);
            if (tId) toast.error("Failed to load schedule.", { id: tId });
            else toast.error("Failed to load schedule");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSeasonEvents(false);
    }, []);

    useEffect(() => {
        const handler = () => {
            setLoading(true);
            loadSeasonEvents(false);
        };

        window.addEventListener("season-changed", handler);
        return () => window.removeEventListener("season-changed", handler);
    }, []);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages, setCurrentPage]);

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete event "${name}"?`)) return;

        const tId = toast.loading("Deleting event...");
        try {
            const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) {
                toast.error("Failed to delete event.", { id: tId });
                return;
            }

            toast.success("Event deleted.", { id: tId });
            await loadSeasonEvents(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete event.", { id: tId });
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>
                    {season ? `${season.year} Season Schedule` : "Season Schedule"}</h1>

                <div className={custStyles.tools}>
                    <button
                        className={styles.button}
                        onClick={() => {
                            if (!season?.id) return;
                            router.push(`/season/${season.id}/events/new`);
                        }}
                        disabled={!season?.id}
                    >
                        + New Event
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
                            <th><SortHeader label="Date" sortKey="event_date" /></th>
                            <th><SortHeader label="Event Name" sortKey="name" /></th>
                            <th><SortHeader label="Status" sortKey="status" /></th>
                            <th>Classes</th>
                            <th>Notes</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {!events.length ? (
                            <tr>
                                <td className={custStyles.empty} colSpan={6}>
                                    No events found for this season yet!
                                </td>
                            </tr>
                        ) : (
                            paginatedEvents.map((event) => (
                                <tr key={event.id}>
                                    <td style={{ textAlign: "center" }}>{formatDate(event.event_date)}</td>
                                    <td style={{ textAlign: "center" }}>{event.name}</td>
                                    <td style={{ textAlign: "center" }}>{event.status}</td>
                                    <td style={{ maxWidth: 450 }}>{event.class_names?.length ? event.class_names.join(", ") : "-"}</td>
                                    <td style={{ textAlign: "center" }}>{event.notes || "-"}</td>
                                    <td className={custStyles.right}>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() =>
                                                router.push(`/season/${season?.id}/events/${event.id}`)
                                            }
                                            aria-label="Edit event"
                                            title="Edit event"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() =>
                                                router.push(`/season/${season?.id}/events/${event.id}/races`)
                                            }
                                            aria-label="Manage races"
                                            title="Add races"
                                        >
                                            <Flag size={16} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() =>
                                                router.push(`/season/${season?.id}/events/${event.id}/entries`)
                                            }
                                            aria-label="Manage entries"
                                            title="Edit entries"
                                        >
                                            <UserRoundPen size={16} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() =>
                                                router.push(`/season/${season?.id}/events/${event.id}/results`)
                                            }
                                            aria-label="Manage results"
                                            title="Manage results"
                                        >
                                            <Medal size={16} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() =>
                                                router.push(`/season/${season?.id}/events/${event.id}/points-pay`)
                                            }
                                            aria-label="Manage points/pay"
                                            title="Manage awards"
                                        >
                                            <Trophy size={16} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() => handleDelete(event.id, event.name)}
                                            aria-label="Delete event"
                                            title="Delete"
                                        >
                                            <TrashIcon size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                perPage={perPage}
                totalItems={sortedEvents.length}
                onPageChange={setCurrentPage}
                onPerPageChange={setPerPage}
                label="events"
            />
        </div>
    );
}