export type SchemeType = "points" | "pay";

export type Scheme = {
  id: string;
  name: string;
  description: string;
  type: SchemeType;
  is_active: boolean;

  show_up_points_enabled: boolean;
  show_up_start_points: number;
  show_up_non_start_points: number;

  continuous_feature_points: boolean;

  pay_show_b_main: boolean;

  add_points_enabled: boolean;
  add_points_label: string;

  created_at: string;
  updated_at: string;
};

/* MODIFIERS */
export type ModifierMode = "full" | "none" | "custom";

export type ResultModifier = {
  mode: ModifierMode;
  custom_value?: number;
};

/* BREAKDOWNS */
export type SchemeBreakdownType =
  | "qualifying"
  | "heat"
  | "c_feature"
  | "b_feature"
  | "a_feature";

export type SchemeBreakdown = {
  id: string;
  scheme_id: string;
  type: SchemeBreakdownType;

  exclude_show_up_points: boolean;

  result_modifiers: {
    dnf: ResultModifier;
    dq: ResultModifier;
    dns: ResultModifier;
    bf: ResultModifier;
  };
};

export type SchemeLine = {
  id: string;
  breakdown_id: string;
  start_position: number;
  end_position: number | null;
  value: number;
};

/* DB JOIN SHAPE */
export type SchemeWithBreakdowns = Scheme & {
  breakdowns: (SchemeBreakdown & {
    lines: SchemeLine[];
  })[];
};

/* EDITABLE TYPES (UI SHAPE) */
export type EditableSchemeLine = {
  client_id: string;
  start_position: string;
  value: number | "";
};

export type TransferExclusionRace = "heat" | "c_feature" | "b_feature" | "a_feature";

export type EditableBreakdown = Omit<SchemeBreakdown, "id" | "scheme_id"> & {
  id?: string;
  lines: EditableSchemeLine[];
  transfer_exclusions_enabled?: boolean;
  transfer_exclusion_races?: TransferExclusionRace[];
  passing_points_enabled?: boolean;
  passing_points_gain_value?: number;
  passing_points_lost_value?: number;
};

export type EditableSchemePayload = Omit<Scheme, "id" | "created_at" | "updated_at"> & {
  breakdowns: EditableBreakdown[];
};

/* SAVE PAYLOAD (API SHAPE) */
export type SchemeSavePayload = Omit<EditableSchemePayload, "breakdowns"> & {
  breakdowns: {
    type: SchemeBreakdownType;
    exclude_show_up_points: boolean;
    result_modifiers: SchemeBreakdown["result_modifiers"];
    transfer_exclusions_enabled: boolean;
    transfer_exclusion_races: TransferExclusionRace[];
    passing_points_enabled: boolean;
    passing_points_gain_value: number;
    passing_points_lost_value: number;
    lines: {
      start_position: string;
      value: number;
    }[];
  }[];
};

export type SchemeBreakdownRow = SchemeBreakdown & {
  transfer_exclusions_enabled?: boolean;
  transfer_exclusion_races?: TransferExclusionRace[];
  passing_points_enabled?: boolean;
  passing_points_gain_value?: number;
  passing_points_lost_value?: number;
  lines?: SchemeLine[];
};