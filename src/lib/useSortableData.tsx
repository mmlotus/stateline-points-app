"use client";

import SortableHeader from "@/components/SortableHeader";
import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortConfig<T> = {
    key: keyof T;
    direction: SortDirection;
};

type UseSortableDataOptions<T> = {
    data: T[];
    initialKey: keyof T;
    initialDirection?: SortDirection;
    dateKeys?: (keyof T)[];
    initialPage?: number;
    initialPerPage?: number;
};

export function useSortableData<T extends Record<string, unknown>>({
    data,
    initialKey,
    initialDirection = "asc",
    dateKeys = [],
    initialPage = 1,
    initialPerPage = 25,
}: UseSortableDataOptions<T>) {
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
        key: initialKey,
        direction: initialDirection,
    });

    const [currentPage, setCurrentPage] = useState(initialPage);
    const [perPage, setPerPage] = useState(initialPerPage);

    const handleSort = (key: keyof T) => {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
        setCurrentPage(1);
    };

    const sortedData = useMemo(() => {
        const dir = sortConfig.direction === "asc" ? 1 : -1;
        const key = sortConfig.key;
        const list = [...data];

        list.sort((a, b) => {
            const av = a[key];
            const bv = b[key];

            if (dateKeys.includes(key)) {
                const aTime = av ? new Date(av as string).getTime() : 0;
                const bTime = bv ? new Date(bv as string).getTime() : 0;
                return (aTime - bTime) * dir;
            }

            return String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
                numeric: true,
                sensitivity: "base",
            }) * dir;
        });

        return list;
    }, [data, sortConfig, dateKeys]);

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(sortedData.length / perPage));
    }, [sortedData.length, perPage]);

    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedData = useMemo(() => {
        const start = (safeCurrentPage - 1) * perPage;
        const end = start + perPage;
        return sortedData.slice(start, end);
    }, [sortedData, safeCurrentPage, perPage]);

    const BoundSortHeader = ({
        label,
        sortKey,
    }: {
        label: string;
        sortKey: keyof T;
    }) => (
        <SortableHeader<T>
            label={label}
            sortKey={sortKey}
            sortConfig={sortConfig}
            onSort={handleSort}
        />
    );

    return {
        SortHeader: BoundSortHeader,
        sortConfig,
        sortedData,
        paginatedData,
        currentPage: safeCurrentPage,
        setCurrentPage,
        perPage,
        setPerPage,
        totalPages,
    };
}