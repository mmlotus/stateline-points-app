export interface SystemUpdate {
    id: string;
    title: string;
    body: string;
    date: string;
    critical?: boolean;
};

export const systemUpdates: SystemUpdate[] = [
    {
        id: "2026-02-16-001",
        title: "In development 🏗️",
        body: `Building...`,
        date: "2026-02-16",
    },
];