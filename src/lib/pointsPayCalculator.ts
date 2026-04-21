import { RaceGroupType, ResultWithDetails, SchemeBreakdownRow, SchemeBreakdownType, SchemeLine, SchemeWithBreakdowns } from "@/types";

// ensure system understands that feature_ and _feature are meant to be the same thing
export function mapRaceGroupTypeToBreakdownType(
    groupType: RaceGroupType
): SchemeBreakdownType {
    switch (groupType) {
        case "qualifying":
            return "qualifying";
        case "heat":
            return "heat";
        case "feature_d":
            return "d_feature";
        case "feature_c":
            return "c_feature";
        case "feature_b":
            return "b_feature";
        case "feature_a":
            return "a_feature";
    }
}

function isFeatureBreakdownType(type: SchemeBreakdownType): boolean {
    return (
        type === "a_feature" ||
        type === "b_feature" ||
        type === "c_feature" ||
        type === "d_feature"
    );
}

function getFeatureRank(type: SchemeBreakdownType): number | null {
    switch (type) {
        case "a_feature":
            return 0;
        case "b_feature":
            return 1;
        case "c_feature":
            return 2;
        case "d_feature":
            return 3;
        default:
            return null;
    }
}

function countsTowardAwardPos(
    result: Pick<ResultWithDetails, "transferred" | "dns" | "finish_position" | "no_points" | "no_pay">,
    awardType: "points" | "pay",
    excludeTransferred: boolean
): boolean {
    if (result.dns || result.finish_position == null) return false;
    if (excludeTransferred && result.transferred) return false;
    if (awardType === "points" && result.no_points) return false;
    if (awardType === "pay" && result.no_pay) return false;
    return true;
}

function rowCountsTowardContinuousFeatPoints(
    row: ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_id: string;
        race_order_index: number;
        race_num: number;
    },
    pointsScheme: SchemeWithBreakdowns | null
): boolean {
    const rowBreakdownType = mapRaceGroupTypeToBreakdownType(row.race_group_type);
    const rowExcludeTransferred = shouldExcludeTransferred({
        result: row,
        scheme: pointsScheme,
        sourceBreakdownType: rowBreakdownType,
    });

    return countsTowardAwardPos(row, "points", rowExcludeTransferred);
}

function getEffectiveAwardPos(args: {
    result: ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_id: string;
        race_order_index: number;
        race_num: number;
    };
    allResults: Array<ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_id: string;
        race_order_index: number;
        race_num: number;
    }>;
    awardType: "points" | "pay";
    excludeTransferred: boolean;
}): number | null {
    const { result, allResults, awardType, excludeTransferred } = args;

    if (!countsTowardAwardPos(result, awardType, excludeTransferred)) return null;

    const carsAhead = allResults.filter((row) => {
        if (row.race_id !== result.race_id) return false;
        if (!countsTowardAwardPos(row, awardType, excludeTransferred)) return false;
        return (row.finish_position ?? 0) < (result.finish_position ?? 0);
    }).length;

    return carsAhead + 1;
}

function getEffectiveLadderPos(args: {
    result: ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_id: string;
        race_order_index: number;
        race_num: number;
    };
    allResults: Array<ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_id: string;
        race_order_index: number;
        race_num: number;
    }>;
    mode: "continuous_feature_points" | "same_race_pay";
    awardType: "points" | "pay",
    excludeTransferred: boolean;
    pointsScheme?: SchemeWithBreakdowns | null;
}): number | null {
    const currentCounts =
        args.mode === "continuous_feature_points"
            ? rowCountsTowardContinuousFeatPoints(args.result, args.pointsScheme ?? null)
            : countsTowardAwardPos(args.result, args.awardType, args.excludeTransferred);

    if (!currentCounts) return null;

    const currentType = mapRaceGroupTypeToBreakdownType(args.result.race_group_type);
    const currentRank = getFeatureRank(currentType);

    const carsAhead = args.allResults.filter((row) => {
        const rowCounts = args.mode === "continuous_feature_points"
            ? rowCountsTowardContinuousFeatPoints(row, args.pointsScheme ?? null)
            : countsTowardAwardPos(row, args.awardType, args.excludeTransferred);

        if (!rowCounts) return false;

        const rowType = mapRaceGroupTypeToBreakdownType(row.race_group_type);
        const rowRank = getFeatureRank(rowType);

        if (args.mode === "same_race_pay") {
            return (
                row.race_id === args.result.race_id &&
                rowType === currentType &&
                (row.finish_position ?? 0) < (args.result.finish_position ?? 0)
            );
        }

        if (args.mode === "continuous_feature_points") {
            if (currentRank == null || rowRank == null) return false;

            if (rowRank < currentRank) return true;

            if (rowRank === currentRank) {
                if (row.race_id === args.result.race_id) {
                    return (row.finish_position ?? 0) < (args.result.finish_position ?? 0);
                }

                if (row.race_order_index !== args.result.race_order_index) {
                    return row.race_order_index < args.result.race_order_index;
                }

                return row.race_num < args.result.race_num;
            }
        }

        return false;
    }).length;

    return carsAhead + 1;
}

// SQL may return numeric values as strings and we need reliable math; it prevents "5" + "10" turning into string garbage instead of real 15
export function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

//  transfer_exclusion_races may come back from DB either as an array OR as JSON string - we need real string for calculations
export function getTransferExclusionRaces(
    breakdown: SchemeBreakdownRow
): string[] {
    if (Array.isArray(breakdown.transfer_exclusion_races)) {
        return breakdown.transfer_exclusion_races;
    }

    if (typeof breakdown.transfer_exclusion_races === "string") {
        try {
            const parsed = JSON.parse(breakdown.transfer_exclusion_races);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

// result_modifiers is stored as JSON; DB may return as object OR JSON string
export function getResultModifiers(breakdown: SchemeBreakdownRow) {
    if (typeof breakdown.result_modifiers === "string") {
        return JSON.parse(breakdown.result_modifiers) as SchemeBreakdownRow["result_modifiers"];
    }

    return breakdown.result_modifiers;
}

// scheme contains multiple breakdowns, but for any one saved result we only want the single breakdown that matches that race's type
export function getBreakdownForRaceType(
    scheme: SchemeWithBreakdowns | null,
    raceGroupType: RaceGroupType
) {
    if (!scheme) return undefined;

    const breakdownType = mapRaceGroupTypeToBreakdownType(raceGroupType);
    return scheme.breakdowns.find((b) => b.type === breakdownType);
}

// each scheme breakdown pays/awards by position using lines; this finds the matching line and returns its value
export function getLineValue(
    lines: SchemeLine[] | undefined,
    finishPosition: number | null
): number {
    if (!lines?.length || finishPosition == null) return 0;

    const match = lines.find((line) => {
        const start = line.start_position;
        const end = line.end_position ?? Number.POSITIVE_INFINITY;
        return finishPosition >= start && finishPosition <= end;
    });

    return match ? toNumber(match.value) : 0;
}

// scheme can define different behavior for dnf/dns/dq/bf; calculator must pick correct modifier rule before calculations
export function getResultFlag(
    result: Pick<ResultWithDetails, "dns" | "dnf" | "dq" | "bf">,
    breakdown: SchemeBreakdownRow
) {
    const modifiers = getResultModifiers(breakdown);

    if (result.dq) return modifiers.dq;
    if (result.dns) return modifiers.dns;
    if (result.dnf) return modifiers.dnf;
    if (result.bf) return modifiers.bf;

    return { mode: "full" as const };
}

// once we know the modifier flag/rule, we need to apply it to the raw line value
export function applyResultModifier(
    value: number,
    modifier: { mode: "full" | "none" | "custom"; custom_value?: number }
): number {
    if (modifier.mode === "none") return 0;
    if (modifier.mode === "custom") return toNumber(modifier.custom_value);
    return value;
}

// transferred cars may be excluded from earning the normal positional award
function breakdownHasTransferExclEnabled(
    breakdown: SchemeWithBreakdowns["breakdowns"][number]
): boolean {
    const row = breakdown as SchemeBreakdownRow;
    return Boolean(row.transfer_exclusions_enabled);
}

function getTransferExclTargetBreakdownTypes(
    scheme: SchemeWithBreakdowns | null,
    sourceBreakdownType: SchemeBreakdownType
): SchemeBreakdownType[] {
    if (!scheme) return [];

    return scheme.breakdowns.filter((breakdown) => {
        const row = breakdown as SchemeBreakdownRow;

        if (!breakdownHasTransferExclEnabled(breakdown)) return false;

        const races = getTransferExclusionRaces(row);
        return races.includes(sourceBreakdownType);
    })
        .map((breakdown) => breakdown.type);
}

export function shouldExcludeTransferred(args: {
    result: Pick<ResultWithDetails, "transferred">,
    scheme: SchemeWithBreakdowns | null,
    sourceBreakdownType: SchemeBreakdownType
}): boolean {
    const { result, scheme, sourceBreakdownType } = args;

    if (!result.transferred) return false;

    const matchedTargets = getTransferExclTargetBreakdownTypes(scheme, sourceBreakdownType);

    return matchedTargets.length > 0;
}

// combines: race type > breakdown lookup, line lookup, result mods, transfer excl, show-up points, no_points / no_pay : into one calculation object
export function calcResultAward(args: {
    result: ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_id: string;
        race_order_index: number;
        race_num: number;
    };
    allResults: Array<ResultWithDetails & {
        race_group_type: RaceGroupType;
        race_id: string;
        race_order_index: number;
        race_num: number;
    }
    >;
    pointsScheme: SchemeWithBreakdowns | null;
    payScheme: SchemeWithBreakdowns | null;
}) {
    const { result, allResults, pointsScheme, payScheme } = args;

    const breakdownType = mapRaceGroupTypeToBreakdownType(result.race_group_type);
    const pointsBreakdown = getBreakdownForRaceType(pointsScheme, result.race_group_type);
    const payBreakdown = getBreakdownForRaceType(payScheme, result.race_group_type);

    const pointsModifier = pointsBreakdown ? getResultFlag(result, pointsBreakdown) : { mode: "full" as const };
    const payModifier = payBreakdown ? getResultFlag(result, payBreakdown) : { mode: "full" as const };

    const excludeTransferPoints = shouldExcludeTransferred({ result, scheme: pointsScheme, sourceBreakdownType: breakdownType });
    const excludeTransferPay = shouldExcludeTransferred({ result, scheme: pointsScheme, sourceBreakdownType: breakdownType });

    const pointsAwardPos = pointsBreakdown ? getEffectiveAwardPos({
        result, allResults, awardType: "points", excludeTransferred: excludeTransferPoints,
    }) : null;

    const payAwardPos = payBreakdown ? getEffectiveAwardPos({
        result, allResults, awardType: "pay", excludeTransferred: excludeTransferPay,
    }) : null;

    let rawBasePoints = pointsBreakdown ? getLineValue(pointsBreakdown.lines, pointsAwardPos) : 0;
    let rawBasePay = payBreakdown ? getLineValue(payBreakdown.lines, payAwardPos) : 0;

    if (pointsScheme && pointsScheme.continuous_feature_points && isFeatureBreakdownType(breakdownType)) {
        const aFeatBreakdown = pointsScheme.breakdowns.find((b) => b.type === "a_feature");

        if (aFeatBreakdown) {
            const ladderPosition = getEffectiveLadderPos({
                result,
                allResults,
                mode: "continuous_feature_points",
                awardType: "points",
                excludeTransferred: excludeTransferPoints,
                pointsScheme,
            });

            rawBasePoints = ladderPosition == null ? 0 : getLineValue(aFeatBreakdown.lines, ladderPosition);
        }
    }

    const base_points = excludeTransferPoints ? 0 : applyResultModifier(rawBasePoints, pointsModifier);

    if (payBreakdown && isFeatureBreakdownType(breakdownType)) {
        const ladderPosition = getEffectiveLadderPos({
            result,
            allResults,
            mode: "same_race_pay",
            awardType: "pay",
            excludeTransferred: excludeTransferPay,
        });

        rawBasePay = ladderPosition == null ? 0 : getLineValue(payBreakdown.lines, ladderPosition);
    }

    let base_pay = excludeTransferPay ? 0 : applyResultModifier(rawBasePay, payModifier);

    // This exists because your scheme has a pay_show_b_main flag.
    // If that flag is false, B-main/B-feature pay must be zeroed out
    // even if the breakdown lines contain values.
    if (payScheme && !payScheme.pay_show_b_main && breakdownType === "b_feature") base_pay = 0;

    // show-up points and pay are event-level, not per race
    const show_up_points = 0;
    const show_up_pay = 0;

    // placeholder because currently starting position is not factored in (would become relevant if we added LINEUPS to the app)
    const passing_points = 0;

    // specialty points
    const add_points_awarded =
        pointsScheme?.type === "points" &&
        pointsScheme.add_points_enabled &&
        breakdownType === "a_feature"
            ? toNumber(result.add_points_value)
            : 0;

    // extra point for heat winner for Bump To Pass
    const heat_win_bonus_points =
        pointsScheme?.type === "points" &&
        breakdownType === "heat" &&
        result.finish_position === 1 &&
        result.class_name?.toLowerCase().includes("bump to pass")
            ? 1 : 0;

    // event_entries can block points/pay independently of whatever the scheme says
    const points_blocked = result.no_points;
    const pay_blocked = result.no_pay;

    const awarded_points = points_blocked ? 0 : base_points + show_up_points + passing_points + add_points_awarded + heat_win_bonus_points;
    const awarded_pay = pay_blocked ? 0 : base_pay + show_up_pay;

    return {
        breakdown_type: breakdownType,
        finish_position: result.finish_position,
        transferred: result.transferred,

        base_points,
        show_up_points,
        passing_points,
        add_points_awarded,
        heat_win_bonus_points,
        awarded_points,

        base_pay,
        show_up_pay,
        awarded_pay,

        points_blocked,
        pay_blocked,
        pay_to_other: result.pay_to_other,
        pay_to_name: result.pay_to_name,
    };
}

// if entered into the event, all cars with a points scheme assigning show-up points will earn 1 point for entry
export function getShowUpPointsForEntry(args: {
    entry_id: string;
    entered_entry_ids?: string[];
    pointsScheme?: SchemeWithBreakdowns | null;
    points_blocked_by_entry_id?: Record<string, boolean>;
}) {
    const {
        entry_id,
        entered_entry_ids = [],
        pointsScheme,
        points_blocked_by_entry_id = {},
    } = args;

    if (!pointsScheme?.show_up_points_enabled) return 0;

    const isEntered = entered_entry_ids.includes(entry_id);
    if (!isEntered) return 0;

    if (points_blocked_by_entry_id[entry_id]) return 0;

    return toNumber(pointsScheme.show_up_non_start_points);
}

// route will calculate one award row per race result but totals table needs one row per entry for the whole event/class; groups all calc race awards by entry_id and sums points/pay
export function calcEventTotals(
    awards: Array<{
        entry_id: string;
        awarded_points: number;
        awarded_pay: number;
    }>
) {
    const totalsMap = new Map<
        string,
        { entry_id: string; total_points: number; total_pay: number }
    >();

    for (const award of awards) {
        const existing = totalsMap.get(award.entry_id);

        if (existing) {
            existing.total_points += award.awarded_points;
            existing.total_pay += award.awarded_pay;
            continue;
        }

        totalsMap.set(award.entry_id, {
            entry_id: award.entry_id,
            total_points: award.awarded_points,
            total_pay: award.awarded_pay,
        });
    }

    return Array.from(totalsMap.values());
}