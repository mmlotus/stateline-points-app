"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Class, EventClassWithClassName, EventRow, PointsPayCalculationResponse, Scheme } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatDate } from "@/components/Formatter";
import { BanknoteX, CircleGauge, FlagOff, Save } from "lucide-react";

export default function PointsPayDetailPage() {
    const router = useRouter();
    const params = useParams<{ seasonId: string; id: string }>();
    const searchParams = useSearchParams();
    const classIdFromUrl = searchParams.get("class_id") || "";

    const eventId = params.id;
    const seasonId = params.seasonId;

    const [eventData, setEventData] = useState<EventRow | null>(null);
    const [eventClasses, setEventClasses] = useState<EventClassWithClassName[]>([]);
    const [allClasses, setAllClasses] = useState<Class[]>([]);
    const [availSchemes, setAvailSchemes] = useState<Scheme[]>([]);

    const [selectedEventClassId, setSelectedEventClassId] = useState("");
    const [selectedPtsScheme, setSelectedPtsScheme] = useState("");
    const [selectedPayScheme, setSelectedPayScheme] = useState("");

    const [manualAdjustPoints, setManualAdjustPoints] = useState<Record<string, string>>({});
    const [manualAdjustPay, setManualAdjustPay] = useState<Record<string, string>>({});
    const [manualShowUpPoints, setManualShowUpPoints] = useState<Record<string, string>>({});
    const [manualShowUpPay, setManualShowUpPay] = useState<Record<string, string>>({});

    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [clearing, setClearing] = useState(false);

    const [calcResult, setCalcResult] = useState<PointsPayCalculationResponse | null>(null);

    const activeClassName = eventClasses.find((c) => c.class_id === selectedEventClassId)?.class_name || "Class";
    const selectedClass = allClasses.find((c) => c.id === selectedEventClassId) || null;

    const [savingAdj, setSavingAdj] = useState(false);
    const [showFloatingSave, setShowFloatingSave] = useState(false);
    const saveBtnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const el = saveBtnRef.current;
        if (!el) return;

        const obs = new IntersectionObserver(
            ([entry]) => {
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

    useEffect(() => {
        async function loadPage() {
            try {
                const [eventRes, eventClassesRes, schemesRes, classesRes] = await Promise.all([
                    fetch(`/api/events/${eventId}`, { cache: "no-store" }),
                    fetch(`/api/event-classes?event_id=${eventId}`, { cache: "no-store" }),
                    fetch(`/api/schemes/`, { cache: "no-store" }),
                    fetch(`/api/classes`, { cache: "no-store" }),
                ]);

                const eventJson = await eventRes.json();
                const eventClassesJson = await eventClassesRes.json();
                const schemesJson = await schemesRes.json();
                const classesJson = await classesRes.json();

                if (!eventRes.ok) {
                    toast.error(eventJson?.error || "Failed to load event.");
                    router.back();
                    return;
                }

                if (!eventClassesRes.ok) {
                    toast.error(eventClassesJson?.error || "Failed to load event classes.");
                    router.back();
                    return;
                }

                if (!schemesRes.ok) {
                    toast.error(schemesJson?.error || "Failed to load available schemes.");
                    router.back();
                    return;
                }

                if (!classesRes.ok) {
                    toast.error(classesJson?.error || "Failed to load all classes.");
                    router.back();
                    return;
                }

                setEventData(eventJson);
                setEventClasses(eventClassesJson);
                setAvailSchemes(schemesJson);
                setAllClasses(classesJson);

                if (eventClassesJson.length > 0) {
                    const matchedClass = classIdFromUrl
                        ? eventClassesJson.find((c: EventClassWithClassName) => c.class_id === classIdFromUrl)
                        : null;

                    setSelectedEventClassId(
                        matchedClass?.class_id || eventClassesJson[0].class_id
                    );
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load points/pay page.");
                router.back();
            } finally {
                setLoading(false);
            }
        }

        if (eventId) loadPage();
    }, [eventId, router, classIdFromUrl]);

    useEffect(() => {
        async function loadSavedCalculations() {
            if (!eventId || !selectedEventClassId) return;

            setCalcResult(null);

            try {
                const res = await fetch(
                    `/api/points-pay/event/${eventId}?class_id=${selectedEventClassId}`,
                    { cache: "no-store" }
                );

                const data: PointsPayCalculationResponse = await res.json();

                if (!res.ok) {
                    throw new Error("Failed to load saved points/pay.");
                }

                setCalcResult(data);
                setSelectedPtsScheme(data.points_scheme_id ?? selectedClass?.default_points_scheme_id ?? "");
                setSelectedPayScheme(data.pay_scheme_id ?? selectedClass?.default_pay_scheme_id ?? "");
            } catch (error) {
                console.error(error);
                toast.error("Failed to load saved points/payouts.");
            }
        }

        if (selectedEventClassId) {
            loadSavedCalculations();
        }
    }, [eventId, selectedEventClassId, selectedClass]);

    useEffect(() => {
        if (!calcResult) {
            setManualAdjustPoints({});
            setManualAdjustPay({});
            setManualShowUpPoints({});
            setManualShowUpPay({});
            return;
        }

        const nextPoints: Record<string, string> = {};
        const nextPay: Record<string, string> = {};
        const nextShowUpPoints: Record<string, string> = {};
        const nextShowUpPay: Record<string, string> = {};

        for (const award of calcResult.awards) {
            nextPoints[award.id] = String(award.manual_points_adj ?? 0);
            nextPay[award.id] = String(award.manual_pay_adj ?? 0);
        }

        for (const total of calcResult.totals) {
            nextShowUpPoints[total.entry_id] = String(total.manual_show_up_points_adj ?? 0);
            nextShowUpPay[total.entry_id] = String(total.manual_show_up_pay_adj ?? 0);
        }

        setManualAdjustPoints(nextPoints);
        setManualAdjustPay(nextPay);
        setManualShowUpPoints(nextShowUpPoints);
        setManualShowUpPay(nextShowUpPay);
    }, [calcResult]);

    const pointsSchemes = useMemo(() => availSchemes.filter((s) => s.type === "points"), [availSchemes]);
    const paySchemes = useMemo(() => availSchemes.filter((s) => s.type === "pay"), [availSchemes]);

    async function handleCalculate() {
        if (!selectedPtsScheme || !selectedPayScheme) {
            toast.error("Please select a points & a pay scheme before calculating.");
            return;
        }

        setCalculating(true);

        try {
            const res = await fetch("/api/points-pay/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: eventId,
                    class_id: selectedEventClassId,
                    points_scheme_id: selectedPtsScheme || null,
                    pay_scheme_id: selectedPayScheme || null,
                }),
            });

            const data: PointsPayCalculationResponse = await res.json();

            if (!res.ok) {
                throw new Error("Failed to calculate points/pay.");
            }

            setCalcResult(data);
            toast.success("Points/Pay calculated!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to calculate points/pay.");
        } finally {
            setCalculating(false);
        }
    }

    async function handleSaveAdj() {
        if (!calcResult?.awards?.length && !calcResult?.totals?.length) {
            toast.error("No calculated awards to update.");
            return;
        }

        setSavingAdj(true);

        try {
            const adjustments = calcResult.awards.map((award) => ({
                award_id: award.id,
                manual_points_adj: Number(manualAdjustPoints[award.id] ?? 0),
                manual_pay_adj: Number(manualAdjustPay[award.id] ?? 0),
            }));

            const show_up_adjustments = (calcResult.totals ?? []).map((entry) => ({
                entry_id: entry.entry_id,
                manual_show_up_points_adj: Number(manualShowUpPoints[entry.entry_id] ?? 0),
                manual_show_up_pay_adj: Number(manualShowUpPay[entry.entry_id] ?? 0),
            }));

            const res = await fetch(`/api/points-pay/calculate`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: eventId,
                    class_id: selectedEventClassId,
                    adjustments,
                    show_up_adjustments,
                }),
            });

            const data: PointsPayCalculationResponse = await res.json();

            if (!res.ok) {
                throw new Error(data?.success ? "" : "Failed to save manual adjustments.");
            }

            setCalcResult(data);
            toast.success("Manual adjustments saved!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save manual adjustments.");
        } finally {
            setSavingAdj(false);
        }
    }

    async function handleClearAssignments() {
        if (!selectedEventClassId) {
            toast.error("No class selected.");
            return;
        }

        const confirmed = window.confirm(
            `Delete all saved points/pay assignments for ${activeClassName}?`
        );

        if (!confirmed) return;

        setClearing(true);

        try {
            const res = await fetch(`/api/points-pay/event/${eventId}?class_id=${selectedEventClassId}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Failed to clear assignments.");
            }

            setCalcResult({
                success: true,
                event_id: eventId,
                class_id: selectedEventClassId,
                points_scheme_id: selectedPtsScheme || null,
                pay_scheme_id: selectedPayScheme || null,
                awards: [],
                totals: [],
            });

            setManualAdjustPoints({});
            setManualAdjustPay({});
            setManualShowUpPoints({});
            setManualShowUpPay({});
            toast.success("Assignments cleared!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to clear assignments.");
        } finally {
            setClearing(false);
        }
    }

    const awardsByRace = useMemo(() => {
        if (!calcResult?.awards?.length) return [];

        const raceMap = new Map<
            string,
            {
                race_id: string;
                race_name?: string | null;
                breakdown_type: string;
                rows: typeof calcResult.awards;
                firstSeenIndex: number;
            }
        >();

        calcResult.awards.forEach((award, index) => {
            const existing = raceMap.get(award.race_id);

            if (existing) {
                existing.rows.push(award);
                return;
            }

            raceMap.set(award.race_id, {
                race_id: award.race_id,
                race_name: award.race_name ?? null,
                breakdown_type: award.breakdown_type,
                rows: [award],
                firstSeenIndex: index,
            });
        });

        const breakdownOrder: Record<string, number> = {
            a_feature: 0,
            b_feature: 1,
            c_feature: 2,
            d_feature: 3,
            heat: 4,
            qualifying: 5,
        };

        function getHeatRank(raceName?: string | null) {
            const match = (raceName ?? "").match(/^([A-Z]) Heat$/i);
            if (!match) return null;
            return match[1].toUpperCase().charCodeAt(0);
        }

        return Array.from(raceMap.values()).sort((a, b) => {
            const aRank = breakdownOrder[a.breakdown_type] ?? 999;
            const bRank = breakdownOrder[b.breakdown_type] ?? 999;

            if (aRank !== bRank) {
                return aRank - bRank;
            }

            if (a.breakdown_type === "heat" && b.breakdown_type === "heat") {
                const aHeatRank = getHeatRank(a.race_name);
                const bHeatRank = getHeatRank(b.race_name);

                if (aHeatRank !== null && bHeatRank !== null && aHeatRank !== bHeatRank) {
                    return bHeatRank - aHeatRank;
                }
            }

            return a.firstSeenIndex - b.firstSeenIndex;
        });
    }, [calcResult]);

    if (loading) return <LoadingSpinner />;

    return (
        <>
            {showFloatingSave && (
                <button
                    type="button"
                    className={styles.floatingSave}
                    onClick={handleSaveAdj}
                    aria-label="Save changes"
                    title="Save changes"
                    disabled={savingAdj || loading}
                >
                    <Save size={18} />
                </button>
            )}
            <div className={custStyles.wrap}>
                <div className={custStyles.header}>
                    <h1 className={styles.heading}>Assign Points & Pay</h1>
                    {eventData && (
                        <div className={styles.muted}>
                            {eventData.name} - {formatDate(eventData.event_date)}
                        </div>
                    )}

                    <div className={custStyles.tools}>
                        <button
                            className={styles.buttonSecondary}
                            onClick={() => router.push("/season")}
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
                            onClick={() => router.push(`/season/${seasonId}/events/${eventId}/results`)}
                        >
                            Results
                        </button>
                    </div>
                </div>

                {eventClasses.length ? (
                    <>
                        <div className={styles.topRow}>
                            <div className={styles.topHalf}>
                                <h2 className={styles.subheading}>Classes</h2>
                                <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                                    {eventClasses.map((cls) => (
                                        <button
                                            key={cls.class_id}
                                            className={
                                                cls.class_id === selectedEventClassId
                                                    ? styles.button
                                                    : styles.buttonSecondary
                                            }
                                            onClick={() => setSelectedEventClassId(cls.class_id)}
                                        >
                                            {cls.class_sponsor ? `${cls.class_sponsor} ${cls.class_name}` : cls.class_name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.separator} />

                            <div className={styles.topHalf}>
                                <h2 className={styles.subheading}>Assign to {activeClassName}</h2>

                                {loading ? (
                                    <p className={styles.muted}>Gearing up...</p>
                                ) : (
                                    <div className={custStyles.tools} style={{ gap: 8, flexWrap: "wrap" }}>
                                        <div>
                                            <label className={styles.label}>Points Scheme</label>
                                            <select
                                                className={styles.input}
                                                value={selectedPtsScheme}
                                                onChange={(e) => setSelectedPtsScheme(e.target.value)}
                                                disabled={!pointsSchemes.length || loading}
                                            >
                                                {!pointsSchemes.length ? (
                                                    <option value="">No available points schemes to apply</option>
                                                ) : (
                                                    pointsSchemes.map((option) => (
                                                        <option key={option.id} value={option.id}>
                                                            {option.name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={styles.label}>Pay Scheme</label>
                                            <select
                                                className={styles.input}
                                                value={selectedPayScheme}
                                                onChange={(e) => setSelectedPayScheme(e.target.value)}
                                                disabled={!paySchemes.length || loading}
                                            >
                                                {!paySchemes.length ? (
                                                    <option value="">No available pay schemes to apply</option>
                                                ) : (
                                                    paySchemes.map((option) => (
                                                        <option key={option.id} value={option.id}>
                                                            {option.name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        <div className={custStyles.tools} style={{ gap: 8 }}>
                                            <button
                                                className={styles.button}
                                                onClick={() => handleCalculate()}
                                                disabled={calculating}
                                            >
                                                {calculating ? "Full send..." : "Assign Schemes"}
                                            </button>

                                            <button
                                                className={styles.buttonSecondary}
                                                onClick={() => handleSaveAdj()}
                                                disabled={savingAdj || (!calcResult?.awards?.length && !calcResult?.totals?.length)}
                                            >
                                                {savingAdj ? "Green flag..." : "Save Changes"}
                                            </button>

                                            <button
                                                className={styles.buttonSecondary}
                                                onClick={() => handleClearAssignments()}
                                                disabled={calculating}
                                            >
                                                {clearing ? "Reverse..." : "Clear Assignments"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!calcResult?.totals?.length ? (
                            <p className={styles.muted} style={{ marginTop: 50 }}>
                                No points/pay assigned yet!
                            </p>
                        ) : (
                            <>
                                <div className={custStyles.tableWrap} style={{ marginBottom: 75 }}>
                                    <table className={custStyles.table}>
                                        <thead>
                                            <tr>
                                                <th colSpan={7} className={custStyles.favoritesHeader}>EVENT TOTALS</th>
                                            </tr>
                                        </thead>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: "center" }}>Car #</th>
                                                <th style={{ textAlign: "center" }}>Primary Driver</th>
                                                <th style={{ textAlign: "center" }}>Co-Driver</th>
                                                <th style={{ textAlign: "center" }}>Pay to Other?</th>
                                                <th style={{ textAlign: "center" }}>Points</th>
                                                <th style={{ textAlign: "center" }}>Pay</th>
                                                <th style={{ textAlign: "center" }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {calcResult?.totals?.map((entry) => (
                                                <tr key={entry.id}>
                                                    <td style={{ textAlign: "center" }}>{entry.car_number}</td>
                                                    <td style={{ textAlign: "center" }}>{entry.primary_driver_name}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        {entry.co_driver_name ? (
                                                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                                <span>{entry.co_driver_name}</span>
                                                                {entry.co_driver_drove ? <CircleGauge size={10} /> : null}
                                                            </div>
                                                        ) : (
                                                            ""
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: "center" }}>{entry.pay_to_name ? entry.pay_to_name : "-"}</td>
                                                    <td style={{ textAlign: "center" }}>{entry.total_points}</td>
                                                    <td style={{ textAlign: "center" }}>${entry.total_pay}</td>
                                                    <td style={{ textAlign: "center" }}>
                                                        {entry.points_blocked ? <div title="No Points"><FlagOff size={16} /></div> : ""}
                                                        {entry.pay_blocked ? <div title="No Pay"><BanknoteX size={16} /></div> : ""}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {awardsByRace.map((group) => {
                                    const showSpinPointsForThisGroup =
                                        activeClassName.toLowerCase().includes("bump to pass") &&
                                        group.breakdown_type === "a_feature";

                                    return (
                                        <div key={group.race_id} className={custStyles.tableWrap} style={{ marginTop: 20 }}>
                                            <table className={custStyles.table}>
                                                <thead>
                                                    <tr>
                                                        <th colSpan={showSpinPointsForThisGroup ? 12 : 11} className={custStyles.favoritesHeader}>
                                                            {group.race_name || group.breakdown_type}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <thead>
                                                    <tr style={{ background: "#cf920e52" }}>
                                                        <th colSpan={3} style={{ textAlign: "center", background: "#eeeeee" }}>Position</th>
                                                        <th colSpan={3} style={{ textAlign: "center", background: "#eeeeee" }}>Competitor</th>
                                                        <th colSpan={showSpinPointsForThisGroup ? 4 : 3} style={{ textAlign: "center" }}>Points</th>
                                                        <th colSpan={2} style={{ textAlign: "center", background: "#d3ebbf" }}>Pay</th>
                                                    </tr>
                                                    <tr>
                                                        <th style={{ textAlign: "center", background: "#eeeeee" }}>Finish</th>
                                                        <th style={{ textAlign: "center", background: "#eeeeee" }}>Start</th>
                                                        <th style={{ textAlign: "center", background: "#eeeeee" }}></th>
                                                        <th style={{ textAlign: "center", background: "#eeeeee" }}>Car #</th>
                                                        <th style={{ textAlign: "center", background: "#eeeeee" }}>Primary Driver</th>
                                                        <th style={{ textAlign: "center", background: "#eeeeee" }}>Co-Driver</th>
                                                        <th style={{ textAlign: "center" }}>Passing Points</th>
                                                        <th style={{ textAlign: "center" }}>Finish Points</th>
                                                        {showSpinPointsForThisGroup ? (
                                                            <th style={{ textAlign: "center" }}>Spin Points</th>
                                                        ) : null}
                                                        <th style={{ textAlign: "center" }}>Adj</th>
                                                        <th style={{ textAlign: "center", background: "#d3ebbf" }}>Finish Pay</th>
                                                        <th style={{ textAlign: "center", background: "#d3ebbf" }}>Adj</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.rows.map((award) => (
                                                        <tr key={award.id}>
                                                            <td style={{ textAlign: "center" }}>{award.finish_position}</td>
                                                            <td style={{ textAlign: "center" }}>-</td>
                                                            <td style={{ textAlign: "center" }}>
                                                                {award.points_blocked ? <div title="No Points"><FlagOff size={16} /></div> : ""}
                                                                {award.pay_blocked ? <div title="No Pay"><BanknoteX size={16} /></div> : ""}
                                                            </td>
                                                            <td style={{ textAlign: "center" }}>{award.car_number}</td>
                                                            <td style={{ textAlign: "center" }}>{award.primary_driver_name}</td>
                                                            <td style={{ textAlign: "center" }}>
                                                                {award.co_driver_name ? (
                                                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                                        <span>{award.co_driver_name}</span>
                                                                        {award.co_driver_drove ? <CircleGauge size={10} /> : null}
                                                                    </div>
                                                                ) : ("")}
                                                            </td>
                                                            <td style={{ textAlign: "center", background: "#cf920e52" }}>{award.passing_points}</td>
                                                            <td style={{ textAlign: "center", background: "#cf920e52" }}>
                                                                {award.points_blocked ? <s>{award.base_points}</s> : award.base_points}
                                                            </td>
                                                            {showSpinPointsForThisGroup ? (
                                                                <td style={{ textAlign: "center", background: "#cf920e52" }}>
                                                                    {award.points_blocked ? <s>{award.add_points_awarded}</s> : award.add_points_awarded}
                                                                </td>
                                                            ) : null}
                                                            <td style={{ textAlign: "center", background: "#cf920e52" }}>
                                                                <input
                                                                    className={styles.input}
                                                                    style={{
                                                                        minWidth: 72,
                                                                        maxWidth: 100,
                                                                        margin: "0 auto",
                                                                    }}
                                                                    type="number"
                                                                    step="1"
                                                                    value={manualAdjustPoints[award.id] ?? 0}
                                                                    onFocus={() => {
                                                                        const current = Number(manualAdjustPoints[award.id] ?? 0);
                                                                        if (current === 0) {
                                                                            setManualAdjustPoints((prev) => ({
                                                                                ...prev,
                                                                                [award.id]: "",
                                                                            }));
                                                                        }
                                                                    }}
                                                                    onBlur={() => {
                                                                        if ((manualAdjustPoints[award.id] ?? "").trim() === "") {
                                                                            setManualAdjustPoints((prev) => ({
                                                                                ...prev,
                                                                                [award.id]: "0",
                                                                            }));
                                                                        }
                                                                    }}
                                                                    onChange={(e) =>
                                                                        setManualAdjustPoints((prev) => ({
                                                                            ...prev,
                                                                            [award.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                />
                                                            </td>
                                                            <td style={{ textAlign: "center", background: "#d3ebbf" }}>
                                                                {award.pay_blocked ? <s>${award.base_pay}</s> : <>${award.base_pay}</>}
                                                            </td>
                                                            <td style={{ textAlign: "center", background: "#d3ebbf" }}>
                                                                <input
                                                                    className={styles.input}
                                                                    style={{
                                                                        minWidth: 72,
                                                                        maxWidth: 100,
                                                                        margin: "0 auto",
                                                                    }}
                                                                    type="number"
                                                                    step="1"
                                                                    value={manualAdjustPay[award.id] ?? 0}
                                                                    onFocus={() => {
                                                                        const current = Number(manualAdjustPay[award.id] ?? 0);
                                                                        if (current === 0) {
                                                                            setManualAdjustPay((prev) => ({
                                                                                ...prev,
                                                                                [award.id]: "",
                                                                            }));
                                                                        }
                                                                    }}
                                                                    onBlur={() => {
                                                                        if ((manualAdjustPay[award.id] ?? "").trim() === "") {
                                                                            setManualAdjustPay((prev) => ({
                                                                                ...prev,
                                                                                [award.id]: "0",
                                                                            }));
                                                                        }
                                                                    }}
                                                                    onChange={(e) =>
                                                                        setManualAdjustPay((prev) => ({
                                                                            ...prev,
                                                                            [award.id]: e.target.value,
                                                                        }))
                                                                    }
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}

                                {calcResult?.totals?.length ? (
                                    <div className={custStyles.tableWrap} style={{ marginTop: 20 }}>
                                        <table className={custStyles.table}>
                                            <thead>
                                                <tr>
                                                    <th colSpan={8} className={custStyles.favoritesHeader}>
                                                        Show Up
                                                    </th>
                                                </tr>
                                            </thead>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: "center", background: "#eeeeee" }}></th>
                                                    <th style={{ textAlign: "center", background: "#eeeeee" }}>Car #</th>
                                                    <th style={{ textAlign: "center", background: "#eeeeee" }}>Primary Driver</th>
                                                    <th style={{ textAlign: "center", background: "#eeeeee" }}>Co-Driver</th>
                                                    <th style={{ textAlign: "center" }}>Points</th>
                                                    <th style={{ textAlign: "center" }}>Adj</th>
                                                    <th style={{ textAlign: "center", background: "#d3ebbf" }}>Pay</th>
                                                    <th style={{ textAlign: "center", background: "#d3ebbf" }}>Adj</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {calcResult.totals.map((entry) => (
                                                    <tr key={`showup-${entry.id}`}>
                                                        <td style={{ textAlign: "center" }}>
                                                            {entry.points_blocked ? <div title="No Points"><FlagOff size={16} /></div> : ""}
                                                            {entry.pay_blocked ? <div title="No Pay"><BanknoteX size={16} /></div> : ""}
                                                        </td>
                                                        <td style={{ textAlign: "center" }}>{entry.car_number}</td>
                                                        <td style={{ textAlign: "center" }}>{entry.primary_driver_name}</td>
                                                        <td style={{ textAlign: "center" }}>
                                                            {entry.co_driver_name ? (
                                                                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                                    <span>{entry.co_driver_name}</span>
                                                                    {entry.co_driver_drove ? <CircleGauge size={10} /> : null}
                                                                </div>
                                                            ) : (
                                                                ""
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: "center", background: "#cf920e52" }}>
                                                            {entry.points_blocked ? <s>{entry.base_show_up_points}</s> : entry.base_show_up_points}
                                                        </td>
                                                        <td style={{ textAlign: "center", background: "#cf920e52" }}>
                                                            <input
                                                                className={styles.input}
                                                                style={{
                                                                    minWidth: 72,
                                                                    maxWidth: 100,
                                                                    margin: "0 auto",
                                                                }}
                                                                type="number"
                                                                step="1"
                                                                value={manualShowUpPoints[entry.entry_id] ?? 0}
                                                                onFocus={() => {
                                                                    const current = Number(manualShowUpPoints[entry.entry_id] ?? 0);
                                                                    if (current === 0) {
                                                                        setManualShowUpPoints((prev) => ({
                                                                            ...prev,
                                                                            [entry.entry_id]: "",
                                                                        }));
                                                                    }
                                                                }}
                                                                onBlur={() => {
                                                                    if ((manualShowUpPoints[entry.entry_id] ?? "").trim() === "") {
                                                                        setManualShowUpPoints((prev) => ({
                                                                            ...prev,
                                                                            [entry.entry_id]: "0",
                                                                        }));
                                                                    }
                                                                }}
                                                                onChange={(e) =>
                                                                    setManualShowUpPoints((prev) => ({
                                                                        ...prev,
                                                                        [entry.entry_id]: e.target.value,
                                                                    }))
                                                                }
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: "center", background: "#d3ebbf" }}>
                                                            {entry.pay_blocked ? <s>${entry.base_show_up_pay}</s> : <>${entry.base_show_up_pay}</>}
                                                        </td>
                                                        <td style={{ textAlign: "center", background: "#d3ebbf" }}>
                                                            <input
                                                                className={styles.input}
                                                                style={{
                                                                    minWidth: 72,
                                                                    maxWidth: 100,
                                                                    margin: "0 auto",
                                                                }}
                                                                type="number"
                                                                step="1"
                                                                value={manualShowUpPay[entry.entry_id] ?? 0}
                                                                onFocus={() => {
                                                                    const current = Number(manualShowUpPay[entry.entry_id] ?? 0);
                                                                    if (current === 0) {
                                                                        setManualShowUpPay((prev) => ({
                                                                            ...prev,
                                                                            [entry.entry_id]: "",
                                                                        }));
                                                                    }
                                                                }}
                                                                onBlur={() => {
                                                                    if ((manualShowUpPay[entry.entry_id] ?? "").trim() === "") {
                                                                        setManualShowUpPay((prev) => ({
                                                                            ...prev,
                                                                            [entry.entry_id]: "0",
                                                                        }));
                                                                    }
                                                                }}
                                                                onChange={(e) =>
                                                                    setManualShowUpPay((prev) => ({
                                                                        ...prev,
                                                                        [entry.entry_id]: e.target.value,
                                                                    }))
                                                                }
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </>
                ) : (
                    <p>Having trouble loading</p>
                )}
            </div>
        </>
    );
}