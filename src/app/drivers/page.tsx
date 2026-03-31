"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Driver } from "@/types";
import { useSortableData } from "@/lib/useSortableData";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import { Pencil, TrashIcon } from "lucide-react";

export default function DriversPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [drivers, setDrivers] = useState<Driver[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [tagFilter, setTagFilter] = useState("all");

    const filteredDrivers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return drivers.filter((driver) => {
            const name = (driver.name || "").toLowerCase();
            const carNumber = (driver.default_car || "").toLowerCase();

            const matchesSearch = !term || name.includes(term) || carNumber.includes(term);
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && driver.is_active) ||
                (statusFilter === "inactive" && !driver.is_active);

                const matchesTag =
                    tagFilter === "all" ||
                    (driver.tags || []).some((tag) => tag.id === tagFilter);

            return matchesSearch && matchesStatus && matchesTag;
        });
    }, [drivers, searchTerm, statusFilter, tagFilter]);

    const distinctTags = useMemo(() => {
        const tagMap = new Map<string, string>();

        for (const driver of drivers) {
            for (const tag of driver.tags || []) {
                if (!tagMap.has(tag.id)) {
                    tagMap.set(tag.id, tag.name);
                }
            }
        }

        return Array.from(tagMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [drivers]);

    const {
        SortHeader,
        sortedData: sortedDrivers,
        paginatedData: paginatedDrivers,
        currentPage,
        setCurrentPage,
        perPage,
        setPerPage,
    } = useSortableData<Driver>({
        data: filteredDrivers,
        initialKey: "name",
        dateKeys: ["created_at"],
        initialPerPage: 25,
    });

    async function loadDrivers(showToast = false) {
        const tId = showToast ? toast.loading("Loading drivers...") : undefined;

        try {
            const dRes = await fetch("/api/drivers", { cache: "no-store" });
            if (!dRes.ok) {
                if (tId) toast.error("Failed to load drivers.", { id: tId });
                else toast.error("Failed to load all drivers.");
                return;
            }

            const d: Driver[] = await dRes.json();
            setDrivers(d);

            if (tId) toast.dismiss(tId);
        } catch (err) {
            console.error(err);
            if (tId) toast.error("Failed to load drivers.", { id: tId });
            else toast.error("Failed to load all drivers.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDrivers(false);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, tagFilter, setCurrentPage]);

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete driver "${name}"?`)) return;

        const tId = toast.loading("Deleting driver...");
        try {
            const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) {
                toast.error("Failed to delete driver.", { id: tId });
                return;
            }

            toast.success("Driver deleted.", { id: tId });
            await loadDrivers(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete driver.", { id: tId });
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Drivers</h1>

                <div className={custStyles.tools}>
                    <button
                        className={styles.button}
                        onClick={() => {
                            router.push("/drivers/new");
                        }}
                    >
                        + New Driver
                    </button>
                </div>
            </div>

            <div className={custStyles.tools} style={{ marginBottom: "1rem", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Search by name or car #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ minWidth: "260px" }}
                    />
                </div>

                <div>
                    <select
                        className={styles.input}
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value as "all" | "active" | "inactive")
                        }
                        style={{ minWidth: "180px" }}
                    >
                        <option value="all">All drivers</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>

                <div>
                    <select
                        className={styles.input}
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        style={{ minWidth: "180px" }}
                    >
                        <option value="all">All tags</option>
                        {distinctTags.map((tag) => (
                            <option key={tag.id} value={tag.id}>
                                {tag.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                perPage={perPage}
                totalItems={sortedDrivers.length}
                onPageChange={setCurrentPage}
                onPerPageChange={setPerPage}
                label="drivers"
            />

            <div className={custStyles.tableWrap}>
                <table className={custStyles.table}>
                    <thead>
                        <tr>
                            <th><SortHeader label="Name" sortKey="name" /></th>
                            <th><SortHeader label="Default Car" sortKey="default_car" /></th>
                            <th><SortHeader label="Active?" sortKey="is_active" /></th>
                            <th>Tags</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {!sortedDrivers.length ? (
                            <tr>
                                <td className={custStyles.empty} colSpan={5}>
                                    No drivers yet!
                                </td>
                            </tr>
                        ) : (
                            paginatedDrivers.map((driverItem) => (
                                <tr key={driverItem.id}>
                                    <td style={{ textAlign: "center" }}>{driverItem.name}</td>
                                    <td style={{ textAlign: "center" }}>{driverItem.default_car}</td>
                                    <td style={{ textAlign: "center" }}>{driverItem.is_active ? "Yes" : "-"}</td>
                                    <td>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                                            {(driverItem.tags || []).length ? (
                                                driverItem.tags!.map((tag) => (
                                                    <span
                                                        key={tag.id}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            padding: "0.2rem 0.55rem",
                                                            borderRadius: "999px",
                                                            fontSize: "0.8rem",
                                                            background: "#e5e7eb",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ opacity: 0.6 }}>-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={custStyles.right}>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() =>
                                                router.push(`/drivers/${driverItem.id}`)
                                            }
                                            aria-label="Edit driver"
                                            title="Edit driver"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className={styles.iconButton}
                                            onClick={() => handleDelete(driverItem.id, driverItem.name)}
                                            aria-label="Delete driver"
                                            title="Delete"
                                        >
                                            <TrashIcon size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                perPage={perPage}
                totalItems={sortedDrivers.length}
                onPageChange={setCurrentPage}
                onPerPageChange={setPerPage}
                label="drivers"
            />
        </div>
    );
}