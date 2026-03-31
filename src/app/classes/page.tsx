"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import { Class } from "@/types";
import { Pencil, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import { useSortableData } from "@/lib/useSortableData";

function isoDate(value: string) {
    return (value || "").slice(0, 10);
}

export default function ClassesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<Class[]>([]);

    const {
        SortHeader,
        sortedData: sortedClasses,
        paginatedData: paginatedClasses,
        currentPage,
        setCurrentPage,
        perPage,
        setPerPage,
    } = useSortableData<Class>({
        data: classes,
        initialKey: "name",
        dateKeys: ["created_at"],
        initialPerPage: 25,
    });

    async function loadClasses(showToast = false) {
        const tId = showToast ? toast.loading("Loading classes...") : undefined;

        try {
            const cRes = await fetch("/api/classes", { cache: "no-store" });
            if (!cRes.ok) {
                if (tId) toast.error("Failed to load classes.", { id: tId });
                else toast.error("Failed to load all classes.");
                return;
            }

            const c: Class[] = await cRes.json();
            setClasses(c);

            if (tId) toast.dismiss(tId);
        } catch (err) {
            console.error(err);
            if (tId) toast.error("Failed to load classes.", { id: tId });
            else toast.error("Failed to load all classes");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadClasses(false);
    }, []);

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete class "${name}"?`)) return;

        const tId = toast.loading("Deleting class...");
        try {
            const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) {
                toast.error("Failed to delete class.", { id: tId });
                return;
            }

            toast.success("Class deleted.", { id: tId });
            await loadClasses(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete class.", { id: tId });
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>Classes</h1>

                <div className={custStyles.tools}>
                    <button
                        className={styles.button}
                        onClick={() => {
                            router.push("/classes/new");
                        }}
                    >
                        + New Class
                    </button>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                perPage={perPage}
                totalItems={sortedClasses.length}
                onPageChange={setCurrentPage}
                onPerPageChange={setPerPage}
                label="classes"
            />

            <div className={custStyles.tableWrap}>
                <table className={custStyles.table}>
                    <thead>
                        <tr>
                            <th><SortHeader label="Name" sortKey="name" /></th>
                            <th><SortHeader label="Created" sortKey="created_at" /></th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {!classes.length ? (
                            <tr>
                                <td className={custStyles.empty} colSpan={3}>
                                    No classes yet!
                                </td>
                            </tr>
                        ) : (
                            paginatedClasses.map((classItem) => (
                        <tr key={classItem.id}>
                            <td>{classItem.name}</td>
                            <td style={{ textAlign: "center" }}>{isoDate(classItem.created_at)}</td>
                            <td className={custStyles.right}>
                                <button
                                    className={styles.iconButton}
                                    onClick={() =>
                                        router.push(`/classes/${classItem.id}`)
                                    }
                                    aria-label="Edit class"
                                    title="Edit class"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    className={styles.iconButton}
                                    onClick={() => handleDelete(classItem.id, classItem.name)}
                                    aria-label="Delete class"
                                    title="Delete"
                                >
                                    <TrashIcon size={16} />
                                </button>
                            </td>
                        </tr>
                        ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                perPage={perPage}
                totalItems={sortedClasses.length}
                onPageChange={setCurrentPage}
                onPerPageChange={setPerPage}
                label="classes"
            />
        </div>
    );
}