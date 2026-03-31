"use client";

import styles from "@/styles/Global.module.css";
import { useMemo, useState } from "react";
import { SeasonCreatePayload } from "@/types";
import toast from "react-hot-toast";

function defaultName(year: string) {
    return year ? `${year} Season` : "";
}

export default function SeasonEditor({
    onSave,
}: {
    onSave: (payload: SeasonCreatePayload) => Promise<void> | void;
}) {
    const currentYear = new Date().getFullYear();

    const years = useMemo(() => {
        const list: string[] = [];
        for (let y = currentYear + 5; y >= currentYear - 3; y--) list.push(String(y));
        return list;
    }, [currentYear]);

    const [year, setYear] = useState("");
    const [nameOverride, setNameOverride] = useState("");
    const [, setSaving] = useState(false);

    const finalName = nameOverride.trim() || defaultName(year);

    async function handleCreate() {
        if (!year) {
            toast.error("Please select a year.");
            return;
        }
        if (!finalName) {
            toast.error("Season name is required.");
            return;
        }

        setSaving(true);
        try {
            await onSave({ year, name: finalName });
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className={styles.section}>
                <label className={styles.label}>Year</label>
                <select
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                >
                    <option value="">Select Year</option>
                    {years.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>

                <label className={styles.label}>Season Name</label>
                <input
                    style={{ marginTop: 5 }}
                    className={styles.input}
                    value={nameOverride}
                    onChange={(e) => setNameOverride(e.target.value)}
                    placeholder={year ? `${year} Season` : "Select a year first or manually override"}
                />
            </div>

            <div className={styles.buttonGroup}>
                <button
                    type="button"
                    className={styles.button}
                    onClick={handleCreate}
                >
                    Create
                </button>
            </div>
        </>
    );
}