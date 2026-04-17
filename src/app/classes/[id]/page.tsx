"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Class, ClassSavePayload } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ClassEditor from "@/components/Editors/ClassEditor";

export default function EditClassPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params.id;

    const [classData, setClassData] = useState<Class | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadClass() {
            try {
                const res = await fetch(`/api/classes/${id}`, { cache: "no-store" });
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data?.error || "Failed to load class.");
                    router.push("/classes");
                    return;
                }

                setClassData(data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load class.");
                router.push("/classes");
            } finally {
                setLoading(false);
            }
        }

        if (id) loadClass();
    }, [id, router]);

    async function handleSave(payload: ClassSavePayload) {
        const tId = toast.loading("Updating class...");

        try {
            const res = await fetch(`/api/classes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Failed to update class.", { id: tId });
                return;
            }

            toast.success("Class updated!", { id: tId });
            router.push("/classes");
        } catch (error) {
            console.error(error);
            toast.error("Failed to udpate class.", { id: tId });
        }
    }

    if (loading) return <LoadingSpinner />
    if (!classData) return null;

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Edit Class</h1>
            </div>

            <ClassEditor
                name={classData.name}
                class_sponsor={classData.class_sponsor ?? ""}
                default_points_scheme_id={classData.default_points_scheme_id ?? null}
                default_pay_scheme_id={classData.default_pay_scheme_id ?? null}
                onSave={handleSave}
                onCancel={() => router.push("/classes")}
            />
        </div>
    );
}
