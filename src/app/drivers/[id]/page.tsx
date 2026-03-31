"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Driver, DriverUpdatePayload } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import DriverEditor from "@/components/Editors/DriverEditor";

export default function EditDriverPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params.id;

    const [driverData, setDriverData] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDriver() {
            try {
                const res = await fetch(`/api/drivers/${id}`, { cache: "no-store" });
                const data = await res.json();

                if (!res.ok) {
                    toast.error(data?.error || "Failed to load driver.");
                    router.push("/drivers");
                    return;
                }

                setDriverData(data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load driver.");
                router.push("/drivers");
            } finally {
                setLoading(false);
            }
        }

        if (id) loadDriver();
    }, [id, router]);

    async function handleSave(payload: DriverUpdatePayload) {
        const tId = toast.loading("Updating driver...");

        try {
            const res = await fetch(`/api/drivers/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.error || "Failed to update driver", { id: tId });
                return;
            }

            toast.success("Driver updated!", { id: tId });
            router.push("/drivers");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update driver.", { id: tId });
        }
    }

    if (loading) return <LoadingSpinner />
    if (!driverData) return null;

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Edit Driver</h1>
            </div>

            <DriverEditor
                name={driverData.name}
                default_car={driverData.default_car}
                is_active={driverData.is_active}
                tags={driverData.tags || []}
                onSave={handleSave}
                onCancel={() => router.push("/drivers")}
            />

        </div>
    );
}