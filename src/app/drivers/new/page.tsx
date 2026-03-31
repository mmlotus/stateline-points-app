"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { DriverCreatePayload } from "@/types";
import DriverEditor from "@/components/Editors/DriverEditor";

export default function NewDriverPage() {
    const router = useRouter();

    async function handleSave(payload: DriverCreatePayload) {
        const tId = toast.loading("Creating new driver...");

        try {
            const res = await fetch("/api/drivers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = "Failed to create new driver.";
                try {
                    const err = await res.json();
                    if (err?.error) msg = err.error;
                } catch {}
                toast.error(msg, { id: tId });
                console.error("Failed to create driver");
                return;
            }

            const created = await res.json();

            if (!created?.id) {
                toast.error("Driver created but no ID returned.", { id: tId });
                return;
            }

            toast.success("Driver created!", { id: tId });
            router.push("/drivers");
        } catch (err) {
            console.error(err);
            toast.error("Network error creating driver.", { id: tId });
        }
    }

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>New Driver</h1>
            </div>
            <DriverEditor
                onSave={handleSave}
                onCancel={() => router.push("/drivers")}
            />
        </div>
    );
}