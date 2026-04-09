/* SEASON */
export type Season = {
    id: string;
    year: number;
    name: string;
    is_active: boolean;
    created_at: string;
};

export type SeasonCreatePayload = {
    year: string;
    name: string;
};


/* EVENTS */
export const EVENT_STATUS_OPTIONS = [
    "scheduled",
    "completed",
    "rain out",
    "cancelled",
] as const;

export const DEFAULT_STATUS: EventStatus = "scheduled" as const;

export type EventStatus = (typeof EVENT_STATUS_OPTIONS)[number];

export type EventRow = {
    id: string;
    season_id: string;
    event_date: string;
    name: string;
    status: EventStatus;
    notes: string | null;
    class_ids: string[];
    created_at: string;
};

export type EventCreatePayload = Omit<EventRow, "id" | "created_at">;

/* DRIVERS */
export type Driver = {
    id: string;
    name: string;
    default_car?: string;
    is_active: boolean;
    created_at: string;
    tags?: Tag[];
};

export type DriverCreatePayload = {
    name: string;
    default_car?: string;
    is_active: boolean;
    tag_ids?: string[];
    new_tags?: string[];
};

export type DriverUpdatePayload = DriverCreatePayload;


/* SEASON CLASS CARS */
export type SeasonClassCar = {
    id: string;
    season_id: string;
    class_id: string;
    car_number: string;
    primary_driver_id: string;
    co_driver_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type SeasonClassCarWithNames = SeasonClassCar & {
    class_name: string;
    primary_driver_name: string;
    co_driver_name: string | null;
};

export type SeasonClassCarCreatePayload = {
    season_id: string;
    class_id: string;
    car_number: string;
    primary_driver_id: string;
    co_driver_id?: string | null;
    is_active?: boolean;
};

export type SeasonClassCarUpdatePayload = SeasonClassCarCreatePayload & {
    id: string;
    is_active: boolean;
};

export type QuickAddEntryPayload = Omit<
    SeasonClassCarCreatePayload, "season_id" | "primary_driver_id"> & {
        primary_driver_id?: string;
        primary_driver_name?: string;
        override_car_number?: string | null;
    };


/* EVENT CLASSES */
export type EventClass = {
    id: string;
    event_id: string;
    class_id: string;
    created_at: string;
};

export type EventClassWithClassName = EventClass & {
    class_name?: string;
};


/* CLASSES */
export type Class = {
    id: string;
    name: string;
    created_at: string;
};

/* EVENT ENTRIES */
export type EventEntry = {
    id: string;
    event_id: string;
    season_class_car_id: string;
    override_car_number: string | null;
    no_points: boolean;
    no_pay: boolean;
    pay_to_other: boolean;
    pay_to_name: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export type EventEntryWithDetails = EventEntry & {
    season_id: string;
    class_id: string;
    class_name: string;
    registration_car_number: string;
    car_number: string;
    primary_driver_id: string;
    primary_driver_name: string;
    co_driver_id: string | null;
    co_driver_name: string | null;
    is_active: boolean;
};

export type EventEntryCreatePayload = {
    season_class_car_id: string;
    override_car_number?: string | null;
};

export type EventEntryUpdatePayload = {
    no_points?: boolean;
    no_pay?: boolean;
    pay_to_other?: boolean;
    pay_to_name?: string | null;
    notes?: string | null;
};

export type EventEntryOption = SeasonClassCarWithNames & {
    already_entered: boolean;
};

export type UpcomingEntriesEvent = EventRow & {
    class_names: string[];
};


/* RACES */
export type RaceGroupType =
    | "qualifying"
    | "heat"
    | "feature_d"
    | "feature_c"
    | "feature_b"
    | "feature_a";

export type RaceStatus = EventStatus;

export type RaceGroup = {
    id: string;
    event_class_id: string;
    group_type: RaceGroupType;
    title: string;
    order_index: number;
    status?: RaceStatus;
    notes?: string | null;
    created_at: string;
};

export type Race = {
    id: string;
    race_group_id: string;
    race_num: number;
    name: string | null;
    status: RaceStatus;
    notes?: string | null;
    order_index: number;
    transfer_count: number;
    created_at: string;
};

export type RaceInput = Omit<Race, "id" | "race_group_id" | "created_at">;

export type RaceGroupInput = Omit<RaceGroup, "id" | "created_at">;

export type RaceEditorRaceInput = RaceInput & {
    id?: string;
};

export type RaceGroupEditorBlock = RaceGroupInput & {
    id?: string;
    races: RaceInput[];
};

export type RaceEditorSavePayload = {
    event_class_id: string;
    groups: RaceGroupEditorBlock[];
};

/* RESULTS */
export type ResultRow = {
    id: string;
    race_id: string;
    entry_id: string;
    finish_position: number | null;
    dns: boolean;
    dnf: boolean;
    dq: boolean;
    bf: boolean;
    transferred: boolean;
    notes: string | null;
    created_at: string;
};

export type ResultWithDetails = ResultRow & {
    event_id: string;
    season_class_car_id: string;
    override_car_number: string | null;
    no_points: boolean;
    no_pay: boolean;
    pay_to_other: boolean;
    pay_to_name: string | null;

    season_id: string;
    class_id: string;
    class_name: string;
    registration_car_number: string;
    car_number: string;
    primary_driver_id: string;
    primary_driver_name: string;
    co_driver_id: string | null;
    co_driver_name: string | null;
    is_active: boolean;
};

export type ResultInput = {
    entry_id: string;
    finish_position: number | null;
    dns: boolean;
    dnf: boolean;
    dq: boolean;
    bf: boolean;
    transferred: boolean;
    notes?: string | null;
};

export type ResultsSavePayload = {
    results: ResultInput[];
};

export type ResultsUpdatePayload = Partial<Omit<ResultInput, "entry_id">>;


/* TAGS */
export type Tag = {
    id: string;
    name: string;
    created_at: string;
};

export type DriverTag = {
    id: string;
    driver_id: string;
    tag_id: string;
    created_at: string;
};