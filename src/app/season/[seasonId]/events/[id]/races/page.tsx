"use client";

import styles from "@/styles/Global.module.css";
import custStyles from "@/styles/Customers.module.css";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    EventClassWithClassName,
    EventRow,
    Race,
    RaceEditorRaceInput,
    RaceEditorSavePayload,
    RaceGroup,
} from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import RaceEditor from "@/components/Editors/RaceEditor";
import { formatDate } from "@/components/Formatter";

function isoDate(value: string) {
    return (value || "").slice(0, 10);
}

export default function EventRacesPage() {
    const router = useRouter();
    const params = useParams<{ seasonId: string; id: string }>();

    const eventId = params.id;
    const seasonId = params.seasonId;

    const [eventData, setEventData] = useState<EventRow | null>(null);
    const [eventClasses, setEventClasses] = useState<EventClassWithClassName[]>([]);
    const [selectedEventClassId, setSelectedEventClassId] = useState("");
    const [raceGroups, setRaceGroups] = useState<RaceGroup[]>([]);
    const [racesByGroup, setRacesByGroup] = useState<Record<string, Race[]>>({});
    const [loading, setLoading] = useState(true);
    const [groupLoading, setGroupLoading] = useState(false);

    useEffect(() => {
        async function loadPage() {
            try {
                const [eventRes, eventClassesRes] = await Promise.all([
                    fetch(`/api/events/${eventId}`, { cache: "no-store" }),
                    fetch(`/api/event-classes?event_id=${eventId}`, { cache: "no-store" }),
                ]);

                const eventJson = await eventRes.json();
                const eventClassesJson = await eventClassesRes.json();

                if (!eventRes.ok) {
                    toast.error(eventJson?.error || "Failed to load event.");
                    router.push("/season");
                    return;
                }

                if (!eventClassesRes.ok) {
                    toast.error(eventClassesJson?.error || "Failed to load event classes.");
                    router.push("/season");
                    return;
                }

                setEventData(eventJson);
                setEventClasses(eventClassesJson);

                if (eventClassesJson.length > 0) {
                    setSelectedEventClassId(eventClassesJson[0].id);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load races page.");
                router.push("/season");
            } finally {
                setLoading(false);
            }
        }

        if (eventId) {
            loadPage();
        }
    }, [eventId, router]);

    async function loadRaceData(classId: string) {
        if (!classId) {
            setRaceGroups([]);
            setRacesByGroup({});
            return;
        }

        try {
            setGroupLoading(true);

            const groupsRes = await fetch(
                `/api/race-groups?event_class_id=${classId}`,
                { cache: "no-store" }
            );
            const groupsJson = await groupsRes.json();

            if (!groupsRes.ok) {
                toast.error(groupsJson?.error || "Failed to load race groups.");
                setRaceGroups([]);
                setRacesByGroup({});
                return;
            }

            const groups: RaceGroup[] = groupsJson;
            setRaceGroups(groups);

            if (!groups.length) {
                setRacesByGroup({});
                return;
            }

            const raceFetches = await Promise.all(
                groups.map(async (group) => {
                    const raceRes = await fetch(
                        `/api/races?race_group_id=${group.id}`,
                        { cache: "no-store" }
                    );
                    const raceJson = await raceRes.json();

                    if (!raceRes.ok) {
                        throw new Error(raceJson?.error || "Failed to load races.");
                    }

                    return {
                        groupId: group.id,
                        races: raceJson as Race[],
                    };
                })
            );

            const nextMap: Record<string, Race[]> = {};
            for (const item of raceFetches) {
                nextMap[item.groupId] = item.races;
            }

            setRacesByGroup(nextMap);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load races.");
            setRaceGroups([]);
            setRacesByGroup({});
        } finally {
            setGroupLoading(false);
        }
    }

    useEffect(() => {
        if (selectedEventClassId) {
            loadRaceData(selectedEventClassId);
        } else {
            setRaceGroups([]);
            setRacesByGroup({});
        }
    }, [selectedEventClassId]);
    
    async function handleSave(payload: RaceEditorSavePayload) {
        const tId = toast.loading("Saving races...");

        try {
            const existingGroupsForClass = raceGroups.filter(
                (group) => group.event_class_id === payload.event_class_id
            );

            const savedGroups: RaceGroup[] = [];
            const groupIdMap = new Map<string, string>();

            for (const group of payload.groups) {
                if (group.id) {
                    const res = await fetch(`/api/race-groups/${group.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            event_class_id: payload.event_class_id,
                            group_type: group.group_type,
                            title: group.title,
                            order_index: group.order_index,
                            status: group.status,
                            notes: group.notes,
                        }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        throw new Error(data?.error || "Failed to update race group.");
                    }

                    savedGroups.push(data);
                    groupIdMap.set(group.id, data.id);
                } else {
                    const res = await fetch(`/api/race-groups`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            event_class_id: payload.event_class_id,
                            group_type: group.group_type,
                            title: group.title,
                            order_index: group.order_index,
                            status: group.status,
                            notes: group.notes,
                        }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        throw new Error(data?.error || "Failed to create race group.");
                    }

                    savedGroups.push(data);
                    groupIdMap.set(`new:${group.group_type}:${group.order_index}`, data.id);
                }
            }

            const incomingGroupIds = new Set(
                payload.groups.map((group) => group.id).filter(Boolean) as string[]
            );

            for (const oldGroup of existingGroupsForClass) {
                if (!incomingGroupIds.has(oldGroup.id)) {
                    const deleteRes = await fetch(`/api/race-groups/${oldGroup.id}`, {
                        method: "DELETE",
                    });

                    const deleteJson = await deleteRes.json();

                    if (!deleteRes.ok) {
                        throw new Error(deleteJson?.error || "Failed to delete removed group.");
                    }
                }
            }

            for (const payloadGroup of payload.groups) {
                const resolvedGroupId = payloadGroup.id
                    ? groupIdMap.get(payloadGroup.id) ?? payloadGroup.id
                    : groupIdMap.get(`new:${payloadGroup.group_type}:${payloadGroup.order_index}`);

                if (!resolvedGroupId) {
                    throw new Error("Failed to resolve race group id.");
                }

                const existingRaces = racesByGroup[resolvedGroupId] || [];
                const incomingRaceIds = new Set(
                    payloadGroup.races
                        .map((race: RaceEditorRaceInput) => race.id)
                        .filter(Boolean) as string[]
                );

                for (const oldRace of existingRaces) {
                    if (!incomingRaceIds.has(oldRace.id)) {
                        const deleteRes = await fetch(`/api/races/${oldRace.id}`, {
                            method: "DELETE",
                        });

                        const deleteJson = await deleteRes.json();

                        if (!deleteRes.ok) {
                            throw new Error(deleteJson?.error || "Failed to delete removed race.");
                        }
                    }
                }

                for (let i = 0; i < payloadGroup.races.length; i += 1) {
                    const race: RaceEditorRaceInput = payloadGroup.races[i];

                    if (race.id) {
                        const updateRes = await fetch(`/api/races/${race.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                race_group_id: resolvedGroupId,
                                race_num: race.race_num,
                                name: race.name,
                                status: race.status,
                                notes: race.notes,
                                order_index: race.order_index ?? i,
                            }),
                        });

                        const updateJson = await updateRes.json();

                        if (!updateRes.ok) {
                            throw new Error(updateJson?.error || "Failed to update race.");
                        }
                    } else {
                        const createRes = await fetch(`/api/races`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                race_group_id: resolvedGroupId,
                                race_num: race.race_num,
                                name: race.name,
                                status: race.status,
                                notes: race.notes,
                                order_index: race.order_index ?? i,
                            }),
                        });

                        const createJson = await createRes.json();

                        if (!createRes.ok) {
                            throw new Error(createJson?.error || "Failed to create race.");
                        }
                    }
                }
            }

            await loadRaceData(payload.event_class_id);
            toast.success("Races saved!", { id: tId });
        } catch (error) {
            console.error(error);
            toast.error(
                error instanceof Error ? error.message : "Failed to save races.",
                { id: tId }
            );
        }
    }

    if (loading || groupLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className={custStyles.wrap}>
            <div className={custStyles.header}>
                <h1 className={styles.heading}>
                    Races for{" "}
                    {(isoDate(formatDate(eventData?.event_date || "") || "")) ||
                        eventData?.name ||
                        "Event"}
                </h1>

                <div className={custStyles.tools}>
                    <button
                        className={styles.buttonSecondary}
                        onClick={() => router.push("/season")}
                    >
                        Reverse
                    </button>

                    <button
                        className={styles.button}
                        onClick={() => router.push(`/season/${seasonId}/events/${eventId}/entries`)}
                    >
                        Entries
                    </button>

                    <button
                        className={styles.button}
                        onClick={() => router.push(`/season/${seasonId}/events/${eventId}/results`)}
                    >
                        Results
                    </button>
                </div>
            </div>

            <RaceEditor
                eventClasses={eventClasses}
                activeClassId={selectedEventClassId || null}
                groups={raceGroups}
                racesByGroupId={racesByGroup}
                onClassChange={async (classId) => {
                    setSelectedEventClassId(classId);
                }}
                onSave={handleSave}
                onCancel={() => router.push("/season")}
            />
        </div>
    );
}