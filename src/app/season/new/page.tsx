"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import { SeasonCreatePayload } from "@/types";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SeasonEditor from "@/components/Editors/SeasonEditor";

export default function NewSeasonPage() {
    const router = useRouter();

    async function handleSave(payload: SeasonCreatePayload) {
        const tId = toast.loading("Creating season...");

        try {
            const res = await fetch("/api/seasons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = "Failed to create season.";
                try {
                    const err = await res.json();
                    if (err?.error) msg = err.error;
                } catch {}
                toast.error(msg, { id: tId });
                console.error("Failed to create season");
                return;
            }

            const created = await res.json();

            if (!created?.id) {
                toast.error("Season created but no ID returned.", { id: tId });
                return;
            }

            toast.success("Season created!", { id: tId });
            router.push("/season");
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error("Network error creating season.", { id: tId });
        }
    }

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>New Season</h1>
            </div>
            <SeasonEditor onSave={handleSave} />
        </div>
    );
}