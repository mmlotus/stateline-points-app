"use client";

import { EventClassWithClassName } from "@/types";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import styles from "@/styles/CustomSelect.module.css";
import { ChevronDown } from "lucide-react";

export default function ClassSelect({
    classes,
    activeClassId,
    onSelect,
}: {
    classes: EventClassWithClassName[];
    activeClassId: string | null;
    onSelect: (classId: string) => Promise<void> | void;
}) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [open, setOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassId);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSelectedClassId(activeClassId);
    }, [activeClassId]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleSelect(classId: string) {
        const tId = toast.loading("Switching class...");
        setLoading(true);

        try {
            await onSelect(classId);
            setSelectedClassId(classId);
            setOpen(false);
            toast.dismiss(tId);
        } catch {
            toast.error("Failed to switch class.", { id: tId });
        } finally {
            setLoading(false);
        }
    }

    const activeClassName =
        classes.find((c) => c.id === selectedClassId)?.class_name || "Select Class";

    return (
        <div className={styles.customSelect} ref={dropdownRef}>
            <button
                type="button"
                className={styles.customSelectTrigger2}
                onClick={() => setOpen((o) => !o)}
                disabled={loading}
            >
                {activeClassName}
                <ChevronDown size={12} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} />
            </button>

            {open && (
                <div className={styles.customSelectMenu}>
                    {classes.map((c) => (
                        <div
                            key={c.id}
                            className={`${styles.customSelectItem} ${c.id === selectedClassId ? styles.activeItem : ""
                                }`}
                            onClick={() => handleSelect(c.id)}
                        >
                            {c.class_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}