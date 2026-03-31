"use client";

import styles from "@/styles/Global.module.css";
import { useEffect, useState } from "react";
import { Tag, DriverCreatePayload } from "@/types";
import toast from "react-hot-toast";
import TagSelector from "../TagSelector";

export default function DriverEditor({
    name: initialName = "",
    default_car: initialDefaultCar = "",
    is_active: initialIsActive = true,
    tags: initialTags,
    onSave,
    onCancel,
}: {
    name?: string;
    default_car?: string;
    is_active?: boolean;
    tags?: Tag[];
    onSave: (payload: DriverCreatePayload) => Promise<void> | void;
    onCancel?: () => void;
}) {
    const [name, setName] = useState(initialName);
    const [defaultCar, setDefaultCar] = useState(initialDefaultCar);
    const [isActive, setIsActive] = useState(initialIsActive);

    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>((initialTags || []).map((tag) => tag.id));
    const [newTags, setNewTags] = useState<string[]>([]);

    const [loadingTags, setLoadingTags] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setName(initialName);
        setDefaultCar(initialDefaultCar);
        setIsActive(initialIsActive);
        setSelectedTagIds((initialTags || []).map((tag) => tag.id));
        setNewTags([]);
    }, [initialName, initialDefaultCar, initialIsActive, initialTags]);

    useEffect(() => {
        let mounted = true;

        async function loadTags() {
            try {
                setLoadingTags(true);

                const res = await fetch("/api/tags", { cache: "no-store" });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.error || "Failed to load tags.");
                }

                if (mounted) {
                    setAvailableTags(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load tags.");
            } finally {
                if (mounted) {
                    setLoadingTags(false);
                }
            }
        }

        loadTags();

        return () => {
            mounted = false;
        };
    }, []);

    const selectableOptions = [
        ...availableTags.map((tag) => tag.id),
        ...newTags,
    ];

    function handleTagsChange(values: string[]) {
        const existingIds = values.filter((val) =>
            availableTags.some((tag) => tag.id === val));

        const createdNames = values.filter(
            (val) => !availableTags.some((tag) => tag.id === val)
        );

        setSelectedTagIds(existingIds);
        setNewTags(createdNames);
    }

    async function handleSave() {
        const finalName = name.trim();
        const finalDefaultCar = defaultCar.trim();

        if (!finalName) {
            toast.error("Driver name is required.");
            return;
        }

        setSaving(true);
        try {
            await onSave({
                name: finalName,
                default_car: finalDefaultCar || undefined,
                is_active: isActive,
                tag_ids: selectedTagIds,
                new_tags: newTags,
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className={styles.section}>
                <label className={styles.label}>Driver Name</label>
                <input
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Debbie Driver"
                />

                <label className={styles.label}>Default Car #</label>
                <input
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={defaultCar}
                    onChange={(e) => setDefaultCar(e.target.value)}
                    placeholder="e.g. 03, 7, 21T"
                />

                <label className={styles.label}>Status</label>
                <select
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>

                <label className={styles.label}>Tags</label>
                <div style={{ marginTop: 5, marginBottom: 14 }}>
                    <TagSelector
                        options={selectableOptions}
                        selected={[...selectedTagIds, ...newTags]}
                        onChange={handleTagsChange}
                        labelForValue={(val) => {
                            const existing = availableTags.find((tag) => tag.id === val);
                            return existing ? existing.name : val;
                        }}
                        placeholder={loadingTags ? "Loading tags..." : "Type tag & press 'Enter'..."}
                    />
                </div>
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
                    {saving ? "Full send..." : "Save Driver"}
                </button>
            </div>
        </>
    );
}