"use client";

import { SortConfig } from "@/lib/useSortableData";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "@/styles/Global.module.css";

type SortableHeaderProps<T> = {
    label: string;
    sortKey: keyof T;
    sortConfig: SortConfig<T>;
    onSort: (key: keyof T) => void;
};

export default function SortableHeader<T extends Record<string, unknown>>({
    label,
    sortKey,
    sortConfig,
    onSort,
}: SortableHeaderProps<T>) {
    const isActive = sortConfig.key === sortKey;

    return (
        <div onClick={() => onSort(sortKey)} className={styles.sortHeader}>
            {label}
            {isActive ? (
                sortConfig.direction === "asc" ? (
                    <ChevronUp size={18} />
                ) : (
                    <ChevronDown size={18} />
                )
            ) : (
                <ChevronDown size={18} className={styles.inactiveChevron} />
            )}
        </div>
    );
}