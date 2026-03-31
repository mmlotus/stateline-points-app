"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { EventCreatePayload } from "@/types";
import EventEditor from "@/components/Editors/EventEditor";

export default function NewEventPage() {
    const router = useRouter();
    const params = useParams<{ seasonId: string }>();
    const seasonId = params.seasonId;

    async function handleSave(payload: EventCreatePayload) {
        const tId = toast.loading("Creating new event...");

        try {
            const res = await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = "Failed to create new event.";
                try {
                    const err = await res.json();
                    if (err?.error) msg = err.error;
                } catch {}
                toast.error(msg, { id: tId });
                console.error("Failed to create event");
                return;
            }

            const created = await res.json();

            if (!created?.id) {
                toast.error("Event created but no ID returned.", { id: tId });
                return;
            }

            toast.success("Event created!", { id: tId });
            router.push(`/season`);
        } catch (err) {
            console.error(err);
            toast.error("Network error creating event.", { id: tId });
        }
    }

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>New Event</h1>
            </div>
            <EventEditor
                seasonId={seasonId}
                onSave={handleSave}
                onCancel={() => router.push("/season")}    
            />
        </div>
    );
}