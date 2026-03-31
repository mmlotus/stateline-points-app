"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EventClassWithClassName, EventEntryWithDetails, EventRow, Race, RaceGroup, ResultsSavePayload, ResultWithDetails } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatDate } from "@/components/Formatter";
import { Trash } from "lucide-react";
import DragHandle from "@/components/DragDots";

export default function EventResultsPage() {
    const router = useRouter();
    const params = useParams<{ seasonId: string; id: string }>();

    const eventId = params.id;
    const seasonId = params.seasonId;

    const [eventData, setEventData] = useState<EventRow | null>(null);
    const [eventClasses, setEventClasses] = useState<EventClassWithClassName[]>([]);
    const [, setRaceGroups] = useState<RaceGroup[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [entries, setEntries] = useState<EventEntryWithDetails[]>([]);

    const [selectedEventClassId, setSelectedEventClassId] = useState("");
    const [selectedRaceId, setSelectedRaceId] = useState("");
    const [selectedEntryId, setSelectedEntryId] = useState("");

    const [raceResults, setRaceResults] = useState<ResultWithDetails[]>([]);
    const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
    const [typedCarNum, setTypedCarNum] = useState("");
    const [resultsLoading, setResultsLoading] = useState(false);
    const [savingResults, setSavingResults] = useState(false);

    const [loading, setLoading] = useState(true);
    const [raceLoading, setRaceLoading] = useState(false);

    useEffect(() => {
        async function loadPage() {
            try {
                const [eventRes, eventClassesRes, entriesRes] = await Promise.all([
                    fetch(`/api/events/${eventId}`, { cache: "no-store" }),
                    fetch(`/api/event-classes?event_id=${eventId}`, { cache: "no-store" }),
                    fetch(`/api/events/${eventId}/entries`, { cache: "no-store" }),
                ]);

                const eventJson = await eventRes.json();
                const eventClassesJson = await eventClassesRes.json();
                const entriesJson = await entriesRes.json();

                if (!eventRes.ok) {
                    toast.error(eventJson?.error || "Failed to load event.");
                    router.push("/results");
                    return;
                }

                if (!eventClassesRes.ok) {
                    toast.error(eventClassesJson?.error || "Failed to load event classes.");
                    router.push("/results");
                    return;
                }

                if (!entriesRes.ok) {
                    toast.error(entriesJson?.error || "Failed to load event entries.");
                    router.push("/resulst");
                    return;
                }

                setEventData(eventJson);
                setEventClasses(eventClassesJson);
                setEntries(entriesJson || []);

                if (eventClassesJson.length > 0) {
                    setSelectedEventClassId(eventClassesJson[0].id);
                } else {
                    setSelectedEventClassId("");
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load results page.");
                router.push("/results");
            } finally {
                setLoading(false);
            }
        }

        if (eventId) {
            loadPage();
        }
    }, [eventId, router]);

    useEffect(() => {
        async function loadRacesForClass() {
            if (!selectedEventClassId) {
                setRaceGroups([]);
                setRaces([]);
                setSelectedRaceId("");
                return;
            }

            try {
                setRaceLoading(true);

                const groupsRes = await fetch(
                    `/api/race-groups?event_class_id=${selectedEventClassId}`,
                    { cache: "no-store" }
                );

                const groupsJson = await groupsRes.json();

                if (!groupsRes.ok) {
                    throw new Error(groupsJson.error || "Failed to load race groups.");
                }

                const groups = groupsJson || [];
                setRaceGroups(groups);

                if (!groups.length) {
                    setRaces([]);
                    setSelectedRaceId("");
                    return;
                }

                const raceResults = await Promise.all(
                    groups.map(async (group: RaceGroup) => {
                        const res = await fetch(
                            `/api/races?race_group_id=${group.id}`,
                            { cache: "no-store" }
                        );

                        const data = await res.json();

                        if (!res.ok) {
                            throw new Error(data.error || `Failed to load races for ${group.title}.`);
                        }

                        return (data || []).map((race: Race) => ({
                            ...race,
                            _groupOrder: group.order_index,
                        }));
                    })
                );

                const flattenedRaces = raceResults
                    .flat()
                    .sort((a, b) => {
                        if (a._groupOrder !== b._groupOrder) return a._groupOrder - b._groupOrder;
                        if (a.order_index !== b.order_index) return a.order_index - b.order_index;
                        if (a.race_num !== b.race_num) return a.race_num - b.race_num;
                        return a.created_at.localeCompare(b.created_at);
                    })
                    .map((race) => {
                        const { _groupOrder, ...rest } = race;
                        void _groupOrder;
                        return rest;
                    });

                setRaces(flattenedRaces);

                if (flattenedRaces.length > 0) {
                    setSelectedRaceId((prev) =>
                        flattenedRaces.some((race) => race.id === prev)
                            ? prev : flattenedRaces[0].id
                    );
                } else {
                    setSelectedRaceId("");
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load races.");
                setRaceGroups([]);
                setRaces([]);
                setSelectedRaceId("");
            } finally {
                setRaceLoading(false);
            }
        }

        loadRacesForClass();
    }, [selectedEventClassId]);

    useEffect(() => {
        async function loadResults() {
            if (!selectedRaceId) {
                setRaceResults([]);
                return;
            }

            try {
                setResultsLoading(true);

                const res = await fetch(`/api/results?race_id=${selectedRaceId}`, { cache: "no-store" });

                const json = await res.json();

                if (!res.ok) {
                    throw new Error(json?.error || "Failed to load results.");
                }

                setRaceResults(json || []);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load results.");
                setRaceResults([]);
            } finally {
                setResultsLoading(false);
            }
        }

        loadResults();
    }, [selectedRaceId]);

    const activeClassName =
        eventClasses.find((c) => c.id === selectedEventClassId)?.class_name || "Results";

    const selectedRace =
        races.find((race) => race.id === selectedRaceId) || null;

    const classEntries = useMemo(() => {
        const activeEventClass = eventClasses.find((c) => c.id === selectedEventClassId);
        if (!activeEventClass) return [];

        return entries
            .filter((entry) => entry.class_id === activeEventClass.class_id)
            .sort((a, b) => {
                const carCompare = a.car_number.localeCompare(b.car_number, undefined, {
                    numeric: true,
                    sensitivity: "base",
                });

                if (carCompare !== 0) return carCompare;

                return a.primary_driver_name.localeCompare(b.primary_driver_name, undefined, {
                    sensitivity: "base",
                });
            });
    }, [entries, eventClasses, selectedEventClassId]);

    useEffect(() => {
        if (!classEntries.length) {
            setSelectedEntryId("");
            return;
        }

        setSelectedEntryId((prev) =>
            classEntries.some((entry) => entry.id === prev) ? prev : classEntries[0].id
        );
    }, [classEntries]);

    const addedEntryIds = useMemo(() => {
        return new Set(raceResults.map((row) => row.entry_id));
    }, [raceResults]);

    function handleAddEntryToResults(entry: EventEntryWithDetails) {
        setRaceResults((prev) => {
            if (prev.some((row) => row.entry_id === entry.id)) {
                toast.error("That entry is already in this race.");
                return prev;
            }

            const nextRow: ResultWithDetails = {
                id: `temp-${entry.id}`,
                race_id: selectedRaceId,
                entry_id: entry.id,
                finish_position: prev.length + 1,
                dns: false,
                dnf: false,
                dq: false,
                bf: false,
                notes: null,
                created_at: new Date().toISOString(),

                event_id: entry.event_id,
                season_class_car_id: entry.season_class_car_id,
                override_car_number: entry.override_car_number,
                no_points: entry.no_points,
                no_pay: entry.no_pay,
                pay_to_other: entry.pay_to_other,
                pay_to_name: entry.pay_to_name,

                season_id: entry.season_id,
                class_id: entry.class_id,
                class_name: entry.class_name,
                registration_car_number: entry.registration_car_number,
                car_number: entry.car_number,
                primary_driver_id: entry.primary_driver_id,
                primary_driver_name: entry.primary_driver_name,
                co_driver_id: entry.co_driver_id,
                co_driver_name: entry.co_driver_name,
                is_active: entry.is_active,
            };

            return [...prev, nextRow].map((row, index) => ({
                ...row,
                finish_position: index + 1,
            }));
        });
    }

    function handleTypedAdd() {
        const value = typedCarNum.trim();

        if (!value) return;

        const matchedEntry = classEntries.find((entry) =>
            entry.car_number.trim().toLowerCase() === value.toLowerCase()
        );

        if (!matchedEntry) {
            toast.error("No matching car # found in this class.");
            return;
        }

        if (addedEntryIds.has(matchedEntry.id)) {
            toast.error("That entry is already in this race.");
            return;
        }

        setSelectedEntryId(matchedEntry.id);
        handleAddEntryToResults(matchedEntry);
        setTypedCarNum("");
    }

    function moveResultToPosition(draggedId: string, targetId: string) {
        if (draggedId === targetId) return;

        setRaceResults((prev) => {
            const draggedIndex = prev.findIndex((row) => row.entry_id === draggedId);
            const targetIndex = prev.findIndex((row) => row.entry_id === targetId);

            if (draggedIndex === -1 || targetIndex === -1) return prev;

            const next = [...prev];
            const [draggedRow] = next.splice(draggedIndex, 1);
            next.splice(targetIndex, 0, draggedRow);

            return next.map((row, index) => ({
                ...row,
                finish_position: index + 1,
            }));
        });
    }

    function removeResult(entryId: string) {
        setRaceResults((prev) =>
            prev.filter((row) => row.entry_id !== entryId)
                .map((row, index) => ({
                    ...row,
                    finish_position: index + 1,
                }))
        );
    }

    function updateResultField(
        entryId: string,
        field: "dns" | "dnf" | "dq" | "bf" | "notes",
        value: boolean | string
    ) {
        setRaceResults((prev) =>
            prev.map((row) =>
                row.entry_id === entryId
                    ? {
                        ...row,
                        [field]: value,
                    }
                    : row
            )
        );
    }

    async function handleSaveResults() {
        if (!selectedRaceId) {
            toast.error("Select a race first.");
            return;
        }

        try {
            setSavingResults(true);

            const payload: ResultsSavePayload = {
                results: raceResults.map((row, index) => ({
                    entry_id: row.entry_id,
                    finish_position: index + 1,
                    dns: row.dns,
                    dnf: row.dnf,
                    dq: row.dq,
                    bf: row.bf,
                    notes: row.notes ?? null,
                })),
            };

            const res = await fetch(`/api/results?race_id=${selectedRaceId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Failed to save results.");
            }

            setRaceResults(json || []);
            toast.success("Results saved!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save results.");
        } finally {
            setSavingResults(false);
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Results</h1>
                {eventData && (
                    <div className={styles.muted}>
                        {eventData.name} - {formatDate(eventData.event_date)}
                    </div>
                )}

                <div className={custStyles.tools}>
                    <button
                        className={styles.buttonSecondary}
                        onClick={() => router.push("/results")}
                    >
                        Reverse
                    </button>

                    <button
                        className={styles.button}
                        onClick={() => router.push(`/season/${seasonId}/events/${eventId}/entries`)}
                    >
                        Entries
                    </button>

                    <button
                        className={styles.button}
                        onClick={() => router.push(`/season/${seasonId}/events/${eventId}/races`)}
                    >
                        Races
                    </button>
                </div>
            </div>

            {!eventClasses.length ? (
                <p className={styles.muted}>
                    No classes are assigned to this event yet.
                </p>
            ) : (
                <>
                    <div className={styles.topRow}>
                        <div className={styles.topHalf}>
                            <h2 className={styles.subheading}>Classes</h2>
                            <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                                {eventClasses.map((cls) => (
                                    <button
                                        key={cls.id}
                                        className={
                                            cls.id === selectedEventClassId
                                                ? styles.button
                                                : styles.buttonSecondary
                                        }
                                        onClick={() => setSelectedEventClassId(cls.id)}
                                    >
                                        {cls.class_name || "Unnamed Class"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.separator} />

                        <div className={styles.topHalf}>
                            <h2 className={styles.subheading}>Races</h2>

                            {raceLoading ? (
                                <p className={styles.muted}>Loading races...</p>
                            ) : !races.length ? (
                                <p className={styles.muted}>No races added for this class yet.</p>
                            ) : (
                                <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                                    {races.map((race) => (
                                        <button
                                            key={race.id}
                                            className={
                                                race.id === selectedRaceId
                                                    ? styles.button
                                                    : styles.buttonSecondary
                                            }
                                            onClick={() => setSelectedRaceId(race.id)}
                                        >
                                            {race.name || `Race ${race.race_num}`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.resultsSection}>
                        <div className={styles.resultsLayout}>
                            <div className={styles.resultsSidebarCard}>
                                <div className={styles.resultsSidebarHeader}>
                                    <h3 className={styles.resultsSidebarTitle}>Lineup</h3>

                                    <div className={styles.resultsSidebarTools}>
                                        <button type="button" className={styles.filterBtn}>
                                            Filter
                                        </button>
                                    </div>
                                </div>

                                {!classEntries.length ? (
                                    <div className={styles.resultsSidebarEmpty}>
                                        <p className={styles.muted}>No entries found for this class.</p>
                                    </div>
                                ) : (
                                    <div className={styles.resultsSidebarBody}>
                                        {classEntries.map((entry) => {
                                            const isAlreadyAdded = addedEntryIds.has(entry.id);
                                            const flags = [
                                                entry.no_points ? "No Points" : null,
                                                entry.no_pay ? "No Pay" : null,
                                                entry.pay_to_other && entry.pay_to_name
                                                    ? `Pay to ${entry.pay_to_name}`
                                                    : entry.pay_to_other
                                                        ? "Pay to Other"
                                                        : null,
                                            ]
                                                .filter(Boolean)
                                                .join(" • ");

                                            return (
                                                <button
                                                    key={entry.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isAlreadyAdded) return;
                                                        setSelectedEntryId(entry.id);
                                                        handleAddEntryToResults(entry);
                                                    }}
                                                    disabled={isAlreadyAdded}
                                                    className={`${styles.resultsEntryRow} ${entry.id === selectedEntryId ? styles.resultsEntryRowActive : ""
                                                        }`}
                                                    style={{
                                                        opacity: isAlreadyAdded ? 0.45 : 1,
                                                        cursor: isAlreadyAdded ? "not-allowed" : "pointer",
                                                    }}
                                                >
                                                    <div className={styles.resultsEntryMain}>
                                                        <div className={styles.resultsEntryName}>
                                                            {entry.primary_driver_name}
                                                        </div>

                                                        <div className={styles.resultsEntrySub}>
                                                            {entry.co_driver_name
                                                                ? `${entry.co_driver_name}`
                                                                : ""}
                                                        </div>

                                                        {flags ? (
                                                            <div className={styles.resultsEntryFlags}>{flags}</div>
                                                        ) : null}

                                                        {isAlreadyAdded ? (
                                                            <div className={styles.resultsEntryFlags} />
                                                        ) : null}
                                                    </div>

                                                    <div className={styles.resultsEntryNumber}>
                                                        {entry.car_number}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className={styles.resultsMainCard}>
                                <div className={custStyles.header} style={{ padding: 0, marginBottom: 12, marginTop: 30 }}>
                                    <h2 className={styles.subheading}>
                                        {selectedRace
                                            ? `${selectedRace.name || `Race ${selectedRace.race_num}`} Results`
                                            : `${activeClassName} Results`}
                                    </h2>

                                    <div className={custStyles.tools}>
                                        <button
                                            type="button"
                                            className={styles.button}
                                            onClick={handleSaveResults}
                                            disabled={!selectedRaceId || savingResults}
                                        >
                                            {savingResults ? "Full send..." : "Save Results"}
                                        </button>
                                    </div>
                                </div>

                                {!selectedRaceId ? (
                                    <p className={styles.muted}>Select a race to enter results.</p>
                                ) : resultsLoading ? (
                                    <p className={styles.muted}>Loading results...</p>
                                ) : (
                                    <>
                                        <div className={custStyles.tableWrap}>
                                            <div className={custStyles.secondHeader}>
                                                <input
                                                    className={styles.input}
                                                    style={{ maxWidth: 100, maxHeight: 35 }}
                                                    value={typedCarNum}
                                                    onChange={(e) => setTypedCarNum(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleTypedAdd();
                                                        }
                                                    }}
                                                    placeholder="No."
                                                    disabled={!selectedRaceId}
                                                />
                                                Type a car # & press enter
                                            </div>

                                            {!raceResults.length ? (
                                                <p className={styles.muted}>
                                                    No results added yet. Click drivers on the left or type a car # above to add them.
                                                </p>
                                            ) : (
                                                <table className={custStyles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: 44 }}></th>
                                                            <th style={{ width: 70 }}>Pos</th>
                                                            <th style={{ width: 90 }}>#</th>
                                                            <th>Driver</th>
                                                            <th style={{ width: 70 }}>DNS</th>
                                                            <th style={{ width: 70 }}>DNF</th>
                                                            <th style={{ width: 70 }}>DQ</th>
                                                            <th style={{ width: 70 }}>BF</th>
                                                            <th style={{ width: 500 }}>Notes</th>
                                                            <th style={{ width: 90 }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {raceResults.map((row, index) => (
                                                            <tr
                                                                key={row.entry_id}
                                                                onDragOver={(e) => e.preventDefault()}
                                                                onDrop={() => {
                                                                    if (draggedEntryId) {
                                                                        moveResultToPosition(draggedEntryId, row.entry_id);
                                                                    }
                                                                    setDraggedEntryId(null);
                                                                }}
                                                                style={{ opacity: draggedEntryId === row.entry_id ? 0.5 : 1 }}
                                                            >
                                                                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                                                                    <DragHandle
                                                                        label={`Drag ${row.primary_driver_name}`}
                                                                        onDragStart={() => setDraggedEntryId(row.entry_id)}
                                                                        onDragEnd={() => setDraggedEntryId(null)}
                                                                        className={styles.iconButton}
                                                                    />
                                                                </td>
                                                                <td>{index + 1}</td>
                                                                <td>{row.car_number}</td>
                                                                <td>
                                                                    <div className={custStyles.name}>
                                                                        {row.primary_driver_name}
                                                                    </div>
                                                                    <div className={custStyles.subtle}>
                                                                        {row.co_driver_name
                                                                            ? `Co-driver: ${row.co_driver_name}`
                                                                            : ""}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.dns}
                                                                        onChange={(e) => updateResultField(row.entry_id, "dns", e.target.checked)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.dnf}
                                                                        onChange={(e) => updateResultField(row.entry_id, "dnf", e.target.checked)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.dq}
                                                                        onChange={(e) => updateResultField(row.entry_id, "dq", e.target.checked)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.bf}
                                                                        onChange={(e) => updateResultField(row.entry_id, "bf", e.target.checked)}
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        className={styles.input}
                                                                        value={row.notes ?? ""}
                                                                        onChange={(e) => updateResultField(row.entry_id, "notes", e.target.value)}
                                                                        placeholder="Optional notes"
                                                                    />
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.iconButton}
                                                                        onClick={() => removeResult(row.entry_id)}
                                                                    >
                                                                        <Trash size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}