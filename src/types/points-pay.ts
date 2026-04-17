import { SchemeBreakdownType } from "./schemes";

export type CalculationBasics = {
    event_id: string;
    class_id: string;
    points_scheme_id: string | null;
    pay_scheme_id: string | null;
};

export type DisplayRowBasics = {
    class_name?: string;
    car_number: string;
    registration_car_number: string;
    primary_driver_name: string;
    co_driver_name: string | null;
};

export type CalculatedRaceAwardRow = CalculationBasics & {
    id: string;
    race_id: string;
    result_id: string;
    entry_id: string;
    breakdown_type: SchemeBreakdownType;
    finish_position: number | null;
    transferred: boolean;
    base_points: number;
    show_up_points: number;
    passing_points: number;
    add_points_awarded: number;
    manual_points_adj: number;
    awarded_points: number;
    base_pay: number;
    show_up_pay: number;
    manual_pay_adj: number;
    awarded_pay: number;
    points_blocked: boolean;
    pay_blocked: boolean;
    pay_to_other: boolean;
    pay_to_name: string | null;
    calculated_at?: string;
};

export type CalculatedEventTotalRow = CalculationBasics & {
    id: string;
    entry_id: string;
    total_points: number;
    total_pay: number;
    base_show_up_points: number;
    base_show_up_pay: number;
    manual_show_up_points_adj?: number | null;
    manual_show_up_pay_adj?: number | null;
    calculated_at?: string;
};

export type CalculatedRaceAwardDisplayRow = CalculatedRaceAwardRow & DisplayRowBasics & {
    co_driver_drove: boolean;
    race_name?: string | null;
    race_num?: number | null;
    race_order_index?: number | null;
    race_group_type?: string | null;
    race_group_order_index?: number | null;
};

export type CalculatedEventTotalDisplayRow = CalculatedEventTotalRow & DisplayRowBasics & {
    points_blocked: boolean;
    pay_blocked: boolean;
    pay_to_other: boolean;
    pay_to_name: string | null;
    co_driver_drove: boolean;
};

export type PointsPayCalculationResponse = CalculationBasics & {
    success: boolean;
    awards: CalculatedRaceAwardDisplayRow[];
    totals: CalculatedEventTotalDisplayRow[];
};

/* SEASON STANDINGS */
export type StandingRow = {
    id?: string;
    season_id: string;
    class_id: string;
    season_class_car_id: string;
    class_name: string;
    car_number: string;
    registration_car_number: string;
    primary_driver_name: string;
    co_driver_name: string | null;
    total_points: number;
    total_pay: number;
    events_count: number;
    updated_at?: string;
};

export type DriverHistoryRaceRow = {
    award_id: string;
    race_id: string;
    race_name: string | null;
    race_num: number | null;
    race_order_index: number | null;
    race_group_type: string | null;
    race_group_order_index: number | null;
    breakdown_type: string | null;
    finish_position: number | null;
    transferred: boolean;
    base_points: number;
    show_up_points: number;
    passing_points: number;
    add_points_awarded: number;
    manual_points_adj: number;
    awarded_points: number;
    base_pay: number;
    show_up_pay: number;
    manual_pay_adj: number;
    awarded_pay: number;
    points_blocked: boolean;
    pay_blocked: boolean;
};

export type DriverHistoryEventRow = {
    event_id: string;
    event_date: string;
    event_name: string;
    event_status: string;
    total_points: number;
    total_pay: number;
    base_show_up_points: number;
    base_show_up_pay: number;
    manual_show_up_points_adj: number;
    manual_show_up_pay_adj: number;
    races: DriverHistoryRaceRow[];
};

export type DriverHistoryResponse = {
    season_id: string;
    season_class_car_id: string;
    summary: {
        season_class_car_id: string;
        class_id: string;
        class_name: string;
        registration_car_number: string;
        car_number: string;
        primary_driver_name: string;
        co_driver_name: string | null;
        co_driver_drove: boolean;
    } | null;
    events: DriverHistoryEventRow[];
};