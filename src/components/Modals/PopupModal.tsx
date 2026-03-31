import React from "react";
import styles from "@/styles/Global.module.css";

interface BasicModalProps {
    isOpen: boolean;
    title?: string;
    message?: string | React.ReactNode;
    onClose: () => void;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    disableConfirm?: boolean;
}

export default function BasicModal({
    isOpen,
    title = "Notice",
    message,
    onClose,
    confirmText = "Okay",
    cancelText,
    onConfirm,
    disableConfirm = false,
}: BasicModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                {title && <h2 className={styles.heading}>{title}</h2>}

                {message && (
                    <div style={{ marginTop: "12px", fontSize: "16px", lineHeight: 1.5 }}>
                        {typeof message === "string" ? <p>{message}</p> : message}
                    </div>
                )}

                <div className={styles.modalActions}>
                    {cancelText && (
                        <button
                            className={styles.buttonSecondary}
                            onClick={onClose}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        className={styles.button}
                        onClick={onConfirm || onClose}
                        disabled={disableConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}