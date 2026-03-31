"use client";

import SchemeEditor from "@/components/Editors/SchemeEditor";
import { SchemeSavePayload } from "@/types";
import { useRouter } from "next/navigation";
import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";


export default function NewSchemePage() {
    const router = useRouter();

    async function handleSave(payload: SchemeSavePayload) {
        const tId = toast.loading("Creating scheme...");

        try {
            const res = await fetch("/api/schemes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = "Failed to create scheme.";
                try {
                    const err = await res.json();
                    if (err?.error) msg = err.error;
                } catch { }
                toast.error(msg, { id: tId });
                console.error("Failed to create scheme");
                return;
            }

            const created = await res.json();

            if (!created?.id) {
                toast.error("Scheme created but no ID returned.", { id: tId });
                return;
            }

            toast.success("Scheme created.", { id: tId });
            router.push(`/settings/schemes`);
        } catch (err) {
            console.error(err);
            toast.error("Network error creating scheme.", { id: tId });
        }
    }

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>New Scheme</h1>
            </div>
            <SchemeEditor onSave={handleSave} />
        </div>
    );
}