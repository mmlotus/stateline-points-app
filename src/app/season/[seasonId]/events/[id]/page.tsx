"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EventCreatePayload, EventRow } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import EventEditor from "@/components/Editors/EventEditor";

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams<{ seasonId: string; id: string }>();
    
    const seasonId = params.seasonId;
    const eventId = params.id;

    const [eventData, setEventData] = useState<EventRow | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadEvent() {
            try {
                const res = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data?.error || "Failed to load event.");
                    router.push("/season")
                    return;
                }

                setEventData(data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load event.");
                router.push("/season");
            } finally {
                setLoading(false);
            }
        }

        if (eventId) loadEvent();
    }, [eventId, router]);

    async function handleSave(payload: EventCreatePayload) {
        const tId = toast.loading("Updating event...");

        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Failed to update event.", { id: tId });
                return;
            }

            toast.success("Event updated.", { id: tId });
            router.push("/season");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update event.", { id: tId });
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Edit Event</h1>
            </div>

            <EventEditor
                seasonId={seasonId}
                event={eventData}
                onSave={handleSave}
                onCancel={() => router.push("/season")}
            />
        </div>
    );
}