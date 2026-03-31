"use client";

import React from "react";
import styles from "../styles/Pagination.module.css";

interface PaginationProps {
    currentPage: number;
    perPage: number;
    totalItems: number;
    onPageChange: (newPage: number) => void;
    onPerPageChange?: (newPerPage: number) => void;
    label?: string;
}

export default function Pagination({
    currentPage, perPage, totalItems, onPageChange, onPerPageChange,
    label = "Items",
}: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const endIndex = Math.min(currentPage * perPage, totalItems);

    return (
        <div className={styles.pageBar}>
            <div className={styles.pageInfo}>
                Showing {startIndex}-{endIndex} of {totalItems} {label}
            </div>

            <div className={styles.pageControls}>
                {onPerPageChange && (
                    <>
                        <label>Per Page:</label>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                onPerPageChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                        >
                            {[5, 10, 15, 25, 50, 100].map((val) => (
                                <option key={val} value={val}>
                                    {val}
                                </option>
                            ))}
                        </select>
                    </>
                )}

                {/* First page button */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="First">«</button>
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}>‹</button>
                {/* Next button */}
                <button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage >= totalPages}>›</button>
                {/* Last page button */}
                <button
                    onClick={() => onPageChange(Math.ceil(totalItems / perPage))}
                    disabled={currentPage >= Math.ceil(totalItems / perPage)}
                    title="Last">»</button>
            </div>
        </div>
    );
}