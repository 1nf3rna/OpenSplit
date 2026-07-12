import SegmentPayload from "../../models/segmentPayload";

export type RunningTotals = {
    avg: number;
    pb: number;
    gold: number;
};

export type RenderResult = {
    rows: React.ReactElement[];
    totals: RunningTotals;
};

export type Platform = {
    id: string;
    name: string;
};

export type GameMatch = {
    id: string;
    name: string;
    platforms: Platform[];
};

export type Category = {
    id: string;
    name: string;
};

export type SelectedVariable = {
    name: string;
    value: string;
    label: string;
};

export type Variable = {
    id: string;
    name: string;
    default?: string;
    options: {
        id: string;
        label: string;
    }[];
};

export type SegmentUpdater = (id: string, updater: (segment: SegmentPayload) => SegmentPayload) => void;
