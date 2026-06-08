import { RookieStatus } from "@/types";
import { BadgeCheck, Rows2, Rows3, Square } from "lucide-react";

export function RookieBadge({ status }: { status: RookieStatus }) {
    const baseProps = {
        size: 12,
        strokeWidth: 2.5,
        style: {
            flexShrink: 0,
            verticalAlign: "middle",
        },
    };

    switch (status) {
        case "race_1":
            return <Square {...baseProps} color="#ff9129" />;
        case "race_2":
            return <Rows2 {...baseProps} color="#ff63ea" />;
        case "race_3":
            return <Rows3 {...baseProps} color="#00f048" />;
        case "cleared":
            return <BadgeCheck {...baseProps} color="#4bb7ff" />;
        default:
            return null;
    }
}