import React from "react";
import styles from "../../styles/Forms.module.css";
import { SquareMinus } from "lucide-react";
import LoadingSpinner from "../LoadingSpinner";

type RowSize = "full" | "half" | "third";
type Direction = "column" | "row";
type ButtonVariant = "primary" | "secondary";

interface FieldProps {
    label: string;
    children: React.ReactNode;
    size?: RowSize;
}

export function Form({
    title,
    onSubmit,
    children,
    loading,
    variant = "card",
}: {
    title?: string;
    onSubmit?: (e: React.FormEvent) => void;
    children: React.ReactNode;
    loading?: boolean;
    variant?: "card" | "page";
}) {
    if (loading) {
        return <LoadingSpinner />
    }
    
    return (
        <div className={styles.landing}>
            {title && <h1 className={styles.heading}>{title}</h1>}
            <form onSubmit={onSubmit} className={variant === "page" ? styles.pageForm : styles.card}>
                {children}
            </form>
        </div>
    );
}

export function FormRow({ children }: { children: React.ReactNode }) {
    return <div className={styles.row}>{children}</div>;
}

export function Input(
    props: React.InputHTMLAttributes<HTMLInputElement>
) {
    return <input className={styles.input} {...props} />;
}

export function Select(
    props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
    return <select className={styles.input} {...props} />;
}

interface FieldProps {
    label: string;
    children: React.ReactNode;
    size?: RowSize;
    direction?: Direction;
    gap?: "xs" | "sm" | "md";
}

export function Field({
    label, children, size = "full", direction = "column", gap = "sm",
}: FieldProps) {
    return (
        <div className={`${styles.formField} ${styles[size]}`}>
            <label className={styles.label}>{label}</label>
            <div
                className={[
                    styles.group,
                    styles[`dir-${direction}`],
                    styles[`gap-${gap}`],
                ].join(" ")}
            >
                {children}
            </div>
        </div>
    );
}

export function Button({
    children,
    className,
    variant = "primary",
    ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
}) {
    const variantClass =
        variant === "primary" ? styles.button : styles.buttonSecondary;

    return (
        <button
            className={`${variantClass} ${className ?? ""}`}
            {...rest}
        >
            {children}
        </button>
    );
}

export function FormActions({
    left, right
}: {
    left?: React.ReactNode, right?: React.ReactNode;
}) {
    return (
        <div className={styles.buttonRow}>
            <div className={styles.actionsLeft}>{left}</div>
            <div className={styles.actionRight}>{right}</div>
        </div>
    );
}

interface FormRemoveButtonProps {
    onClick: () => void;
    show?: boolean;
    title?: string;
}

export function FormRemoveButton({
    onClick,
    show = true,
    title = "Remove",
}: FormRemoveButtonProps) {
    if (!show) return null;

    return (
        <button
            type="button"
            onClick={onClick}
            className={styles.removeIconButton}
            title={title}
        >
            <SquareMinus size={18} strokeWidth={1.8} />
        </button>
    );
}