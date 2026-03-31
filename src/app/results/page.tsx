"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { EventRow } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatDate } from "@/components/Formatter";

type EventRowWithSeason = EventRow & {
    season_name?: string;
    class_names?: string[];
};

export default function RacesHomePage() {
    const router = useRouter();

    const [events, setEvents] = useState<EventRowWithSeason[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadEvents() {
        setLoading(true);

        try {
            const res = await fetch("/api/events/upcoming-for-entries", {
                cache: "no-store",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load upcoming events.");
            }

            setEvents(data || []);
        } catch (error: unknown) {
            console.error(error);
            toast.error("Failed to load upcoming events.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadEvents();
    }, []);

    const upcomingEvents = useMemo(() => events || [], [events]);

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Select Event to Enter Results</h1>
                <div className={styles.muted}>
                    Upcoming events only. Past events can still be managed from Season Schedule.
                </div>
            </div>

            {!upcomingEvents.length ? (
                <p className={styles.muted}>No upcoming events available for entries.</p>
            ) : (
                <div className={custStyles.tableWrap}>
                    <table className={custStyles.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Event Name</th>
                                <th>Status</th>
                                <th>Classes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upcomingEvents.map((event) => (
                                <tr
                                    key={event.id}
                                    onClick={() =>
                                        router.push(
                                            `/season/${event.season_id}/events/${event.id}/results`
                                        )
                                    }
                                    style={{ cursor: "pointer" }}
                                    title="Let's goooo!"
                                >
                                    <td>{formatDate(event.event_date)}</td>
                                    <td>{event.name}</td>
                                    <td>{event.status}</td>
                                    <td>
                                        {event.class_names?.length
                                            ? event.class_names.join(", ")
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}