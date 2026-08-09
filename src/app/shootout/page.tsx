"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

type ShootoutApiRow = {
    event_id: string;
    event_date: string;
    event_name: string;

    class_id: string;
    class_name: string;

    season_class_car_id: string;

    car_number: string;
    primary_driver_name: string;
    co_driver_name: string | null;
    co_driver_drove: boolean;

    total_points: number | string;
};

type ShootoutRow = {
    season_class_car_id: string;
    car_number: string;
    driver_name: string;
    day1: number;
    day2: number;
    day3: number;
    total: number;
};

type ShootoutResponse = {
    dates: string[];
    rows: ShootoutApiRow[];
};

function buildStandings(
    rows: ShootoutApiRow[],
    className: string,
    shootoutDates: string[]
): ShootoutRow[] {
    const classRows = rows.filter(
        (row) => row.class_name === className
    );

    const map = new Map<string, ShootoutRow>();

    for (const row of classRows) {
        const key = row.season_class_car_id;

        if (!map.has(key)) {
            map.set(key, {
                season_class_car_id: key,
                car_number: row.car_number,
                driver_name:
                    row.co_driver_drove && row.co_driver_name
                        ? row.co_driver_name
                        : row.primary_driver_name,
                day1: 0,
                day2: 0,
                day3: 0,
                total: 0,
            });
        }

        const existing = map.get(key)!;
        const points = Number(row.total_points) || 0;

        const eventDate = row.event_date.slice(0, 10);

        if (eventDate === shootoutDates[0]) {
            existing.day1 = points;
        } else if (eventDate === shootoutDates[1]) {
            existing.day2 = points;
        } else if (eventDate === shootoutDates[2]) {
            existing.day3 = points;
        }
    }

    return Array.from(map.values())
        .map((row) => ({
            ...row,
            total: row.day1 + row.day2 + row.day3,
        }))
        .sort((a, b) => {
            if (b.total !== a.total) {
                return b.total - a.total;
            }

            return a.car_number.localeCompare(
                b.car_number,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base",
                }
            );
        });
}

function ShootoutTable({
    title,
    rows,
}: {
    title: string;
    rows: ShootoutRow[];
}) {
    return (
        <div className={custStyles.tableWrap}>
            <table className={custStyles.table}>
                <colgroup>
                    <col className={custStyles.shootoutPosCol} />
                    <col className={custStyles.shootoutCarCol} />
                    <col className={custStyles.shootoutDriverCol} />
                    <col className={custStyles.shootoutTotalCol} />
                    <col className={custStyles.shootoutDayCol} />
                    <col className={custStyles.shootoutDayCol} />
                    <col className={custStyles.shootoutDayCol} />
                </colgroup>
                <thead>
                    <tr>
                        <th
                            colSpan={7}
                            className={custStyles.favoritesHeader}
                        >
                            {title}
                        </th>
                    </tr>
                </thead>

                <thead>
                    <tr>
                        <th style={{ textAlign: "center" }}>
                            Pos
                        </th>

                        <th style={{ textAlign: "center" }}>
                            Car #
                        </th>

                        <th style={{ textAlign: "center" }}>
                            Driver
                        </th>

                        <th style={{ textAlign: "center" }}>
                            Total Points
                        </th>

                        <th style={{ textAlign: "center" }}>
                            Day 1
                        </th>

                        <th style={{ textAlign: "center" }}>
                            Day 2
                        </th>

                        <th style={{ textAlign: "center" }}>
                            Day 3
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {!rows.length ? (
                        <tr>
                            <td
                                colSpan={7}
                                className={custStyles.empty}
                            >
                                No Shootout points recorded yet.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, index) => (
                            <tr key={row.season_class_car_id}>
                                <td style={{ textAlign: "center" }}>
                                    {index + 1}
                                </td>

                                <td style={{ textAlign: "center" }}>
                                    {row.car_number}
                                </td>

                                <td style={{ textAlign: "center" }}>
                                    <span className={custStyles.name}>
                                        {row.driver_name}
                                    </span>
                                </td>

                                <td
                                    style={{
                                        textAlign: "center",
                                        fontWeight: 700,
                                    }}
                                >
                                    {row.total}
                                </td>

                                <td style={{ textAlign: "center" }}>
                                    {row.day1}
                                </td>

                                <td style={{ textAlign: "center" }}>
                                    {row.day2}
                                </td>

                                <td style={{ textAlign: "center" }}>
                                    {row.day3}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function ShootoutPage() {
    const [data, setData] = useState<ShootoutResponse | null>(
        null
    );

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadShootout() {
            try {
                const res = await fetch("/api/shootout", {
                    cache: "no-store",
                });

                const json = await res.json();

                if (!res.ok) {
                    throw new Error(
                        json?.error ||
                        "Failed to load Shootout standings."
                    );
                }

                setData(json);
            } catch (error) {
                console.error(
                    "Failed to load Shootout standings:",
                    error
                );
            } finally {
                setLoading(false);
            }
        }

        loadShootout();
    }, []);

    const bandoleros = useMemo(() => {
        if (!data) return [];

        return buildStandings(
            data.rows,
            "Bandoleros",
            data.dates
        );
    }, [data]);

    const legends = useMemo(() => {
        if (!data) return [];

        return buildStandings(
            data.rows,
            "Legends",
            data.dates
        );
    }, [data]);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>
                    Bando/Legend Shootout
                </h1>
            </div>

            <div className={custStyles.shootoutGrid}>
                <ShootoutTable
                    title="Bandoleros"
                    rows={bandoleros}
                />

                <ShootoutTable
                    title="Legends"
                    rows={legends}
                />
            </div>

            <div style={{ marginBottom: "50px" }} />
        </div>
    );
}