"use client";
import React from "react";
import styles from "../styles/Global.module.css";

{/* FILTER BUTTONS */ }
type Filters = Record<string, string | number | boolean | null>;

interface FilterButtonProps {
    label: string;
    value: string | number;
    field: string;
    filters: Filters,
    setFilters: React.Dispatch<React.SetStateAction<Filters>>;
    handleSearch: (next: Filters) => void
}

export const FilterButton: React.FC<FilterButtonProps> = ({
    label, value, field,
    filters, setFilters, handleSearch,
}) => {
    const isActive = filters[field] === value;

    const handleClick = () => {
        const next = { ...filters, [field]: isActive ? "" : value };
        setFilters(next);
        handleSearch(next);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${styles.filterBtn} ${isActive ? styles.filterBtnActive : ""}`}
        >
            {label}
        </button>
    );
};