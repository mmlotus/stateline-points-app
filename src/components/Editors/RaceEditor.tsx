"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { DEFAULT_STATUS, EVENT_STATUS_OPTIONS, EventClassWithClassName, Race, RaceEditorRaceInput, RaceEditorSavePayload, RaceGroup, RaceGroupEditorBlock, RaceGroupInput, RaceGroupType, RaceInput, RaceStatus } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Save, Trash, Trash2 } from "lucide-react";

const GROUP_TYPE_OPTIONS: RaceGroupType[] = [
    "qualifying", "heat", "feature_d", "feature_c", "feature_b", "feature_a",
];

function prettifyGroupType(value: RaceGroupType) {
    switch (value) {
        case "qualifying": return "Qualifying";
        case "heat": return "Heat";
        case "feature_d": return "D Feature";
        case "feature_c": return "C Feature";
        case "feature_b": return "B Feature";
        case "feature_a": return "A Feature";
        default: return value;
    }
}

function getDefaultRaceName(groupType: RaceGroupType, raceNum: number) {
    switch (groupType) {
        case "qualifying": return raceNum === 1 ? "Qualifying" : `Qualifying ${raceNum}`;
        case "heat": return `Heat ${raceNum}`;
        case "feature_d": return raceNum === 1 ? "D Main" : `D Main ${raceNum}`;
        case "feature_c": return raceNum === 1 ? "C Main" : `C Main ${raceNum}`;
        case "feature_b": return raceNum === 1 ? "B Main" : `B Main ${raceNum}`;
        case "feature_a": return raceNum === 1 ? "A Main" : `A Main ${raceNum}`;
        default: return `${prettifyGroupType(groupType)} ${raceNum}`;
    }
}

type RaceRowState = Omit<RaceInput, "name" | "notes"> & {
    id?: string;
    name: string;
    notes: string;
};

type RaceGroupState = Omit<RaceGroupInput, "notes"> & {
    id?: string;
    notes: string;
    races: RaceRowState[];
    collapsed: boolean;
};

function createEmptyRaceRow(
    groupType: RaceGroupType,
    raceNum: number,
    overrides: Partial<RaceRowState> = {}
): RaceRowState {
    return {
        race_num: raceNum,
        name: getDefaultRaceName(groupType, raceNum),
        status: DEFAULT_STATUS,
        notes: "",
        order_index: raceNum - 1,
        transfer_count: 0,
        ...overrides,
    };
}

function createEmptyGroup(
    groupType: RaceGroupType,
    eventClassId: string,
    orderIndex: number
): RaceGroupState {
    return {
        event_class_id: eventClassId,
        group_type: groupType,
        title: prettifyGroupType(groupType),
        order_index: orderIndex,
        status: DEFAULT_STATUS,
        notes: "",
        races: [createEmptyRaceRow(groupType, 1)],
        collapsed: false,
    };
}

function toRaceRowState(race: Race): RaceRowState {
    return {
        id: race.id,
        race_num: race.race_num,
        name: race.name ?? "",
        status: race.status,
        notes: race.notes ?? "",
        order_index: race.order_index,
        transfer_count: race.transfer_count ?? 0,
    };
}

function buildGroups(
    eventClassId: string,
    groups: RaceGroup[],
    racesByGroupId: Record<string, Race[]>
): RaceGroupState[] {
    return groups
        .filter((group) => group.event_class_id === eventClassId)
        .sort((a, b) => a.order_index - b.order_index)
        .map((group, idx) => ({
            id: group.id,
            event_class_id: group.event_class_id,
            group_type: group.group_type,
            title: group.title,
            order_index: idx,
            status: group.status,
            notes: group.notes ?? "",
            races: (racesByGroupId[group.id] ?? [])
                .sort((a, b) => a.order_index - b.order_index)
                .map(toRaceRowState),
            collapsed: false,
        }));
}

export default function RaceEditor({
    eventClasses,
    activeClassId,
    groups = [],
    racesByGroupId = {},
    onClassChange,
    onSave,
    onCancel,
}: {
    eventClasses: EventClassWithClassName[];
    activeClassId?: string | null;
    groups?: RaceGroup[];
    racesByGroupId?: Record<string, Race[]>;
    onClassChange?: (eventClassId: string) => Promise<void> | void;
    onSave: (payload: RaceEditorSavePayload) => Promise<void> | void;
    onCancel?: () => void;
}) {
    const [saving, setSaving] = useState(false);
    const [showFloatingSave, setShowFloatingSave] = useState(false);
    const [, setAddingGroup] = useState(false);
    const saveBtnRef = useRef<HTMLButtonElement | null>(null);

    const resolvedClassId = useMemo(() => {
        if (activeClassId) return activeClassId;
        return eventClasses[0]?.id ?? "";
    }, [activeClassId, eventClasses]);

    const [selectedClassId, setSelectedClassId] = useState<string>(resolvedClassId);
    const [groupStates, setGroupStates] = useState<RaceGroupState[]>(() =>
        resolvedClassId ? buildGroups(resolvedClassId, groups, racesByGroupId) : []
    );

    useEffect(() => {
        const el = saveBtnRef.current;
        if (!el) return;

        const obs = new IntersectionObserver(
            ([entry]) => setShowFloatingSave(!entry.isIntersecting),
            { root: null, threshold: 0.1 }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        setSelectedClassId(resolvedClassId);
        setGroupStates(
            resolvedClassId ? buildGroups(resolvedClassId, groups, racesByGroupId) : []
        );
        setAddingGroup(false);
    }, [resolvedClassId, groups, racesByGroupId]);

    async function handleClassSelect(classId: string) {
        setSelectedClassId(classId);
        setGroupStates(buildGroups(classId, groups, racesByGroupId));
        setAddingGroup(false);
        if (onClassChange) await onClassChange(classId);
    }

    function updateRaceRow(
        groupIndex: number,
        raceIndex: number,
        patch: Partial<RaceRowState>
    ) {
        setGroupStates((prev) =>
            prev.map((group, i) => {
                if (i !== groupIndex) return group;
                return {
                    ...group,
                    races: group.races.map((race, rIdx) =>
                        rIdx === raceIndex ? { ...race, ...patch } : race
                    ),
                };
            })
        );
    }

    function addRaceRow(groupIndex: number) {
        setGroupStates((prev) =>
            prev.map((group, i) => {
                if (i !== groupIndex) return group;

                const nextRaceNum = group.races.length + 1;

                return {
                    ...group,
                    races: [
                        ...group.races,
                        createEmptyRaceRow(group.group_type, nextRaceNum, {
                            order_index: group.races.length,
                        }),
                    ],
                };
            })
        );
    }

    function removeRaceRow(groupIndex: number, raceIndex: number) {
        setGroupStates((prev) =>
            prev.map((group, i) => {
                if (i !== groupIndex) return group;

                const next = group.races.filter((_, idx) => idx !== raceIndex);

                const rebuilt = next.length
                    ? next.map((race, idx) => {
                        const nextRaceNum = idx + 1;
                        const oldDefault = getDefaultRaceName(group.group_type, race.race_num);
                        const newDefault = getDefaultRaceName(group.group_type, nextRaceNum);

                        return {
                            ...race,
                            race_num: nextRaceNum,
                            order_index: idx,
                            name:
                                !race.name.trim() || race.name === oldDefault
                                    ? newDefault
                                    : race.name,
                        };
                    })
                    : [createEmptyRaceRow(group.group_type, 1)];

                return {
                    ...group,
                    races: rebuilt,
                };
            })
        );
    }

    function removeGroup(groupIndex: number) {
        setGroupStates((prev) =>
            prev
                .filter((_, idx) => idx !== groupIndex)
                .map((group, idx) => ({
                    ...group,
                    order_index: idx,
                }))
        );
    }

    function toggleGroupCollapse(groupIndex: number) {
        setGroupStates((prev) =>
            prev.map((group, i) =>
                i === groupIndex
                    ? { ...group, collapsed: !group.collapsed }
                    : group
            )
        );
    }

    function addGroup(groupType: RaceGroupType) {
        if (!selectedClassId) {
            toast.error("Please select a class first.");
            return;
        }

        const alreadyExists = groupStates.some((g) => g.group_type === groupType);
        if (alreadyExists) {
            toast.error(`${prettifyGroupType(groupType)} already exists.`);
            return;
        }

        setGroupStates((prev) => [
            ...prev,
            createEmptyGroup(groupType, selectedClassId, prev.length),
        ]);
        setAddingGroup(false);
    }

    const availableGroupTypes = GROUP_TYPE_OPTIONS.filter(
        (type) => !groupStates.some((group) => group.group_type === type)
    );

    async function handleSave() {
        if (!selectedClassId) {
            toast.error("Please select a class.");
            return;
        }

        const cleanedGroups: RaceGroupEditorBlock[] = groupStates.map((group, groupIndex) => ({
            ...(group.id ? { id: group.id } : {}),
            event_class_id: selectedClassId,
            group_type: group.group_type,
            title: prettifyGroupType(group.group_type),
            order_index: groupIndex,
            status: group.status,
            notes: group.notes.trim() ? group.notes.trim() : "",
            races: group.races.map((race, raceIndex): RaceEditorRaceInput => ({
                ...(race.id ? { id: race.id } : {}),
                race_num: raceIndex + 1,
                name: race.name.trim() || getDefaultRaceName(group.group_type, raceIndex + 1),
                status: race.status,
                notes: race.notes.trim() ? race.notes.trim() : null,
                order_index: raceIndex,
                transfer_count: Math.max(0, Number(race.transfer_count || 0)),
            })),
        }));

        setSaving(true);
        try {
            await onSave({
                event_class_id: selectedClassId,
                groups: cleanedGroups,
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to save races.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            {showFloatingSave && (
                <button
                    type="button"
                    className={styles.floatingSave}
                    onClick={handleSave}
                    aria-label="Save changes"
                    title="Save changes"
                    disabled={saving || !eventClasses.length}
                >
                    <Save size={18} />
                </button>
            )}

            {eventClasses.length ? (
                <>
                    <div className={styles.keyPanel}>
                        <h2 className={styles.subheading}>Classes</h2>
                        <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                            {eventClasses.map((cls) => (
                                <button
                                    key={cls.id}
                                    className={
                                        cls.id === selectedClassId
                                            ? styles.button
                                            : styles.buttonSecondary
                                    }
                                    onClick={() => handleClassSelect(cls.id)}
                                    disabled={saving}
                                >
                                    {cls.class_name || "Unnamed Class"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.keyPanel}>
                        <h2 className={styles.subheading}>Add Race Group</h2>

                        {!selectedClassId ? (
                            <p className={styles.muted}>Select a class first.</p>
                        ) : availableGroupTypes.length === 0 ? (
                            <p className={styles.muted}>All race groups have been added for this class!</p>
                        ) : (
                            <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                                {availableGroupTypes.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={styles.buttonSecondary}
                                        onClick={() => addGroup(type)}
                                        disabled={saving || !selectedClassId}
                                    >
                                        {prettifyGroupType(type)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className={styles.input}>No classes assigned to this event.</div>
            )}

            {groupStates.map((group, groupIndex) => (
                <div key={group.id ?? group.group_type} className={styles.section}>
                    <div className={styles.groupHeader}>
                        <h2 className={styles.groupHeading}>
                            {group.title.trim() || prettifyGroupType(group.group_type)}
                        </h2>

                        <div className={styles.groupHeaderActions}>
                            <button
                                type="button"
                                className={styles.squareActionButton}
                                onClick={() => removeGroup(groupIndex)}
                                disabled={saving}
                                aria-label="Remove group"
                                title="Remove group"
                            >
                                <Trash2 size={18} />
                            </button>

                            <button
                                type="button"
                                className={styles.squareActionButton}
                                onClick={() => addRaceRow(groupIndex)}
                                disabled={saving}
                                aria-label="Add race"
                                title="Add race"
                            >
                                <Plus size={18} />
                            </button>

                            <button
                                type="button"
                                className={styles.squareActionButton}
                                onClick={() => toggleGroupCollapse(groupIndex)}
                                disabled={saving}
                                aria-label={group.collapsed ? "Expand group" : "Collapse group"}
                                title={group.collapsed ? "Expand group" : "Collapse group"}
                            >
                                {group.collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            </button>
                        </div>
                    </div>

                    {!group.collapsed && (
                        <>
                            <div className={styles.racesSection}>
                                {group.races.map((race, raceIndex) => (
                                    <div key={`${group.group_type}-${raceIndex}`} className={styles.raceCardCompact}>
                                        <div className={styles.raceMeta}>
                                            <span className={styles.raceMetaLabel}>Race #</span>
                                            <span className={styles.raceMetaValue}>{race.race_num}</span>
                                        </div>

                                        <div className={styles.raceInlineFields}>
                                            <div className={styles.raceInlineField}>
                                                <label className={styles.compactLabel}>Race Name</label>
                                                <input
                                                    className={styles.input}
                                                    value={race.name}
                                                    onChange={(e) =>
                                                        updateRaceRow(groupIndex, raceIndex, {
                                                            name: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Optional"
                                                    disabled={saving}
                                                />
                                            </div>

                                            <div className={styles.raceInlineFieldStatus}>
                                                <label className={styles.compactLabel}>Status:</label>
                                                <select
                                                    className={styles.input}
                                                    value={race.status}
                                                    onChange={(e) =>
                                                        updateRaceRow(groupIndex, raceIndex, {
                                                            status: e.target.value as RaceStatus,
                                                        })
                                                    }
                                                    disabled={saving}
                                                >
                                                    {EVENT_STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className={styles.raceInlineField}>
                                                <label className={styles.compactLabel}># of Positions to Transfer</label>
                                                <input
                                                    className={styles.input}
                                                    type="number"
                                                    min={0}
                                                    step={1}
                                                    value={race.transfer_count}
                                                    onChange={(e) =>
                                                        updateRaceRow(groupIndex, raceIndex, {
                                                            transfer_count: Math.max(0, Number(e.target.value || 0)),
                                                        })
                                                    }
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className={styles.squareActionButton}
                                            onClick={() => removeRaceRow(groupIndex, raceIndex)}
                                            disabled={saving}
                                            aria-label="Remove race"
                                            title="Remove race"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ))}

            <div className={styles.buttonGroup}>
                {onCancel && (
                    <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                )}

                <button
                    ref={saveBtnRef}
                    type="button"
                    className={styles.button}
                    onClick={handleSave}
                    disabled={saving || !eventClasses.length}
                >
                    {saving ? "Full send..." : "Save Races"}
                </button>
            </div>
        </>
    );
}