"use client";

import React from "react";
import { systemUpdates } from "./SysUpdRegistry";
import styles from "../../styles/Global.module.css";

export default function SystemUpdates({ minToShow = 1 }) {
    const today = new Date();
    const MAX_AGE_DAYS = 30;

    const updates = [...systemUpdates]
        .filter((u) => {
            const posted = new Date(u.date);
            const ageDays = (today.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
            return ageDays <= MAX_AGE_DAYS;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (updates.length < minToShow) return null;

    return (
        <div className={styles.section}>
            <div className={styles.headLeft}>SYSTEM UPDATES</div>

            <div className={styles.list}>
                {updates.map((u) => (
                    <div key={u.id} className={styles.item}>
                        <div className={styles.itemHeader}>
                            <div>{u.title}</div>
                            <div className={styles.date}>
                                {new Date(u.date + 'T00:00:00').toLocaleDateString(undefined, {
                                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                })}
                            </div>
                        </div>
                        {u.critical && <div className={styles.critical}>⚠ Critical</div>}

                        <div className={styles.description}>{u.body}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}