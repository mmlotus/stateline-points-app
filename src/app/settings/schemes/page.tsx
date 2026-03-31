"use client";

import { Scheme } from "@/types";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";
import Pagination from "@/components/Pagination";
import { formatDate } from "@/components/Formatter";
import { ChevronDown, ChevronUp, Copy, Pencil, TrashIcon } from "lucide-react";

type SchemeSortKey = "name" | "created_at" | "updated_at" | "is_active";

export default function SchemesPage() {
    const router = useRouter();

    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [pointsPage, setPointsPage] = useState(1);
    const [payPage, setPayPage] = useState(1);

    const [sortConfig, setSortConfig] = useState<{ key: SchemeSortKey; direction: "asc" | "desc" }>({
        key: "updated_at",
        direction: "desc",
    });

    const handleSort = (key: SchemeSortKey) => {
        setSortConfig((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    };

    async function loadSchemes(showToast = false) {
        const tId = showToast ? toast.loading("Loading schemes...") : undefined;

        try {
            const res = await fetch("/api/schemes", { cache: "no-store" });

            if (!res.ok) {
                if (tId) toast.error("Failed to load schemes.", { id: tId });
                else toast.error("Failed to load schemes.");
                return;
            }

            const data: Scheme[] = await res.json();
            setSchemes(data);

            if (tId) toast.dismiss(tId);
        } catch (err) {
            console.error(err);
            if (tId) toast.error("Network error loading schemes.", { id: tId });
            else toast.error("Network error loading schemes.");
        } finally {
            setLoading(false);
        }
    }

    //Prevent double-run in React
    const didLoadRef = useRef(false);

    useEffect(() => {
        if (didLoadRef.current) return;
        didLoadRef.current = true;
        loadSchemes(true);
    }, []);

    async function handleDuplicate(id: string) {
        const tId = toast.loading("Duplicating...");

        try {
            const res = await fetch(`/api/schemes/${id}/duplicate`, { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Failed to duplicate.", { id: tId });
                return;
            }

            toast.success("Copied successfully!", { id: tId });

            await loadSchemes(false);
        } catch (e) {
            console.error(e);
            toast.error("Failed to duplicate scheme.", { id: tId });
        }
    }

    async function handleDelete(id: string, name: string) {
        const ok = confirm(`Delete scheme "${name}"?\n\nThis cannot be undone.`);
        if (!ok) return;

        const tId = toast.loading("Deleting...");

        try {
            const res = await fetch(`/api/schemes/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Failed to delete.", { id: tId });
                return;
            }

            toast.success("Deleted.", { id: tId });

            setSchemes((prev) => prev.filter((s) => s.id !== id));
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete scheme.", { id: tId });
        }
    }

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(schemes.length / perPage));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [schemes.length, perPage, currentPage]);

    const sortedSchemes = useMemo(() => {
        const list = [...schemes];

        list.sort((a, b) => {
            const dir = sortConfig.direction === "asc" ? 1 : -1;

            switch (sortConfig.key) {
                case "created_at":
                    return (
                        (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir
                    );

                case "updated_at":
                    return (
                        (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir
                    );

                case "is_active":
                    return (a.is_active === b.is_active ? 0 : a.is_active ? 1 : -1) * dir;

                case "name":
                default:
                    return a.name.localeCompare(b.name) * dir;
            }
        });

        return list;
    }, [schemes, sortConfig]);

    const pointsSchemes = useMemo(() => sortedSchemes.filter((s) => s.type === "points"), [sortedSchemes]);
    const paySchemes = useMemo(() => sortedSchemes.filter((s) => s.type === "pay"), [sortedSchemes]);

    const visiblePoints = useMemo(() => {
        const start = (pointsPage - 1) * perPage;
        return pointsSchemes.slice(start, start + perPage);
    }, [pointsSchemes, pointsPage, perPage]);

    const visiblePay = useMemo(() => {
        const start = (payPage - 1) * perPage;
        return paySchemes.slice(start, start + perPage);
    }, [paySchemes, payPage, perPage]);

    const SortHeader = ({ label, sortKey }: { label: string; sortKey: SchemeSortKey }) => (
        <div onClick={() => handleSort(sortKey)} className={styles.sortHeader}>
            {label}
            {sortConfig.key === sortKey ? (
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

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Points &amp; Pay Schemes</h1>

                <div className={custStyles.tools}>
                    <button
                        className={styles.button}
                        onClick={() => router.push("/settings/schemes/new")}
                    >
                        + New Scheme
                    </button>
                </div>
            </div>

            {/* POINTS TABLE */}
            {/* TOP PAGINATION */}
            <Pagination
                currentPage={pointsPage}
                perPage={perPage}
                totalItems={pointsSchemes.length}
                onPageChange={setPointsPage}
                onPerPageChange={(n: number) => {
                    setPerPage(n);
                    setPointsPage(1);
                    setPayPage(1);
                }}
                label="Points Schemes"
            />

            <div className={custStyles.tableWrap}>
                <table className={custStyles.table}>
                    <thead>
                        <tr>
                            <th colSpan={5} className={custStyles.favoritesHeader}>POINTS</th>
                        </tr>
                    </thead>
                    <thead>
                        <tr>
                            <th><SortHeader label="Name" sortKey="name" /></th>
                            <th><SortHeader label="Created On" sortKey="created_at" /></th>
                            <th><SortHeader label="Active" sortKey="is_active" /></th>
                            <th><SortHeader label="Last Updated" sortKey="updated_at" /></th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {pointsSchemes.length === 0 ? (
                            <tr>
                                <td className={custStyles.empty} colSpan={5}>
                                    No points schemes created yet.
                                </td>
                            </tr>
                        ) : (
                            visiblePoints.map((scheme) => (
                                <Fragment key={scheme.id}>
                                    <tr>
                                        <td className={custStyles.name}>
                                            {scheme.name}

                                            {scheme.description && (
                                                <div
                                                    className={styles.description}
                                                    style={{ fontWeight: 400, fontSize: "0.8rem", opacity: 0.85, marginTop: 4 }}>
                                                    {scheme.description}
                                                </div>
                                            )}
                                        </td>

                                        <td>{formatDate(scheme.created_at)}</td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={scheme.is_active}
                                                readOnly
                                            />
                                        </td>
                                        <td>{formatDate(scheme.updated_at)}</td>

                                        <td className={custStyles.right}>
                                            <button
                                                className={styles.iconButton}
                                                onClick={() => router.push(`/settings/schemes/${scheme.id}`)}
                                                aria-label="Edit scheme"
                                                title="Edit scheme"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                className={styles.iconButton}
                                                onClick={() => handleDuplicate(scheme.id)}
                                                aria-label="Make a copy"
                                                title="Make a copy"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                className={styles.iconButton}
                                                onClick={() => handleDelete(scheme.id, scheme.name)}
                                                aria-label="Delete scheme"
                                                title="Delete"
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* BOTTOM PAGINATION */}
            {schemes.length > perPage && (
                <Pagination
                    currentPage={pointsPage}
                    perPage={perPage}
                    totalItems={pointsSchemes.length}
                    onPageChange={setPointsPage}
                    onPerPageChange={(n: number) => {
                        setPerPage(n);
                        setPointsPage(1);
                        setPayPage(1);
                    }}
                    label="Points Schemes"
                />
            )}
            <div style={{ marginTop: "2rem" }}>
                {/* PAY SCHEME TABLE */}
                {/* TOP PAGINATION */}
                <Pagination
                    currentPage={payPage}
                    perPage={perPage}
                    totalItems={paySchemes.length}
                    onPageChange={setPayPage}
                    onPerPageChange={(n: number) => {
                        setPerPage(n);
                        setPointsPage(1);
                        setPayPage(1);
                    }}
                    label="Pay Schemes"
                />

                <div className={custStyles.tableWrap}>
                    <table className={custStyles.table}>
                        <thead>
                            <tr>
                                <th colSpan={5} className={custStyles.favoritesHeader}>PAYOUTS</th>
                            </tr>
                        </thead>
                        <thead>
                            <tr>
                                <th><SortHeader label="Name" sortKey="name" /></th>
                                <th><SortHeader label="Created On" sortKey="created_at" /></th>
                                <th><SortHeader label="Active" sortKey="is_active" /></th>
                                <th><SortHeader label="Last Updated" sortKey="updated_at" /></th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {paySchemes.length === 0 ? (
                                <tr>
                                    <td className={custStyles.empty} colSpan={5}>
                                        No pay schemes created yet.
                                    </td>
                                </tr>
                            ) : (
                                visiblePay.map((scheme) => (
                                    <Fragment key={scheme.id}>
                                        <tr>
                                            <td className={custStyles.name}>
                                                {scheme.name}

                                                {scheme.description && (
                                                    <div
                                                        className={styles.description}
                                                        style={{ fontWeight: 400, fontSize: "0.8rem", opacity: 0.85, marginTop: 4 }}>
                                                        {scheme.description}
                                                    </div>
                                                )}
                                            </td>

                                            <td>{formatDate(scheme.created_at)}</td>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={scheme.is_active}
                                                    readOnly
                                                />
                                            </td>
                                            <td>{formatDate(scheme.updated_at)}</td>

                                            <td className={custStyles.right}>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => router.push(`/settings/schemes/${scheme.id}`)}
                                                    aria-label="Edit scheme"
                                                    title="Edit scheme"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => handleDuplicate(scheme.id)}
                                                    aria-label="Make a copy"
                                                    title="Make a copy"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => handleDelete(scheme.id, scheme.name)}
                                                    aria-label="Delete scheme"
                                                    title="Delete"
                                                >
                                                    <TrashIcon size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* BOTTOM PAGINATION */}
                {schemes.length > perPage && (
                    <Pagination
                        currentPage={payPage}
                        perPage={perPage}
                        totalItems={paySchemes.length}
                        onPageChange={setPayPage}
                        onPerPageChange={(n: number) => {
                            setPerPage(n);
                            setPointsPage(1);
                            setPayPage(1);
                        }}
                        label="Pay Schemes"
                    />
                )}
            </div>
        </div>
    );
}