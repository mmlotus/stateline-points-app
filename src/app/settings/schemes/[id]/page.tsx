"use client";

import toast from "react-hot-toast";
import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EditableSchemePayload, SchemeBreakdownRow, SchemeLine, SchemeSavePayload } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import SchemeEditor from "@/components/Editors/SchemeEditor";


export default function EditSchemePage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<EditableSchemePayload | null>(null);
    const [, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadScheme() {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(`/api/schemes/${id}`, { cache: "no-store" });

                if (!res.ok) {
                    let msg = `Failed to load scheme (${res.status})`;
                    try {
                        const err = await res.json();
                        if (err?.error) msg = err.error;
                    } catch { }
                    setError(msg);
                    toast.error(msg);
                    return;
                }

                const data = await res.json();

                setInitialData({
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    is_active: data.is_active,
                    continuous_feature_points: data.continuous_feature_points,
                    pay_show_b_main: data.pay_show_b_main ?? false,
                    add_points_enabled: data.add_points_enabled ?? false,
                    add_points_label: data.add_points_label,
                    show_up_points_enabled: data.show_up_points_enabled,
                    show_up_start_points: data.show_up_start_points,
                    show_up_non_start_points: data.show_up_non_start_points,
                    breakdowns: ((data.breakdowns || []) as SchemeBreakdownRow[]).map((b) => ({
                        id: b.id,
                        type: b.type,
                        exclude_show_up_points: b.exclude_show_up_points,
                        result_modifiers: b.result_modifiers,

                        transfer_exclusions_enabled: b.transfer_exclusions_enabled ?? false,
                        transfer_exclusion_races:
                            typeof b.transfer_exclusion_races === "string"
                                ? JSON.parse(b.transfer_exclusion_races)
                                : b.transfer_exclusion_races ?? [],

                        passing_points_enabled: b.passing_points_enabled ?? false,
                        passing_points_gain_value: b.passing_points_gain_value ?? 0,
                        passing_points_lost_value: b.passing_points_lost_value ?? 0,

                        lines: ((b.lines || []) as SchemeLine[]).map((line) => ({
                            client_id: crypto.randomUUID(),
                            start_position:
                                line.end_position === null
                                    ? `${line.start_position}+`
                                    : String(line.start_position),
                            value: Number(line.value),
                        })),
                    })),
                });
            } catch (e) {
                console.error(e);
                setError("Network error loading scheme.");
                toast.error("Network error loading scheme.");
            } finally {
                setLoading(false);
            }
        }

        if (id) loadScheme();
    }, [id]);

    async function handleSave(payload: SchemeSavePayload) {
        const tId = toast.loading("Saving changes...");

        try {
            const res = await fetch(`/api/schemes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = `Failed to update scheme (${res.status})`;
                try {
                    const err = await res.json();
                    if (err?.error) msg = err.error;
                } catch { }
                toast.error(msg, { id: tId });
                return;
            }

            toast.success("Scheme updated!", { id: tId });
            router.push("/settings/schemes");
        } catch (e) {
            console.error(e);
            toast.error("Network error updating scheme.", { id: tId });
        }
    }

    if (loading || !initialData) return <LoadingSpinner />;

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Edit {initialData.name}</h1>

                <button
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => router.push("/settings/schemes")}
                >
                    Cancel
                </button>
            </div>
            <SchemeEditor
                initialData={initialData}
                onSave={handleSave}
            />
        </div>
    );
}