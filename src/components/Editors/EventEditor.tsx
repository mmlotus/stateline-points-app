"use client";

import styles from "@/styles/Global.module.css";
import { Class, DEFAULT_STATUS, EVENT_STATUS_OPTIONS, EventCreatePayload, EventRow, EventStatus } from "@/types";
import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import TagSelector from "../TagSelector";

export default function EventEditor({
    seasonId,
    event,
    onSave,
    onCancel,
}: {
    seasonId: string;
    event?: EventRow | null;
    onSave: (payload: EventCreatePayload) => Promise<void> | void;
    onCancel?: () => void;
}) {
    const [saving, setSaving] = useState(false);
    const [showFloatingSave, setShowFloatingSave] = useState(false);
    const saveBtnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const el = saveBtnRef.current;
        if (!el) return;

        const obs = new IntersectionObserver(
            ([entry]) => {
                setShowFloatingSave(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0.1,
            }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const [eventName, setEventName] = useState(event?.name ?? "");
    const [eventDate, setEventDate] = useState<string>(event?.event_date?.slice(0, 10) ?? "");
    const [eventStatus, setEventStatus] = useState<EventStatus>(event?.status ?? DEFAULT_STATUS);
    const [eventNotes, setEventNotes] = useState(event?.notes ?? "");

    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(event?.class_ids ?? []);
    const [loadingClasses, setLoadingClasses] = useState(true);

    useEffect(() => {
        async function loadClasses() {
            try {
                const res = await fetch("/api/classes", { cache: "no-store" });
                const data: Class[] = await res.json();

                if (!res.ok) {
                    toast.error("Failed to load classes.");
                    return;
                }

                setClasses(data);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load classes.");
            } finally {
                setLoadingClasses(false);
            }
        }

        loadClasses();
    }, []);

    useEffect(() => {
        if (!event) return;

        setEventName(event.name ?? "");
        setEventDate(event.event_date?.slice(0, 10) ?? "");
        setEventStatus(event.status ?? DEFAULT_STATUS);
        setEventNotes(event.notes ?? "");
        setSelectedClassIds(event.class_ids ?? []);
    }, [event]);

    async function handleCreate() {
        if (!eventName) {
            toast.error("Please enter a name for this event.");
            return;
        }
        if (!eventDate) {
            toast.error("Please select an event date.");
            return;
        }

        if (!selectedClassIds.length) {
            toast.error("Please select at least one class.");
            return;
        }

        const payload: EventCreatePayload = {
            season_id: seasonId,
            event_date: eventDate,
            name: eventName.trim(),
            status: eventStatus,
            notes: eventNotes.trim() ? eventNotes.trim() : null,
            class_ids: selectedClassIds,
        };

        setSaving(true);
        try {
            await onSave(payload);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save event.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {showFloatingSave && (
                <button
                    type="button"
                    className={styles.floatingSave}
                    onClick={handleCreate}
                    aria-label="Save changes"
                    title="Save changes"
                    disabled={saving || loadingClasses}
                >
                    <Save size={18} />
                </button>
            )}

            {/* EVENT DETAILS */}
            <div className={styles.section}>
                <label className={styles.label}>Name</label>
                <input
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Fiesta Night!, SNEVA Memorial, etc."
                />

                <label className={styles.label}>Date</label>
                <input
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                />

                <label className={styles.label}>Status</label>
                <select
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={eventStatus}
                    onChange={(e) => setEventStatus(e.target.value as EventStatus)}
                >
                    {EVENT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>

                <label className={styles.label}>Classes</label>
                <div style={{ marginTop: 5, marginBottom: 14 }}>
                    <TagSelector
                        options={classes.map((c) => c.id)}
                        selected={selectedClassIds}
                        onChange={setSelectedClassIds}
                        labelForValue={(val) =>
                            classes.find((c) => c.id === val)?.name || val
                        }
                    />
                </div>

                <label className={styles.label}>Notes</label>
                <textarea
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.textarea}
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    placeholder="(Optional)"
                />
            </div>

            <div className={styles.buttonGroup}>
                {onCancel && (
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={onCancel}
                        disabled={saving || loadingClasses}
                    >
                        Cancel
                    </button>
                )}

                <button
                    ref={saveBtnRef}
                    type="button"
                    className={styles.button}
                    onClick={handleCreate}
                    disabled={saving || loadingClasses}
                >
                    {saving ? "Full send..." : "Save Event"}
                </button>
            </div>
        </>
    );
}