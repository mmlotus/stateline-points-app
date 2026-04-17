"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { Class, Driver, Season, SeasonClassCarWithNames } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Pencil, Trash } from "lucide-react";
import Pagination from "@/components/Pagination";
import { useSortableData } from "@/lib/useSortableData";
import { getClassDisplayName } from "@/lib/getClassName";

export default function SeasonClassCarsPage() {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [rows, setRows] = useState<SeasonClassCarWithNames[]>([]);

    const [selectedSeasonId, setSelectedSeasonId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState("");

    const [classId, setClassId] = useState("");
    const [carNumber, setCarNumber] = useState("");
    const [primaryDriverId, setPrimaryDriverId] = useState("");
    const [coDriverId, setCoDriverId] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    const filteredRows = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return rows.filter((row) => {
            const className = (row.class_name || "").toLowerCase();
            const carNum = (row.car_number || "").toLowerCase();
            const primaryName = (row.primary_driver_name || "").toLowerCase();
            const coName = (row.co_driver_name || "").toLowerCase();

            const matchesSearch =
                !term ||
                className.includes(term) ||
                carNum.includes(term) ||
                primaryName.includes(term) ||
                coName.includes(term);

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && row.is_active) ||
                (statusFilter === "inactive" && !row.is_active);

            return matchesSearch && matchesStatus;
        });
    }, [rows, searchTerm, statusFilter]);

    const {
        SortHeader,
        sortedData: sortedRows,
        paginatedData: paginatedRows,
        currentPage,
        setCurrentPage,
        perPage,
        setPerPage,
    } = useSortableData<SeasonClassCarWithNames>({
        data: filteredRows,
        initialKey: "class_name",
        initialPerPage: 10,
    });

    async function loadLookups() {
        const [seasonsRes, classesRes, driversRes] = await Promise.all([
            fetch("/api/seasons", { cache: "no-store" }),
            fetch("/api/classes", { cache: "no-store" }),
            fetch("/api/drivers", { cache: "no-store" }),
        ]);

        const seasonsJson = await seasonsRes.json();
        const classesJson = await classesRes.json();
        const driversJson = await driversRes.json();

        if (!seasonsRes.ok) throw new Error(seasonsJson.error || "Failed to load seasons.");
        if (!classesRes.ok) throw new Error(classesJson.error || "Failed to load classes.");
        if (!driversRes.ok) throw new Error(driversJson.error || "Failed to load drivers.");

        setSeasons(seasonsJson || []);
        setClasses(classesJson || []);
        setDrivers(driversJson || []);

        const firstSeasonId = seasonsJson?.[0]?.id || "";

        setSelectedSeasonId(firstSeasonId);
    }

    async function loadRows(currentSeasonId: string, currentClassId = "") {
        if (!currentSeasonId) {
            setRows([]);
            return;
        }

        const params = new URLSearchParams();
        params.set("season_id", currentSeasonId);

        if (currentClassId) {
            params.set("class_id", currentClassId);
        }

        const res = await fetch(`/api/season-class-cars?${params.toString()}`, { cache: "no-store" });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.error || "Failed to load season class cars.");
        }

        setRows(json || []);
    }

    function resetForm() {
        setEditingId("");
        setClassId("");
        setCarNumber("");
        setPrimaryDriverId("");
        setCoDriverId("");
        setIsActive(true);
    }

    function startEdit(row: SeasonClassCarWithNames) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setEditingId(row.id);
        setClassId(row.class_id);
        setCarNumber(row.car_number);
        setPrimaryDriverId(row.primary_driver_id);
        setCoDriverId(row.co_driver_id || "");
        setIsActive(row.is_active);
    }

    async function handleSave() {
        if (!selectedSeasonId || !classId || !carNumber || !primaryDriverId) {
            toast.error("Season, class, car #, & primary driver are required.");
            return;
        }

        if (coDriverId && coDriverId === primaryDriverId) {
            toast.error("Primary driver and co-driver cannot be the same.");
            return;
        }

        setSaving(true);

        try {
            const res = await fetch("/api/season-class-cars", {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...(editingId ? { id: editingId } : {}),
                    season_id: selectedSeasonId,
                    class_id: classId,
                    car_number: carNumber,
                    primary_driver_id: primaryDriverId,
                    co_driver_id: coDriverId || null,
                    is_active: isActive,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to save season class car.");
            }

            toast.success(editingId ? "Registration updated!" : "Registration complete!");

            await loadRows(selectedSeasonId, selectedClassId);
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save registration.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        const confirmed = window.confirm("Delete this car registration?");
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/season-class-cars?id=${id}`, {
                method: "DELETE",
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to delete registration.");
            }

            toast.success("Car registration deleted!");
            await loadRows(selectedSeasonId, selectedClassId);

            if (editingId === id) {
                resetForm();
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete registration.");
        }
    }

    useEffect(() => {
        async function loadPage() {
            setLoading(true);

            try {
                await loadLookups();
            } catch (error) {
                console.error(error);
                toast.error("Failed to load page.");
            } finally {
                setLoading(false);
            }
        }

        loadPage();
    }, []);

    useEffect(() => {
        if (!selectedSeasonId) return;

        loadRows(selectedSeasonId, selectedClassId).catch((error) => {
            console.error(error);
            toast.error(error.message || "Failed to load registration.");
        });
    }, [selectedSeasonId, selectedClassId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, setCurrentPage]);

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Season Class Cars</h1>
                <div className={styles.muted}>
                    Register car #s & driver pairings by season & class.
                </div>
            </div>

            <div className={styles.topRow}>
                <div className={styles.topHalf}>
                    <div className={custStyles.header} style={{ padding: 0, marginBottom: 12 }}>
                        <h2 className={styles.subheading}>View Registrations</h2>
                    </div>

                    <div className={custStyles.tools} style={{ gap: 12, flexWrap: "wrap" }}>
                        <div>
                            <label className={styles.label}>Season</label>
                            <select
                                className={styles.input}
                                value={selectedSeasonId}
                                onChange={(e) => setSelectedSeasonId(e.target.value)}
                            >
                                <option value="">Select season</option>
                                {seasons.map((season) => (
                                    <option key={season.id} value={season.id}>
                                        {season.year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={styles.label}>Filter Class</label>
                            <select
                                className={styles.input}
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                            >
                                <option value="">All classes</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {getClassDisplayName(cls)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginTop: 50 }}>
                            <label className={styles.label}>Search</label>
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
                            <label className={styles.label}>Filter Status</label>
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
                    </div>
                </div>

                <div className={styles.separator} />

                <div className={styles.topHalf}>
                    <div className={custStyles.header} style={{ padding: 0, marginBottom: 2 }}>
                        <h2 className={styles.subheading}>{editingId ? "Edit Registration" : "Add Registration"}</h2>
                    </div>
                    <p className={styles.muted} style={{ marginTop: 0, marginBottom: 12 }}>
                        {selectedSeasonId
                            ? `Season: ${seasons.find((s) => s.id === selectedSeasonId)?.year ?? ""}`
                            : "Select a season above first."}
                    </p>

                    <div className={custStyles.tools} style={{ gap: 12, flexWrap: "wrap" }}>
                        <div>
                            <label className={styles.label}>Class</label>
                            <select
                                className={styles.input}
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                disabled={!selectedSeasonId}
                            >
                                <option value="">Select class</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {getClassDisplayName(cls)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={styles.label}>Car #</label>
                            <input
                                className={styles.input}
                                value={carNumber}
                                onChange={(e) => setCarNumber(e.target.value)}
                                disabled={!selectedSeasonId}
                            />
                        </div>

                        <div>
                            <label className={styles.label}>Primary Driver</label>
                            <select
                                className={styles.input}
                                value={primaryDriverId}
                                onChange={(e) => setPrimaryDriverId(e.target.value)}
                                disabled={!selectedSeasonId}
                            >
                                <option value="">Select driver</option>
                                {drivers.map((driver) => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={styles.label}>Co-Driver</label>
                            <select
                                className={styles.input}
                                value={coDriverId}
                                onChange={(e) => setCoDriverId(e.target.value)}
                                disabled={!selectedSeasonId}
                            >
                                <option value="">None</option>
                                {drivers.map((driver) => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={styles.label}>Active</label>
                            <select
                                className={styles.input}
                                value={isActive ? "true" : "false"}
                                onChange={(e) => setIsActive(e.target.value === "true")}
                                disabled={!selectedSeasonId}
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className={custStyles.tools} style={{ marginTop: 16 }}>
                        <button
                            className={styles.button}
                            onClick={handleSave}
                            disabled={saving || !selectedSeasonId}
                        >
                            {saving
                                ? "Full send..."
                                : editingId
                                    ? "Save Changes"
                                    : "Add Registration"}
                        </button>

                        {editingId && (
                            <button
                                className={styles.buttonSecondary}
                                onClick={resetForm}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={custStyles.header} style={{ padding: 0, marginBottom: 12 }}>
                <h2 className={styles.subheading}>Current Registrations</h2>
            </div>

            <Pagination
                currentPage={currentPage}
                perPage={perPage}
                totalItems={sortedRows.length}
                onPageChange={setCurrentPage}
                onPerPageChange={setPerPage}
                label="cars"
            />

            <div className={custStyles.tableWrap}>
                <table className={custStyles.table}>
                    <thead>
                        <tr>
                            <th><SortHeader label="Class" sortKey="class_name" /></th>
                            <th><SortHeader label="Car #" sortKey="car_number" /></th>
                            <th><SortHeader label="Primary Driver" sortKey="primary_driver_name" /></th>
                            <th><SortHeader label="Co-Driver" sortKey="co_driver_name" /></th>
                            <th><SortHeader label="Active?" sortKey="is_active" /></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {!sortedRows.length ? (
                            <tr>
                                <td colSpan={6}>
                                    {selectedSeasonId
                                        ? "No registrations found."
                                        : "Select a season to view registrations."}
                                </td>
                            </tr>
                        ) : (
                            paginatedRows.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.class_sponsor ? `${row.class_sponsor} ${row.class_name}` : row.class_name}</td>
                                    <td>{row.car_number}</td>
                                    <td>{row.primary_driver_name}</td>
                                    <td>{row.co_driver_name || "-"}</td>
                                    <td>{row.is_active ? "Yes" : "-"}</td>
                                    <td>
                                        <div className={custStyles.tools}>
                                            <button
                                                className={styles.iconButton}
                                                onClick={() => startEdit(row)}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                className={styles.iconButton}
                                                onClick={() => handleDelete(row.id)}
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}