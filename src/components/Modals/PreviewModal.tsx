import React, { useState } from "react";
import styles from "@/styles/Global.module.css";

type Props = {
    trigger: (open: (url: string) => void) => React.ReactNode;
    previewUrl?: string;
    onSend?: () => void;
    showSendButton?: boolean;
    cancelText?: string;
};

const PreviewModal = ({
    trigger, showSendButton = false,
    cancelText = "Close", onSend,
}: Props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [url, setUrl] = useState<string | null>(null);

    const open = (previewUrl: string) => {
        setUrl(previewUrl);
        setIsVisible(true);
    };

    const close = () => {
        setIsVisible(false);
        setUrl(null);
    };

    return (
        <>
        {trigger(open)}
        {isVisible && url && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalWide}>
                <iframe
                    src={url ?? ''}
                    style={{ width: '100%', height: '75vh', border: 'none' }}
                />
                <div className={styles.modalActions}>
                    {showSendButton && (
                        <button className={styles.button} onClick={onSend}>Send</button>
                    )}
                    <button className={styles.buttonSecondary} onClick={close}>{cancelText}</button>
                </div>
            </div>
        </div>
        )}
        </>
    );
};

export default PreviewModal;