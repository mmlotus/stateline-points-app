"use client";

import styles from "../styles/Toggle.module.css";

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export default function Toggle({ label, checked, onChange }: ToggleProps) {
    return (
        <label className={styles.toggleWrapper}>
            <span className={styles.toggleLabel}>{label}</span>
            <div className={styles.switch}>
                <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className={styles.toggleInput}
                />
                <span className={styles.toggleSlider}></span>
            </div>
        </label>
    );
}