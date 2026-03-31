"use client";

import styles from "@/styles/Global.module.css";
import { useState } from "react";
import { Class } from "@/types";
import toast from "react-hot-toast";

export default function ClassEditor({
    name: initialName = "",
    onSave,
    onCancel,
}: {
    name?: string;
    onSave: (payload: Pick<Class, "name">) => Promise<void> | void;
    onCancel?: () => void;
}) {
    const [name, setName] = useState(initialName);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        const finalName = name.trim();

        if (!finalName) {
            toast.error("Class name is required.");
            return;
        }

        setSaving(true);
        try {
            await onSave({ name: finalName });
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className={styles.section}>
                <label className={styles.label}>Class Name</label>
                <input
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hangry's Bump To Pass"
                />
            </div>

            <div className={styles.buttonGroup}>
                {onCancel && (
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                )}

                <button
                    type="button"
                    className={styles.button}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Full send..." : "Save Class"}
                </button>
            </div>
        </>
    );
}