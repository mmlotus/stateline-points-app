"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Driver, EventClassWithClassName, EventEntryOption, EventEntryWithDetails, EventRow } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatDate } from "@/components/Formatter";
import { ChevronDown, ChevronUp, Pencil, SaveIcon, Trash } from "lucide-react";
import BasicModal from "@/components/Modals/PopupModal";

export default function EventEntriesPage() {
    const router = useRouter();
    const params = useParams<{ seasonId: string; id: string }>();

    const eventId = params.id;
    const seasonId = params.seasonId;

    const [eventData, setEventData] = useState<EventRow | null>(null);
    const [eventClasses, setEventClasses] = useState<EventClassWithClassName[]>([]);
    const [entries, setEntries] = useState<EventEntryWithDetails[]>([]);
    const [entryOptions, setEntryOptions] = useState<EventEntryOption[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [addEntryOverrideCarNumber, setAddEntryOverrideCarNumber] = useState("");

    const [activeClassId, setActiveClassId] = useState<string | null>(null);
    const [selectedSeasonClassCarId, setSelectedSeasonClassCarId] = useState("");

    const [quickCarNumber, setQuickCarNumber] = useState("");
    const [quickPrimaryMode, setQuickPrimaryMode] = useState<"existing" | "new">("existing");
    const [quickPrimaryDriverId, setQuickPrimaryDriverId] = useState("");
    const [quickPrimaryDriverName, setQuickPrimaryDriverName] = useState("");
    const [quickCoDriverId, setQuickCoDriverId] = useState("");
    const [quickSaving, setQuickSaving] = useState(false);
    const [quickOverrideCarNum, setQuickOverrideCarNum] = useState("");

    const [coDriverDrove, setCoDriverDrove] = useState(false);
    const [quickCoDriverDrove, setQuickCoDriverDrove] = useState(false);
    const [showCoDriverConfirm, setShowCoDriverConfirm] = useState(false);
    const [, setPendingQuickAdd] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [payToDrafts, setPayToDrafts] = useState<Record<string, string>>({});
    const [payToFocusedId, setPayToFocusedId] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSeasonClassCarId, setEditSeasonClassCarId] = useState("");
    const [editSeasonId, setEditSeasonId] = useState("");
    const [editClassId, setEditClassId] = useState("");
    const [editCarNumber, setEditCarNumber] = useState("");
    const [editPrimaryDriverId, setEditPrimaryDriverId] = useState("");
    const [editCoDriverId, setEditCoDriverId] = useState("");
    const [editIsActive, setEditIsActive] = useState(true);
    const [editSaving, setEditSaving] = useState(false);

    const [entrySort, setEntrySort] = useState<"default" | "car" | "name">("default");
    const [entrySortDir, setEntrySortDir] = useState<"asc" | "desc">("asc");

    async function loadPage() {
        setLoading(true);

        try {
            const [eventRes, classesRes, entriesRes, optionsRes, driversRes] = await Promise.all([
                fetch(`/api/events/${eventId}`, { cache: "no-store" }),
                fetch(`/api/event-classes?event_id=${eventId}`, { cache: "no-store" }),
                fetch(`/api/events/${eventId}/entries`, { cache: "no-store" }),
                fetch(`/api/events/${eventId}/entry-options`, { cache: "no-store" }),
                fetch(`/api/drivers`, { cache: "no-store" }),
            ]);

            const eventJson = await eventRes.json();
            const classesJson = await classesRes.json();
            const entriesJson = await entriesRes.json();
            const optionsJson = await optionsRes.json();
            const driversJson = await driversRes.json();

            if (!eventRes.ok) {
                throw new Error(eventJson.error || "Failed to load event.");
            }

            if (!classesRes.ok) {
                throw new Error(classesJson.error || "Failed to load event classes.");
            }

            if (!entriesRes.ok) {
                throw new Error(entriesJson.error || "Failed to load event entries.");
            }

            if (!optionsRes.ok) {
                throw new Error(optionsJson.error || "Failed to load entry options.");
            }

            if (!driversRes.ok) {
                throw new Error(driversJson.error || "Failed to load drivers.");
            }

            setEventData(eventJson);
            setEventClasses(classesJson || []);
            setEntries(entriesJson || []);
            setEntryOptions(optionsJson || []);
            setDrivers(driversJson || []);

            const classList = (classesJson || []) as EventClassWithClassName[];

            if (classList.length) {
                setActiveClassId((prev) => {
                    if (prev && classList.some((c) => c.class_id === prev)) return prev;
                    return classList[0].class_id;
                });
            } else {
                setActiveClassId(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load entries page.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!eventId) return;
        loadPage();
        //eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const filteredEntries = useMemo(() => {
        if (!activeClassId) return [];

        const filtered = entries.filter((entry) => entry.class_id === activeClassId);

        if (entrySort === "default") return filtered;

        const getLastName = (name: string) => {
            const parts = (name || "").trim().split(/\s+/).filter(Boolean);
            return parts.length ? parts[parts.length - 1].toLowerCase() : "";
        };

        const getCarParts = (carNumber: string) => {
            const raw = (carNumber || "").trim().toLowerCase();
            const match = raw.match(/^(\d+)(.*)$/);

            if (!match) return { number: Number.MAX_SAFE_INTEGER, suffix: raw };

            return { number: Number(match[1]), suffix: (match[2] || "").trim() };
        };

        filtered.sort((a, b) => {
            let result = 0;

            if (entrySort === "car") {
                const aParts = getCarParts(a.car_number);
                const bParts = getCarParts(b.car_number);

                result = aParts.number - bParts.number;

                if (result === 0) {
                    result = aParts.suffix.localeCompare(bParts.suffix);
                }

                if (result === 0) {
                    result = (a.car_number || "").localeCompare(b.car_number || "");
                }
            }

            if (entrySort === "name") {
                const aLast = getLastName(a.primary_driver_name);
                const bLast = getLastName(b.primary_driver_name);

                result = aLast.localeCompare(bLast);

                if (result === 0) {
                    result = (a.primary_driver_name || "").localeCompare(b.primary_driver_name || "");
                }
            }

            return entrySortDir === "asc" ? result : -result;
        });

        return filtered;
    }, [entries, activeClassId, entrySort, entrySortDir]);

    const filteredOptions = useMemo(() => {
        if (!activeClassId) return [];
        return entryOptions.filter((option) => option.class_id === activeClassId);
    }, [entryOptions, activeClassId]);

    const availableOptions = useMemo(() => {
        return filteredOptions.filter((option) => !option.already_entered);
    }, [filteredOptions]);

    const selectedAddCarOption = useMemo(() => {
        return availableOptions.find((option) => option.id === selectedSeasonClassCarId) || null;
    }, [availableOptions, selectedSeasonClassCarId]);

    const selectedAddCarHasCoDriver = !!selectedAddCarOption?.co_driver_name?.trim();

    useEffect(() => {
        if (!selectedAddCarHasCoDriver) {
            setCoDriverDrove(false);
        }
    }, [selectedAddCarHasCoDriver]);

    useEffect(() => {
        setSelectedSeasonClassCarId((prev) => {
            if (prev && availableOptions.some((o) => o.id === prev)) return prev;
            return availableOptions[0]?.id || "";
        });
    }, [availableOptions]);

    function isCarNumTakenInActiveClass(carNumber: string) {
        const normalized = carNumber.trim().toLowerCase();
        if (!normalized) return false;

        return filteredEntries.some((entry) => entry.car_number.trim().toLowerCase() === normalized);
    }

    function quickAddNeedsOverride() {
        const baseNum = quickCarNumber.trim();
        if (!baseNum) return false;
        return isCarNumTakenInActiveClass(baseNum);
    }

    async function handleAddEntry() {
        if (!selectedSeasonClassCarId) {
            toast.error("Select a car to add.");
            return;
        }

        const selectedOption = entryOptions.find((option) => option.id === selectedSeasonClassCarId);
        if (!selectedOption) {
            toast.error("Selected car not found.");
            return;
        }

        const seasonRegNumber = (selectedOption.car_number || "").trim();
        const overrideNumber = addEntryOverrideCarNumber.trim();
        const effectiveNumber = overrideNumber || seasonRegNumber;

        if (!effectiveNumber) {
            toast.error("Car # is required.");
            return;
        }

        const seasonNumTaken = isCarNumTakenInActiveClass(seasonRegNumber);

        if (seasonNumTaken && !overrideNumber) {
            toast.error(`Car ${seasonRegNumber} is already entered in this class for this event.
                    Enter a temporary # for tonight only.`);
            return;
        }

        setSaving(true);

        try {
            const res = await fetch(`/api/events/${eventId}/entries`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    season_class_car_id: selectedSeasonClassCarId,
                    override_car_number: overrideNumber || null,
                    co_driver_drove: selectedAddCarHasCoDriver ? coDriverDrove : false,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to add entry.");
            }

            toast.success("Entry added.");
            setCoDriverDrove(false);
            await loadPage();
            setAddEntryOverrideCarNumber("");
        } catch (error) {
            console.error(error);
            toast.error("Failed to add entry.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteEntry(entryId: string) {
        const confirmed = window.confirm("Remove this entry from the event?");
        if (!confirmed) return;

        setDeletingId(entryId);

        try {
            const res = await fetch(`/api/event-entries/${entryId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to remove entry.");
            }

            toast.success("Entry removed!");
            await loadPage();
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove entry.");
        } finally {
            setDeletingId(null);
        }
    }

    async function handleUpdateEntryFlags(
        entryId: string,
        updates: {
            no_points?: boolean;
            no_pay?: boolean;
            co_driver_drove?: boolean;
        }
    ) {
        try {
            const res = await fetch(`/api/events/${eventId}/entries?entry_id=${entryId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "Failed to update entry.");
            }

            setEntries((prev) =>
                prev.map((entry) =>
                    entry.id === entryId
                        ? {
                            ...entry,
                            ...updates,
                        }
                        : entry
                )
            );
        } catch (error) {
            console.error(error);
            toast.error("Failed to update entry.");
        }
    }

    function getPayToDraft(entry: EventEntryWithDetails) {
        return payToDrafts[entry.id] ?? entry.pay_to_name ?? "";
    }

    function shouldShowPayToSave(entry: EventEntryWithDetails) {
        const currentDraft = getPayToDraft(entry);
        const savedValue = entry.pay_to_name ?? "";
        return payToFocusedId === entry.id || currentDraft !== savedValue;
    }

    function setPayToDraft(entryId: string, value: string) {
        setPayToDrafts((prev) => ({
            ...prev,
            [entryId]: value,
        }));
    }

    function clearPayToDraft(entryId: string) {
        setPayToDrafts((prev) => {
            const next = { ...prev };
            delete next[entryId];
            return next;
        });
    }

    async function handlePayToOther(
        entryId: string,
        updates: {
            pay_to_other?: boolean;
            pay_to_name?: string;
        }
    ) {
        try {
            const res = await fetch(`/api/events/${eventId}/entries?entry_id=${entryId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "Failed to update payout on entry.");
            }

            setEntries((prev) =>
                prev.map((entry) =>
                    entry.id === entryId
                        ? {
                            ...entry,
                            ...updates,
                        }
                        : entry
                )
            );
        } catch (error) {
            console.error(error);
            toast.error("Failed to update payout on entry.");
        }
    }

    async function handleSavePayToName(entry: EventEntryWithDetails) {
        const draftValue = getPayToDraft(entry).trim();

        try {
            const res = await fetch(`/api/events/${eventId}/entries?entry_id=${entry.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pay_to_name: draftValue,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || "Failed to save Pay To name.");
            }

            setEntries((prev) =>
                prev.map((row) =>
                    row.id === entry.id
                        ? {
                            ...row,
                            pay_to_name: draftValue,
                        }
                        : row
                )
            );

            setPayToDrafts((prev) => {
                const next = { ...prev };
                delete next[entry.id];
                return next;
            });

            if (payToFocusedId === entry.id) {
                setPayToFocusedId(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save Pay To name.");
        }
    }

    async function handleQuickAddEntry() {
        if (!activeClassId) {
            toast.error("Select a class first.");
            return;
        }

        const seasonCarNum = quickCarNumber.trim();
        const overrideNum = quickOverrideCarNum.trim();

        if (!seasonCarNum) {
            toast.error("Car number is required.");
            return;
        }

        if (quickPrimaryMode === "existing" && !quickPrimaryDriverId) {
            toast.error("Select a primary driver.");
            return;
        }

        if (quickPrimaryMode === "new" && !quickPrimaryDriverName.trim()) {
            toast.error("Enter a new driver name.");
            return;
        }

        if (quickPrimaryMode === "existing" && quickCoDriverId && quickCoDriverId === quickPrimaryDriverId) {
            toast.error("Primary driver and co-driver cannot be the same.");
            return;
        }

        const needsOverride = isCarNumTakenInActiveClass(seasonCarNum);

        if (needsOverride && !overrideNum) {
            toast.error(`Car ${seasonCarNum} is already entered in this class for this event.
                    Enter a temp # for tonight only.`);
            return;
        }

        if (overrideNum && isCarNumTakenInActiveClass(overrideNum)) {
            toast.error(`Car ${seasonCarNum} is already entered in this class for this event.
                    Choose a different temporary #.`);
            return;
        }

        setQuickSaving(true);

        try {
            const res = await fetch(`/api/events/${eventId}/quick-add-entry`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_id: activeClassId,
                    car_number: seasonCarNum,
                    override_car_number: overrideNum || null,
                    primary_driver_id:
                        quickPrimaryMode === "existing" ? quickPrimaryDriverId : undefined,
                    primary_driver_name:
                        quickPrimaryMode === "new" ? quickPrimaryDriverName.trim() : undefined,
                    co_driver_id: quickCoDriverId || null,
                    co_driver_drove: quickCoDriverDrove,
                    is_active: true,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                const message = data.error || "Failed to quick add entry.";

                if (
                    message.toLowerCase().includes("primary driver is already registered") &&
                    quickCoDriverId &&
                    !quickCoDriverDrove
                ) {
                    setPendingQuickAdd(true);
                    setShowCoDriverConfirm(true);
                    return;
                }

                throw new Error(message);
            }

            toast.success("Entry added!");
            setQuickCarNumber("");
            setQuickOverrideCarNum("");
            setQuickPrimaryMode("existing");
            setQuickPrimaryDriverId("");
            setQuickPrimaryDriverName("");
            setQuickCoDriverId("");
            setQuickCoDriverDrove(false);
            setPendingQuickAdd(false);
            await loadPage();
        } catch (error) {
            console.error(error);
            toast.error("Failed to quick add entry.");
        } finally {
            setQuickSaving(false);
        }
    }

    async function handleConfirmCoDriverDrove() {
        setShowCoDriverConfirm(false);
        setQuickCoDriverDrove(true);

        //re-run the same quick add flow on the next tick so state is updated
        setTimeout(() => {
            handleQuickAddEntry();
        }, 0);
    }

    function handleCancelCoDriverDrove() {
        setShowCoDriverConfirm(false);
        setPendingQuickAdd(false);
    }

    function handleQuickPrimaryDriverChange(driverId: string) {
        setQuickPrimaryDriverId(driverId);
        setQuickOverrideCarNum("");

        const selectedDriver = drivers.find((driver) => driver.id === driverId);
        setQuickCarNumber(selectedDriver?.default_car?.trim() || "");
    }

    function openEditModal(entry: EventEntryWithDetails) {
        setEditSeasonClassCarId(entry.season_class_car_id);
        setEditSeasonId(entry.season_id);
        setEditClassId(entry.class_id);
        setEditCarNumber(entry.car_number);
        setEditPrimaryDriverId(entry.primary_driver_id);
        setEditCoDriverId(entry.co_driver_id || "");
        setEditIsActive(entry.is_active);
        setIsEditModalOpen(true);
    }

    function closeEditModal() {
        if (editSaving) return;
        setIsEditModalOpen(false);
        setEditSeasonClassCarId("");
        setEditSeasonId("");
        setEditClassId("");
        setEditCarNumber("");
        setEditPrimaryDriverId("");
        setEditCoDriverId("");
        setEditIsActive(true);
    }

    async function handleSaveRegistration() {
        if (!editSeasonClassCarId || !seasonId || !editClassId || !editCarNumber.trim() || !editPrimaryDriverId) {
            toast.error("Car number & primary driver are required.");
            return;
        }

        if (editCoDriverId && editCoDriverId === editPrimaryDriverId) {
            toast.error("Primary driver & co-driver cannot be the same.");
            return;
        }

        setEditSaving(true);

        try {
            const res = await fetch("/api/season-class-cars", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editSeasonClassCarId,
                    season_id: editSeasonId,
                    class_id: editClassId,
                    car_number: editCarNumber.trim(),
                    primary_driver_id: editPrimaryDriverId,
                    co_driver_id: editCoDriverId || null,
                    is_active: editIsActive,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update season registration.");
            }

            toast.success("Season registration updated!");
            closeEditModal();
            await loadPage();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update registration.");
        } finally {
            setEditSaving(false);
        }
    }

    function handleEntrySortClick(sort: "default" | "car" | "name") {
        if (sort === "default") {
            setEntrySort("default");
            setEntrySortDir("asc");
            return;
        }

        if (entrySort === sort) {
            setEntrySortDir((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }

        setEntrySort(sort);
        setEntrySortDir("asc");
    }

    const activeClassName =
        eventClasses.find((c) => c.class_id === activeClassId)?.class_name || "Entries";

    const editModalContent = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className={styles.muted}>
                Changes here affect this car/class registration for the season, including linked
                event entries.
            </p>

            <div>
                <label className={styles.label}>Car Number</label>
                <input
                    className={styles.input}
                    value={editCarNumber}
                    onChange={(e) => setEditCarNumber(e.target.value)}
                    disabled={editSaving}
                />
            </div>

            <div>
                <label className={styles.label}>Primary Driver</label>
                <select
                    className={styles.input}
                    value={editPrimaryDriverId}
                    onChange={(e) => setEditPrimaryDriverId(e.target.value)}
                    disabled={editSaving}
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
                    value={editCoDriverId}
                    onChange={(e) => setEditCoDriverId(e.target.value)}
                    disabled={editSaving}
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
                    value={editIsActive ? "true" : "false"}
                    onChange={(e) => setEditIsActive(e.target.value === "true")}
                    disabled={editSaving}
                >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>
            </div>
        </div>
    );

    if (loading) return <LoadingSpinner />

    return (
        <>
            <div className={custStyles.wrap}>
                <div className={custStyles.header}>
                    <h1 className={styles.heading}>Event Entries</h1>
                    {eventData && (
                        <div className={styles.muted}>
                            {eventData.name} - {formatDate(eventData.event_date)}
                        </div>
                    )}

                    <div className={custStyles.tools}>
                        <button
                            className={styles.buttonSecondary}
                            onClick={() => router.push("/entries")}
                        >
                            Reverse
                        </button>

                        <button
                            className={styles.button}
                            onClick={() => router.push(`/season/${seasonId}/events/${eventId}/races`)}
                        >
                            Races
                        </button>

                        <button
                            className={styles.button}
                            onClick={() => router.push(`/season/${seasonId}/events/${eventId}/results`)}
                        >
                            Results
                        </button>
                    </div>
                </div>

                {!eventClasses.length ? (
                    <p className={styles.muted}>
                        No classes are assigned to this event yet.
                    </p>
                ) : (
                    <>
                        <div className={styles.keyPanel}>
                            <h2 className={styles.subheading}>Classes</h2>
                            <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                                {eventClasses.map((cls) => (
                                    <button
                                        key={cls.class_id}
                                        className={
                                            cls.class_id === activeClassId
                                                ? styles.button
                                                : styles.buttonSecondary
                                        }
                                        onClick={() => setActiveClassId(cls.class_id)}
                                    >
                                        {cls.class_name || "Unnamed Class"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.topRow}>
                            <div className={styles.topHalf}>
                                <div className={custStyles.header} style={{ padding: 0, marginBottom: 12 }}>
                                    <h2 className={styles.subheading}>{activeClassName}</h2>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "flex-end",
                                        flexWrap: "wrap",
                                        marginBottom: 16,
                                    }}
                                >
                                    <div style={{ minWidth: 320, flex: 1 }}>
                                        <label className={styles.label}>Add Car</label>
                                        <select
                                            className={styles.input}
                                            value={selectedSeasonClassCarId}
                                            onChange={(e) => {
                                                const nextId = e.target.value;
                                                setSelectedSeasonClassCarId(nextId);
                                                setAddEntryOverrideCarNumber("");

                                                const nextOption = availableOptions.find((option) => option.id === nextId);
                                                if (!nextOption?.co_driver_name?.trim()) {
                                                    setCoDriverDrove(false);
                                                }
                                            }}
                                            disabled={!availableOptions.length || saving}
                                        >
                                            {!availableOptions.length ? (
                                                <option value="">No available cars for this class!</option>
                                            ) : (
                                                availableOptions.map((option) => (
                                                    <option key={option.id} value={option.id}>
                                                        #{option.car_number} - {option.primary_driver_name}
                                                        {option.co_driver_name
                                                            ? ` / ${option.co_driver_name}`
                                                            : ""}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    <div style={{ width: 120 }}>
                                        <label className={styles.label}>&nbsp;</label>
                                        <input
                                            className={styles.input}
                                            placeholder="Temp #"
                                            value={addEntryOverrideCarNumber}
                                            onChange={(e) => setAddEntryOverrideCarNumber(e.target.value)}
                                            disabled={saving || !selectedSeasonClassCarId}
                                        />
                                    </div>

                                    {selectedAddCarHasCoDriver ? (
                                        <div>
                                            <label className={styles.label}>Co-Driver Drove?</label>
                                            <br></br>
                                            <input
                                                type="checkbox"
                                                checked={coDriverDrove}
                                                onChange={(e) => setCoDriverDrove(e.target.checked)}
                                                disabled={quickSaving}
                                                title="Co-driver drove tonight"
                                            />
                                        </div>
                                    ) : null}

                                    <button
                                        className={styles.button}
                                        onClick={handleAddEntry}
                                        disabled={!selectedSeasonClassCarId || saving}
                                    >
                                        {saving ? "Full send..." : "+ Add Entry"}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.separator} />

                            <div className={styles.topHalf}>
                                <div className={custStyles.header} style={{ padding: 0, marginBottom: 2 }}>
                                    <h2 className={styles.subheading}>Quick Add Entry</h2>
                                </div>
                                <p className={styles.muted} style={{ marginTop: 0, marginBottom: 12 }}>
                                    Use this if the car is not already registered for the season/class.
                                </p>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "end",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div>
                                        <label className={styles.label}>Car #</label>
                                        <input
                                            className={styles.input}
                                            value={quickCarNumber}
                                            onChange={(e) => {
                                                setQuickCarNumber(e.target.value);
                                                setQuickOverrideCarNum("");
                                            }}
                                            disabled={quickSaving}
                                        />
                                    </div>

                                    {quickAddNeedsOverride() && (
                                        <div>
                                            <label className={styles.label}>Temp Event #</label>
                                            <input
                                                className={styles.input}
                                                style={{ maxWidth: 100 }}
                                                value={quickOverrideCarNum}
                                                onChange={(e) => setQuickOverrideCarNum(e.target.value)}
                                                disabled={quickSaving}
                                                placeholder="i.e. 22G"
                                            />
                                            <div className={styles.muted} style={{ fontSize: 10 }}>
                                                This will only apply to this event. Season registration stays as {quickCarNumber.trim() || "-"}.
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className={styles.label}>Primary Driver Type</label>
                                        <select
                                            className={styles.input}
                                            value={quickPrimaryMode}
                                            onChange={(e) => {
                                                const nextMode = e.target.value as "existing" | "new";
                                                setQuickPrimaryMode(nextMode);
                                                setQuickPrimaryDriverId("");
                                                setQuickPrimaryDriverName("");
                                                setQuickCarNumber("");
                                                setQuickOverrideCarNum("");
                                            }}
                                            disabled={quickSaving}
                                        >
                                            <option value="existing">Existing Driver</option>
                                            <option value="new">New Driver</option>
                                        </select>
                                    </div>

                                    {quickPrimaryMode === "existing" ? (
                                        <div>
                                            <label className={styles.label}>Primary Driver</label>
                                            <select
                                                className={styles.input}
                                                value={quickPrimaryDriverId}
                                                onChange={(e) => handleQuickPrimaryDriverChange(e.target.value)}
                                                disabled={quickSaving}
                                            >
                                                <option value="">Select driver</option>
                                                {drivers.map((driver) => (
                                                    <option key={driver.id} value={driver.id}>
                                                        {driver.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className={styles.label}>New Driver Name</label>
                                            <input
                                                className={styles.input}
                                                value={quickPrimaryDriverName}
                                                onChange={(e) => setQuickPrimaryDriverName(e.target.value)}
                                                disabled={quickSaving}
                                                placeholder="Enter driver name"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className={styles.label}>Co-Driver</label>
                                        <select
                                            className={styles.input}
                                            value={quickCoDriverId}
                                            onChange={(e) => setQuickCoDriverId(e.target.value)}
                                            disabled={quickSaving}
                                        >
                                            <option value="">None</option>
                                            {drivers.map((driver) => (
                                                <option key={driver.id} value={driver.id}>
                                                    {driver.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {quickCoDriverId ? (
                                        <div>
                                            <label className={styles.label}>Co-Driver Drove?</label>
                                            <br></br>
                                            <input
                                                type="checkbox"
                                                checked={quickCoDriverDrove}
                                                onChange={(e) => setQuickCoDriverDrove(e.target.checked)}
                                                disabled={quickSaving}
                                                title="Co-driver drove tonight"
                                            />
                                        </div>
                                    ) : null}

                                    <button
                                        className={styles.buttonSecondary}
                                        onClick={handleQuickAddEntry}
                                        disabled={quickSaving || !activeClassId}
                                    >
                                        {quickSaving ? "Full send..." : "Quick Register & Enter"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {!filteredEntries.length ? (
                            <p className={styles.muted} style={{ marginTop: 50 }}>
                                No entries added for this class yet!
                            </p>
                        ) : (
                            <>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginTop: 16,
                                        marginBottom: 10,
                                        flexWrap: "wrap",
                                    }}>
                                    <span className={styles.muted}>Sort:</span>

                                    <button
                                        type="button"
                                        className={entrySort === "default" ? styles.filterBtnActive : styles.filterBtn}
                                        onClick={() => handleEntrySortClick("default")}
                                    >
                                        Entry Order
                                    </button>

                                    <button
                                        type="button"
                                        className={entrySort === "car" ? styles.filterBtnActive : styles.filterBtn}
                                        onClick={() => handleEntrySortClick("car")}
                                    >
                                        Car #
                                        {entrySort === "car" ? (entrySortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : ""}
                                    </button>

                                    <button
                                        type="button"
                                        className={entrySort === "name" ? styles.filterBtnActive : styles.filterBtn}
                                        onClick={() => handleEntrySortClick("name")}
                                    >
                                        Last Name
                                        {entrySort === "name" ? (entrySortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : ""}
                                    </button>

                                    <div style={{ marginLeft: 50, fontSize: 14, color: "#888888" }}>
                                        <b>{filteredEntries.length}</b> Total {activeClassName}
                                    </div>
                                </div>

                                <div className={custStyles.tableWrap} style={{ marginTop: 20, marginBottom: 75 }}>
                                    <table className={custStyles.table}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: "center" }}>Car #</th>
                                                <th style={{ textAlign: "center" }}>Primary Driver</th>
                                                <th style={{ textAlign: "center" }}>Co-Driver</th>
                                                <th style={{ textAlign: "center" }}>Co-Driver Drove?</th>
                                                <th style={{ textAlign: "center" }}>No Points</th>
                                                <th style={{ textAlign: "center" }}>No Pay</th>
                                                <th style={{ textAlign: "center" }}>Pay to Other?</th>
                                                <th style={{ textAlign: "center" }}>Pay to</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEntries.map((entry) => (
                                                <tr key={entry.id}>
                                                    <td style={{ textAlign: "center" }}>{entry.car_number}</td>
                                                    <td style={{ textAlign: "center" }}>{entry.primary_driver_name}</td>
                                                    <td style={{ textAlign: "center" }}>{entry.co_driver_name || "-"}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!entry.co_driver_drove}
                                                            onChange={(e) =>
                                                                handleUpdateEntryFlags(entry.id, {
                                                                    co_driver_drove: e.target.checked,
                                                                })
                                                            }
                                                            title="Co-Driver Drove"
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!entry.no_points}
                                                            onChange={(e) =>
                                                                handleUpdateEntryFlags(entry.id, {
                                                                    no_points: e.target.checked,
                                                                })
                                                            }
                                                            title="No Points"
                                                        />
                                                    </td>

                                                    <td style={{ textAlign: "center" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!entry.no_pay}
                                                            onChange={(e) =>
                                                                handleUpdateEntryFlags(entry.id, {
                                                                    no_pay: e.target.checked,
                                                                })
                                                            }
                                                            title="No Pay"
                                                        />
                                                    </td>

                                                    <td style={{ textAlign: "center" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!entry.pay_to_other}
                                                            onChange={(e) => {
                                                                if (!e.target.checked) {
                                                                    clearPayToDraft(entry.id);
                                                                    if (payToFocusedId === entry.id) {
                                                                        setPayToFocusedId(null);
                                                                    }
                                                                }

                                                                handlePayToOther(entry.id, {
                                                                    pay_to_other: e.target.checked,
                                                                    ...(e.target.checked ? {} : { pay_to_name: "" }),
                                                                });
                                                            }}
                                                            title="Pay to Other"
                                                        />
                                                    </td>

                                                    <td style={{ textAlign: "center" }}>
                                                        {!!entry.pay_to_other ? (
                                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                <input
                                                                    className={styles.input}
                                                                    value={getPayToDraft(entry)}
                                                                    onFocus={() => setPayToFocusedId(entry.id)}
                                                                    onBlur={() => {
                                                                        setTimeout(() => {
                                                                            setPayToFocusedId((current) => (current === entry.id ? null : current));
                                                                        }, 150);
                                                                    }}
                                                                    onChange={(e) => setPayToDraft(entry.id, e.target.value)}
                                                                    placeholder="i.e. Ricky Bobby"
                                                                    style={{ marginBottom: 0 }}
                                                                />
                                                                {shouldShowPayToSave(entry) && (
                                                                    <button
                                                                        type="button"
                                                                        className={styles.iconButton}
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() => handleSavePayToName(entry)}
                                                                        aria-label="Save Pay To name"
                                                                        title="Save Pay To name"
                                                                    >
                                                                        <SaveIcon size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className={styles.muted}>-</span>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <button
                                                            className={styles.iconButton}
                                                            onClick={() => openEditModal(entry)}
                                                            disabled={deletingId === entry.id}
                                                            aria-label="Edit season registration"
                                                            title="Edit season registration"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            className={styles.iconButton}
                                                            onClick={() => handleDeleteEntry(entry.id)}
                                                            disabled={deletingId === entry.id}
                                                            aria-label="Remove entry from event"
                                                            title="Remove from this event"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div >

            <BasicModal
                isOpen={isEditModalOpen}
                title="Edit Season Registration"
                message={editModalContent}
                onClose={closeEditModal}
                cancelText="Cancel"
                confirmText={editSaving ? "Full send..." : "Save Changes"}
                onConfirm={handleSaveRegistration}
                disableConfirm={
                    editSaving || !editCarNumber.trim() || !editPrimaryDriverId || (editCoDriverId !== "" && editCoDriverId === editPrimaryDriverId)
                }
            />

            <BasicModal
                isOpen={showCoDriverConfirm}
                title="Co-driver drove tonight?"
                message={
                    <div>
                        The selected primary driver is already registered under another car in this class for this season.
                        <br></br>
                        If the co-driver actually drove this car tonight, continue & mark this event entry as
                        <b> Co-Driver Drove</b>.
                    </div>
                }
                onClose={handleCancelCoDriverDrove}
                cancelText="Cancel"
                confirmText="Yes, co-driver drove"
                onConfirm={handleConfirmCoDriverDrove}
            />
        </>
    );
}