"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import orderStyles from "@/styles/Orders.module.css";
import { EditableBreakdown, EditableSchemeLine, EditableSchemePayload, ModifierMode, ResultModifier, SchemeBreakdownType, SchemeSavePayload, SchemeType, TransferExclusionRace } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Save, TrashIcon } from "lucide-react";

type Props = {
    initialData?: EditableSchemePayload | null;
    onSave: (data: SchemeSavePayload) => Promise<void>;
};

function makeLine(value: number | "" = ""): EditableSchemeLine {
    return {
        client_id: crypto.randomUUID(),
        start_position: "", //ignored
        value,
    };
}

function defaultModifier(): ResultModifier {
    return { mode: "full" };
}

function defaultBreakdown(type: SchemeBreakdownType): EditableBreakdown {
    return {
        type,
        exclude_show_up_points: false,
        result_modifiers: {
            dnf: defaultModifier(),
            dq: { mode: "none" },
            dns: { mode: "none" },
            bf: defaultModifier(),
        },
        transfer_exclusions_enabled: false,
        transfer_exclusion_races: [],
        passing_points_enabled: false,
        passing_points_gain_value: 0,
        passing_points_lost_value: 0,
        lines: Array.from({ length: 5 }, () => makeLine("")),
    };
}

function breakdownLabel(t: SchemeBreakdownType) {
    switch (t) {
        case "qualifying":
            return "Qualifying";
        case "heat":
            return "Heat";
        case "d_feature":
            return "D Main";
        case "c_feature":
            return "C Main";
        case "b_feature":
            return "B Main";
        case "a_feature":
            return "A Main";
        default:
            return t;
    }
}

function normalizedStartPosition(index: number, total: number) {
    const n = index + 1;
    const isPlusRow = index === total - 1;
    return isPlusRow ? `${n}+` : String(n);
}

function prettyTransferRaceLabel(t: SchemeBreakdownType) {
    switch (t) {
        case "heat":
            return "Heat";
        case "d_feature":
            return "D Main";
        case "c_feature":
            return "C Main";
        case "b_feature":
            return "B Main";
        case "a_feature":
            return "A Main";
        default:
            return t;
    }
}

function getTransferOptionsForBreakdown(bType: SchemeBreakdownType): TransferExclusionRace[] {
    if (bType === "a_feature") return ["heat", "d_feature", "c_feature", "b_feature"];

    switch (bType) {
        case "qualifying":
            return ["heat", "d_feature", "c_feature", "b_feature", "a_feature"];
        case "heat":
            return ["d_feature", "c_feature", "b_feature", "a_feature"];
        case "d_feature":
            return ["c_feature", "b_feature", "a_feature"];
        case "c_feature":
            return ["b_feature", "a_feature"];
        case "b_feature":
            return ["a_feature"];
        default:
            return [];
    }
}

export default function SchemeEditor({ initialData, onSave }: Props) {
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [type, setType] = useState<SchemeType>(initialData?.type || "points");
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

    const [showUpEnabled, setShowUpEnabled] = useState<boolean>(
        initialData?.show_up_points_enabled ?? false
    );
    const [showUpStartPoints, setShowUpStartPoints] = useState<number>(
        initialData?.show_up_start_points ?? 0
    );
    const [showUpNonStartPoints, setShowUpNonStartPoints] = useState<number>(
        initialData?.show_up_non_start_points ?? 0
    );

    const [continuousFeaturePoints, setContinuousFeaturePoints] = useState(
        initialData?.continuous_feature_points ?? true
    );

    const [payShowBMain, setPayShowBMain] = useState(
        initialData?.pay_show_b_main ?? false
    );

    const [addPointsEnabled, setAddPointsEnabled] = useState(
        initialData?.add_points_enabled ?? false
    );
    const [addPointsLabel,] = useState(
        initialData?.add_points_label ?? "# of spins"
    );

    const breakdownOrder: SchemeBreakdownType[] = useMemo(
        () => ["qualifying", "heat", "d_feature", "c_feature", "b_feature", "a_feature"],
        []
    );

    const [breakdowns, setBreakdowns] = useState<EditableBreakdown[]>(() => {
        if (initialData?.breakdowns?.length) {
            const map = new Map<SchemeBreakdownType, EditableBreakdown>();
            for (const b of initialData.breakdowns) map.set(b.type, b);

            return breakdownOrder.map((t) => {
                const existing = map.get(t);
                if (!existing) return defaultBreakdown(t);

                return {
                    ...existing,
                    exclude_show_up_points: existing.exclude_show_up_points ?? false,

                    transfer_exclusions_enabled: existing.transfer_exclusions_enabled ?? false,
                    transfer_exclusion_races: existing.transfer_exclusion_races ?? [],

                    lines:
                        existing.lines?.length
                            ? existing.lines.map((l) => makeLine(l.value ?? ""))
                            : Array.from({ length: 5 }, () => makeLine("")),
                    result_modifiers: {
                        dnf: existing.result_modifiers?.dnf ?? defaultModifier(),
                        dq: existing.result_modifiers?.dq ?? defaultModifier(),
                        dns: existing.result_modifiers?.dns ?? defaultModifier(),
                        bf: existing.result_modifiers?.bf ?? defaultModifier(),
                    },
                };
            });
        }

        return breakdownOrder.map((t) => defaultBreakdown(t));
    });

    const valueRefs = useRef<Record<string, Array<HTMLInputElement | null>>>({});
    const pendingFocus = useRef<Record<string, number | null>>({});

    const saveBtnRef = useRef<HTMLButtonElement | null>(null);
    const [showFloatingSave, setShowFloatingSave] = useState(false);

    useEffect(() => {
        const el = saveBtnRef.current;
        if (!el) return;

        const obs = new IntersectionObserver(
            ([entry]) => {
                // If the real Save button is NOT visible, show the floating one
                setShowFloatingSave(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0.1,
            }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    function ensureRefBucket(bType: SchemeBreakdownType) {
        if (!valueRefs.current[bType]) valueRefs.current[bType] = [];
        if (pendingFocus.current[bType] === undefined) pendingFocus.current[bType] = null;
    }

    function addLine(bType: SchemeBreakdownType, focusIndex?: number) {
        ensureRefBucket(bType);
        if (typeof focusIndex === "number") {
            pendingFocus.current[bType] = focusIndex;
        }

        setBreakdowns((prev) =>
            prev.map((b) =>
                b.type === bType ? { ...b, lines: [...b.lines, makeLine("")] } : b
            )
        );
    }

    function removeLine(bType: SchemeBreakdownType, index: number) {
        ensureRefBucket(bType);
        setBreakdowns((prev) =>
            prev.map((b) =>
                b.type === bType ? { ...b, lines: b.lines.filter((_, i) => i !== index) } : b
            )
        );
        valueRefs.current[bType]?.splice(index, 1);
    }

    function updateLine(
        bType: SchemeBreakdownType,
        index: number,
        field: keyof EditableSchemeLine,
        value: EditableSchemeLine[keyof EditableSchemeLine]
    ) {
        setBreakdowns((prev) =>
            prev.map((b) => {
                if (b.type !== bType) return b;
                const copy = [...b.lines];
                copy[index] = { ...copy[index], [field]: value };
                return { ...b, lines: copy };
            })
        );
    }

    function setExcludeShowUp(bType: SchemeBreakdownType, checked: boolean) {
        setBreakdowns((prev) =>
            prev.map((b) => (b.type === bType ? { ...b, exclude_show_up_points: checked } : b))
        );
    }

    function setModifierMode(
        bType: SchemeBreakdownType,
        key: keyof EditableBreakdown["result_modifiers"],
        mode: ModifierMode
    ) {
        setBreakdowns((prev) =>
            prev.map((b) => {
                if (b.type !== bType) return b;
                const current = b.result_modifiers[key] ?? defaultModifier();
                const next: ResultModifier =
                    mode === "custom"
                        ? { ...current, mode, custom_value: current.custom_value ?? 0 }
                        : { mode };
                return {
                    ...b,
                    result_modifiers: { ...b.result_modifiers, [key]: next },
                };
            })
        );
    }

    function setModifierCustomValue(
        bType: SchemeBreakdownType,
        key: keyof EditableBreakdown["result_modifiers"],
        customValue: number
    ) {
        setBreakdowns((prev) =>
            prev.map((b) => {
                if (b.type !== bType) return b;
                const current = b.result_modifiers[key] ?? defaultModifier();
                return {
                    ...b,
                    result_modifiers: {
                        ...b.result_modifiers,
                        [key]: { ...current, mode: "custom", custom_value: customValue },
                    },
                };
            })
        );
    }

    function setTransferEnabled(bType: SchemeBreakdownType, enabled: boolean) {
        setBreakdowns((prev) =>
            prev.map((b) =>
                b.type === bType ? {
                    ...b,
                    transfer_exclusions_enabled: enabled,
                    transfer_exclusion_races: enabled ? b.transfer_exclusion_races ?? [] : [],
                } : b
            ));
    }

    function toggleTransferRace(bType: SchemeBreakdownType, target: TransferExclusionRace) {
        setBreakdowns((prev) =>
            prev.map((b) => {
                if (b.type !== bType) return b;

                const current = b.transfer_exclusion_races ?? [];
                const next = current.includes(target)
                    ? current.filter((x) => x !== target)
                    : [...current, target];
                return { ...b, transfer_exclusion_races: next };
            })
        );
    }

    function setValueRef(
        bType: SchemeBreakdownType,
        index: number,
        el: HTMLInputElement | null
    ) {
        if (!valueRefs.current[bType]) valueRefs.current[bType] = [];
        valueRefs.current[bType][index] = el;
    }

    const lineLengthSignature = useMemo(
        () => breakdowns.map((b) => b.lines.length).join("|"),
        [breakdowns]
    );

    useEffect(() => {
        for (const b of breakdowns) {
            const bType = b.type;
            const idx = pendingFocus.current[bType];
            if (idx === null || idx === undefined) continue;

            requestAnimationFrame(() => {
                valueRefs.current[bType]?.[idx]?.focus();
                valueRefs.current[bType]?.[idx]?.select?.();
                pendingFocus.current[bType] = null;
            });
        }
    }, [breakdowns, lineLengthSignature]);

    async function handleSave() {
        const payload: SchemeSavePayload = {
            name,
            description,
            type,
            is_active: isActive,

            show_up_points_enabled: showUpEnabled,
            show_up_start_points: showUpStartPoints,
            show_up_non_start_points: showUpNonStartPoints,

            continuous_feature_points: continuousFeaturePoints,
            pay_show_b_main: payShowBMain,

            add_points_enabled: addPointsEnabled,
            add_points_label: addPointsLabel ? addPointsLabel : "",

            breakdowns: breakdowns.map((b) => ({
                type: b.type,
                exclude_show_up_points: b.exclude_show_up_points,
                result_modifiers: b.result_modifiers,

                transfer_exclusions_enabled: b.transfer_exclusions_enabled ?? false,
                transfer_exclusion_races: b.transfer_exclusion_races ?? [],

                passing_points_enabled: b.passing_points_enabled ?? false,
                passing_points_gain_value: b.passing_points_gain_value ?? 0,
                passing_points_lost_value: b.passing_points_lost_value ?? 0,

                lines: b.lines.map((l, i) => ({
                    start_position: normalizedStartPosition(i, b.lines.length),
                    value: l.value === "" ? 0 : l.value,
                })),
            })),
        };

        try {
            await onSave(payload);
        } catch (error) {
            console.error(error);
        }
    }

    const visibleBreakdowns = useMemo<EditableBreakdown[]>(() => {
        if (type === "pay") {
            return breakdowns.filter(
                (b) => b.type === "a_feature" || (payShowBMain && b.type === "b_feature")
            );
        }

        if (!continuousFeaturePoints) return breakdowns;

        return breakdowns.filter((b) => b.type !== "b_feature" && b.type !== "c_feature" && b.type !== "d_feature");
    }, [type, breakdowns, continuousFeaturePoints, payShowBMain]);

    const isPoints = type === "points";
    const isPay = type === "pay";

    return (
        <>
            {showFloatingSave && (
                <button
                    type="button"
                    className={styles.floatingSave}
                    onClick={handleSave}
                    aria-label="Save changes"
                    title="Save changes"
                >
                    <Save size={18} />
                </button>
            )}

            {/* SCHEME DETAILS */}
            <div className={styles.section}>
                <label className={styles.label}>Name</label>
                <input
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. DEFAULT Points System"
                />

                <label className={styles.label}>Description</label>
                <textarea
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.textarea}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. For NON-Boat Race Nights. Show Up/Register, Qual..."
                />

                <label className={styles.label}>Type</label>
                <select
                    style={{ marginTop: 5, marginBottom: 14 }}
                    className={styles.input}
                    value={type}
                    onChange={(e) => {
                        const nextType = e.target.value as SchemeType;
                        setType(nextType);

                        if (nextType === "pay") {
                            setContinuousFeaturePoints(false);
                        }
                    }}
                >
                    <option value="points">Points</option>
                    <option value="pay">Pay</option>
                </select>

                <div className={styles.grid}>
                    <label className={orderStyles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        Active
                    </label>

                    {isPoints && (
                        <>
                            <label className={orderStyles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={continuousFeaturePoints}
                                    onChange={(e) => setContinuousFeaturePoints(e.target.checked)}
                                />
                                Continuous Feature Points
                            </label>

                            <label className={orderStyles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={addPointsEnabled}
                                    onChange={(e) => setAddPointsEnabled(e.target.checked)}
                                />
                                Enable additional (specialty) points
                            </label>
                        </>
                    )}

                    {isPay && (
                        <label className={orderStyles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={payShowBMain}
                                onChange={(e) => setPayShowBMain(e.target.checked)}
                            />
                            Show B Main Payout
                        </label>
                    )}
                </div>
            </div>

            {/* GLOBAL SHOW-UP POINTS */}
            <div className={styles.section}>
                <h2 className={styles.subheading}>
                    {isPoints ? "Show-up Points" : "Show-up Pay"}
                </h2>

                <label className={styles.labelLine}>
                    <input
                        type="checkbox"
                        checked={showUpEnabled}
                        onChange={(e) => setShowUpEnabled(e.target.checked)}
                    />
                    {isPoints ? "Enable Show-up Points" : "Enable Show-up Pay"}
                </label>

                {showUpEnabled && (
                    <div className={styles.grid}>
                        <div>
                            <label className={styles.label}>
                                {isPoints ? "Start Points" : "Start Pay"}
                            </label>
                            {isPoints ? (
                                <input
                                    className={styles.input}
                                    type="number"
                                    value={showUpStartPoints}
                                    onChange={(e) => setShowUpStartPoints(Number(e.target.value || 0))}
                                />
                            ) : (
                                <div className={styles.currencyField}>
                                    <span className={styles.currencySymbol}>$</span>
                                    <input
                                        className={`${styles.input} ${styles.currencyInput}`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={showUpStartPoints}
                                        onChange={(e) => setShowUpStartPoints(Number(e.target.value || 0))}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={styles.label}>
                                {isPoints ? "Non-Start Points" : "Non-Start Pay"}
                            </label>
                            {isPoints ? (
                                <input
                                    className={styles.input}
                                    type="number"
                                    value={showUpNonStartPoints}
                                    onChange={(e) => setShowUpNonStartPoints(Number(e.target.value || 0))}
                                />
                            ) : (
                                <div className={styles.currencyField}>
                                    <span className={styles.currencySymbol}>$</span>
                                    <input
                                        className={`${styles.input} ${styles.currencyInput}`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={showUpNonStartPoints}
                                        onChange={(e) => setShowUpNonStartPoints(Number(e.target.value || 0))}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* BREAKDOWNS */}
            {visibleBreakdowns.map((b) => {
                const isA = b.type === "a_feature";
                const transferOptions = getTransferOptionsForBreakdown(b.type);

                return (
                    <div key={b.type} className={styles.section}>
                        <h2 className={styles.subheading}>{breakdownLabel(b.type)}</h2>

                        <div className={styles.schemeLayout}>
                            {/* LEFT/RIGHT FOR THIS BREAKDOWN */}
                            <div className={styles.schemeLeft}>
                                <label className={styles.labelLine}>
                                    <input
                                        type="checkbox"
                                        checked={b.exclude_show_up_points}
                                        onChange={(e) => setExcludeShowUp(b.type, e.target.checked)}
                                    />
                                    This race is <b>NOT</b> eligible for Show-Up {isPoints ? "Points" : "Pay"}
                                </label>

                                <div>
                                    <div className={styles.label} style={{ marginBottom: 8 }}>
                                        Result Modifiers
                                    </div>

                                    {(
                                        [
                                            ["dnf", "DNF"],
                                            ["dq", "DQ"],
                                            ["dns", "DNS"],
                                            ["bf", "BF"],
                                        ] as const
                                    ).map(([key, label]) => {
                                        const mod = b.result_modifiers[key];
                                        const mode = mod?.mode ?? "full";

                                        return (
                                            <div
                                                key={key}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    marginBottom: 10,
                                                }}
                                            >
                                                <div style={{ width: 48 }} className={styles.schemeReadOnly}>
                                                    {label}
                                                </div>

                                                <select
                                                    className={styles.input}
                                                    value={mode}
                                                    onChange={(e) =>
                                                        setModifierMode(
                                                            b.type, key, e.target.value as ModifierMode
                                                        )
                                                    }
                                                >
                                                    <option value="full">Full</option>
                                                    <option value="none">None</option>
                                                    <option value="custom">Custom</option>
                                                </select>

                                                {mode === "custom" && (
                                                    <input
                                                        className={styles.input}
                                                        type="number"
                                                        value={mod?.custom_value ?? 0}
                                                        onChange={(e) =>
                                                            setModifierCustomValue(
                                                                b.type, key, Number(e.target.value || 0)
                                                            )
                                                        }
                                                        style={{ width: 120 }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {isPoints && (
                                    <div>
                                        <div className={styles.label} style={{ marginBottom: 8 }}>
                                            Excluded Transfers
                                        </div>

                                        <label className={styles.labelLine}>
                                            <input
                                                type="checkbox"
                                                checked={b.transfer_exclusions_enabled ?? false}
                                                onChange={(e) => setTransferEnabled(b.type, e.target.checked)}
                                            />
                                            Enable transfer exclusions
                                        </label>

                                        {(b.transfer_exclusions_enabled ?? false) && (
                                            <div style={{ marginTop: 12 }}>
                                                <div className={styles.label} style={{ marginBottom: 8 }}>
                                                    {isA ? (
                                                        <>
                                                            Competitors transferring <b>into A Main</b> from selected races{" "}
                                                            <b>WILL NOT</b> earn finishing points/pay in those lower races.
                                                            (They will still earn A Main points/pay.)
                                                        </>
                                                    ) : (
                                                        <>
                                                            Competitors transferring to selected races <b>WILL NOT</b> earn
                                                            finishing points/pay in this race.
                                                        </>
                                                    )}
                                                </div>

                                                <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
                                                    {transferOptions.map((t) => (
                                                        <label
                                                            key={t}
                                                            className={styles.labelLine}
                                                            style={{
                                                                border: "1px solid var(--border)",
                                                                padding: 12,
                                                                borderRadius: 10,
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={(b.transfer_exclusion_races ?? []).includes(t)}
                                                                onChange={() => toggleTransferRace(b.type, t)}
                                                            />
                                                            {prettyTransferRaceLabel(t)}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isPoints && (
                                    <div>
                                        <div className={styles.label} style={{ marginBottom: 8 }}>
                                            Passing Points
                                        </div>

                                        <label className={styles.labelLine}>
                                            <input
                                                type="checkbox"
                                                checked={b.passing_points_enabled ?? false}
                                                onChange={(e) => {
                                                    const enabled = e.target.checked;
                                                    setBreakdowns(prev =>
                                                        prev.map(br =>
                                                            br.type === b.type
                                                                ? {
                                                                    ...br,
                                                                    passing_points_enabled: enabled,
                                                                    passing_points_gain_value: enabled ? (br.passing_points_gain_value ?? 0) : 0,
                                                                    passing_points_lost_value: enabled ? (br.passing_points_lost_value ?? 0) : 0,
                                                                }
                                                                : br
                                                        )
                                                    );
                                                }}
                                            />
                                            Enable Passing Points
                                        </label>

                                        {(b.passing_points_enabled ?? false) && (
                                            <div style={{ marginTop: 10 }}>
                                                {/* ROW: GAIN */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                        marginBottom: 10,
                                                    }}
                                                >
                                                    <div style={{ width: 120 }} className={styles.schemeReadOnly}>
                                                        Points per Gain
                                                    </div>

                                                    <input
                                                        className={styles.input}
                                                        type="number"
                                                        value={b.passing_points_gain_value ?? 0}
                                                        onChange={(e) => {
                                                            const v = Number(e.target.value || 0);
                                                            setBreakdowns((prev) =>
                                                                prev.map((br) =>
                                                                    br.type === b.type
                                                                        ? { ...br, passing_points_gain_value: v }
                                                                        : br
                                                                )
                                                            );
                                                        }}
                                                        style={{ width: 140 }}
                                                    />
                                                </div>

                                                {/* ROW: LOSS */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                        marginBottom: 10,
                                                    }}
                                                >
                                                    <div style={{ width: 120 }} className={styles.schemeReadOnly}>
                                                        Points per Loss
                                                    </div>

                                                    <input
                                                        className={styles.input}
                                                        type="number"
                                                        value={b.passing_points_lost_value ?? 0}
                                                        onChange={(e) => {
                                                            const v = Number(e.target.value || 0);
                                                            setBreakdowns((prev) =>
                                                                prev.map((br) =>
                                                                    br.type === b.type
                                                                        ? { ...br, passing_points_lost_value: v }
                                                                        : br
                                                                )
                                                            );
                                                        }}
                                                        style={{ width: 140 }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className={styles.schemeRight}>
                                <h2 className={styles.subheading}>
                                    {type === "points"
                                        ? "Position Points"
                                        : "Payout By Position"}
                                </h2>

                                <div className={custStyles.tableWrap}>
                                    <table className={custStyles.table}>
                                        <thead>
                                            <tr>
                                                <th>Finish Position</th>
                                                <th>Value</th>
                                                <th></th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {b.lines.length === 0 ? (
                                                <tr>
                                                    <td className={custStyles.empty} colSpan={3}>
                                                        No positions added yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                b.lines.map((line, index) => (
                                                    <tr key={line.client_id}>
                                                        <td className={styles.schemeReadOnly}>
                                                            {normalizedStartPosition(index, b.lines.length)}
                                                        </td>
                                                        <td>
                                                            {isPoints ? (
                                                                <input
                                                                    className={styles.input}
                                                                    type="number"
                                                                    ref={(el) => setValueRef(b.type, index, el)}
                                                                    value={line.value}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        updateLine(b.type, index, "value", v === "" ? "" : Number(v));
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        const isLastRow = index === b.lines.length - 1;
                                                                        if (isLastRow && e.key === "Tab" && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            addLine(b.type, b.lines.length);
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className={styles.currencyField}>
                                                                    <span className={styles.currencySymbol}>$</span>
                                                                    <input
                                                                        className={`${styles.input} ${styles.currencyInput}`}
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        ref={(el) => setValueRef(b.type, index, el)}
                                                                        value={line.value}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value;
                                                                            updateLine(b.type, index, "value", v === "" ? "" : Number(v));
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            const isLastRow = index === b.lines.length - 1;
                                                                            if (isLastRow && e.key === "Tab" && !e.shiftKey) {
                                                                                e.preventDefault();
                                                                                addLine(b.type, b.lines.length);
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className={custStyles.right}>
                                                            <button
                                                                type="button"
                                                                tabIndex={-1}
                                                                className={orderStyles.removeButton}
                                                                onClick={() => removeLine(b.type, index)}
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

                                <div className={styles.buttonGroup}>
                                    <button type="button" className={styles.button} onClick={() => addLine(b.type)}>
                                        + Add Position
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className={styles.buttonGroup}>
                <button
                    ref={saveBtnRef}
                    type="button"
                    className={styles.button}
                    onClick={handleSave}
                >
                    Save Scheme
                </button>
            </div>
        </>
    );
}