"use client";

import styles from "./Bread.module.css";
import { breadcrumbMap } from "./breadcrumbConfig";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function isUuid(s: string) {
    return /^[0-9a-fA-F-]{36}$/.test(s);
}

export default function Breadcrumbs() {
    const pathname = usePathname();
    const [labelMap, setLabelMap] = useState<Record<string, string>>({});

    const segments = pathname.split("/").filter(Boolean);

    useEffect(() => {
        const loadLabels = async () => {
            const uuidSegments = segments.filter((s) => isUuid(s));
            if (!uuidSegments.length) return;

            const currentId = uuidSegments[uuidSegments.length - 1];

            const newLabels: Record<string, string> = {};

            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i];
                if (!isUuid(seg)) continue;

                const isCurrent = seg === currentId;
                if (!isCurrent && labelMap[seg]) continue;

                const prevSeg = segments[i - 1];

                try {
                    if (prevSeg === "season") {
                        const res = await fetch("/api/seasons/active", { cache: "no-store" });
                        if (!res.ok) continue;

                        const data = await res.json();

                        if (data?.id === seg && data?.year) {
                            newLabels[seg] = String(data.year);
                        }
                    } else if (prevSeg === "schemes") {
                        const res = await fetch(`/api/schemes/${seg}`, { cache: "no-store" });
                        if (!res.ok) continue;

                        const data = await res.json();

                        if (data?.name) {
                            newLabels[seg] = data.name;
                        }
                    } else if (prevSeg === "events") {
                        const res = await fetch(`/api/events/${seg}`, { cache: "no-store" });
                        if (!res.ok) continue;

                        const data = await res.json();

                        if (data?.name) {
                            newLabels[seg] = data.name;
                        } else {
                            newLabels[seg] = "Edit Event";
                        }
                    }
                } catch (e) {
                    console.error("Failed to load breadcrumb label for", seg, e);
                }
            }

            if (Object.keys(newLabels).length) {
                setLabelMap((prev) => ({ ...prev, ...newLabels }));
            }
        };

        loadLabels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    if (!pathname || pathname === "/" || pathname.toLowerCase() === "/home" || pathname.toLowerCase() === "/login") return null;

    const crumbs = segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;

        const label = labelMap[seg] || breadcrumbMap[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        return { href, label, isLast };
    });

    return (
        <nav aria-label="Breadcrumb" className={styles.nav}>
            <ol className={styles.list}>
                <li key="home" className={styles.item}>
                    <Link href="/home" className={styles.link}>{breadcrumbMap[""]}</Link>
                    {crumbs.length > 0 && <span className={styles.icon}><ChevronRight size={10} /></span>}
                </li>
                {crumbs.map((c, i) => {
                    const isIntermediate = segments.includes('new') || segments.includes('edit');
                    const showAsLink = !c.isLast && !isIntermediate;

                    return (
                        <li key={i} className={styles.item}>
                            {showAsLink ? (
                                <>
                                    <Link href={c.href} className={styles.link}>{c.label}</Link>
                                    <span className={styles.icon}><ChevronRight size={10} /></span>
                                </>
                            ) : (
                                <>
                                    <span className={styles.item}>{c.label}</span>
                                    {!c.isLast && <span className={styles.icon}><ChevronRight size={10} /></span>}
                                </>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}