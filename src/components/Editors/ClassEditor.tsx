"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import { useEffect, useMemo, useState } from "react";
import { ClassSavePayload, Scheme } from "@/types";
import toast from "react-hot-toast";

export default function ClassEditor({
    name: initialName = "",
    class_sponsor: initialClassSponsor = "",
    default_points_scheme_id: initialDefaultPts = null,
    default_pay_scheme_id: initialDefaultPay = null,
    onSave,
    onCancel,
}: {
    name?: string;
    class_sponsor?: string | "";
    default_points_scheme_id?: string | null;
    default_pay_scheme_id?: string | null;
    onSave: (payload: ClassSavePayload) => Promise<void> | void;
    onCancel?: () => void;
}) {
    const [availSchemes, setAvailSchemes] = useState<Scheme[]>([]);

    const [name, setName] = useState(initialName);
    const [sponsor, setSponsor] = useState(initialClassSponsor ?? "");
    const [defaultPts, setDefaultPts] = useState(initialDefaultPts ?? "");
    const [defaultPay, setDefaultPay] = useState(initialDefaultPay ?? "");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setName(initialName);
        setSponsor(initialClassSponsor ?? "");
        setDefaultPts(initialDefaultPts ?? "");
        setDefaultPay(initialDefaultPay ?? "");
    }, [initialName, initialClassSponsor, initialDefaultPts, initialDefaultPay]);

    useEffect(() => {
        async function loadSchemes() {
            try {
                const schemesRes = await fetch(`/api/schemes`, { cache: "no-store" });
                const schemesJson = await schemesRes.json();

                if (!schemesRes.ok) {
                    toast.error(schemesJson?.error || "Failed to load available schemes.");
                    return;
                }

                setAvailSchemes(schemesJson);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load schemes for page.");
            } finally {
                setLoading(false);
            }
        }

        loadSchemes();
    }, []);

    const pointsSchemes = useMemo(() => availSchemes.filter((s) => s.type === "points"), [availSchemes]);
    const paySchemes = useMemo(() => availSchemes.filter((s) => s.type === "pay"), [availSchemes]);

    async function handleSave() {
        const finalName = name.trim();

        if (!finalName) {
            toast.error("Class name is required.");
            return;
        }

        setSaving(true);
        try {
            await onSave({
                name: finalName,
                class_sponsor: sponsor || "",
                default_points_scheme_id: defaultPts || null,
                default_pay_scheme_id: defaultPay || null,
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className={styles.section}>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 16,
                    }}
                >
                    <div style={{ flex: "1 1 320px", minWidth: 320 }}>
                        <label className={styles.label}>Name</label>
                        <input
                            style={{ marginTop: 5, marginBottom: 14 }}
                            className={styles.input}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Bump To Pass"
                        />
                    </div>

                    <div style={{ flex: "1 1 320px", minWidth: 320 }}>
                        <label className={styles.label}>Sponsor</label>
                        <input
                            style={{ marginTop: 5, marginBottom: 14 }}
                            className={styles.input}
                            value={sponsor}
                            onChange={(e) => setSponsor(e.target.value)}
                            placeholder="e.g. Impel Motorsports"
                        />
                    </div>
                </div>

                <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                    <div>
                        <label className={styles.label}>Default Points Scheme</label>
                        <select
                            className={styles.input}
                            value={defaultPts}
                            onChange={(e) => setDefaultPts(e.target.value)}
                            disabled={!pointsSchemes.length || saving || loading}
                        >
                            <option value="">Select a points scheme</option>
                            {pointsSchemes.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={styles.label}>Default Pay Scheme</label>
                        <select
                            className={styles.input}
                            value={defaultPay}
                            onChange={(e) => setDefaultPay(e.target.value)}
                            disabled={!paySchemes.length || saving || loading}
                        >
                            <option value="">Select a pay scheme</option>
                            {paySchemes.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.buttonGroup}>
                {onCancel && (
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={onCancel}
                        disabled={saving || loading}
                    >
                        Cancel
                    </button>
                )}

                <button
                    type="button"
                    className={styles.button}
                    onClick={handleSave}
                    disabled={saving || loading}
                >
                    {saving ? "Full send..." : "Save Class"}
                </button>
            </div>
        </>
    );
}