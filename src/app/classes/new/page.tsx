"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ClassSavePayload } from "@/types";
import ClassEditor from "@/components/Editors/ClassEditor";

export default function NewClassPage() {
    const router = useRouter();

    async function handleSave(payload: ClassSavePayload) {
        const tId = toast.loading("Creating new class...");

        try {
            const res = await fetch("/api/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                let msg = "Failed to create new class.";
                try {
                    const err = await res.json();
                    if (err?.error) msg = err.error;
                } catch { }
                toast.error(msg, { id: tId });
                console.error("Failed to create class");
                return;
            }

            const created = await res.json();

            if (!created?.id) {
                toast.error("Class created but no ID returned.", { id: tId });
                return;
            }

            toast.success("Class created!", { id: tId });
            router.push("/classes");
        } catch (err) {
            console.error(err);
            toast.error("Network error creating class.", { id: tId });
        }
    }

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>New Class</h1>
            </div>
            <ClassEditor
                onSave={handleSave}
                onCancel={() => router.push("/classes")}
            />
        </div>
    );
}