import sql from "./db";

export async function markEventComplete(eventId: string) {
    const races = await sql`
        SELECT ra.status
        FROM races ra
        INNER JOIN race_groups rg
            ON rg.id = ra.race_group_id
        INNER JOIN event_classes ec
            ON ec.id = rg.event_class_id
        WHERE ec.event_id = ${eventId}
    `;

    const allRacesDone = races.length > 0 && races.every((race) => race.status !== "scheduled");

    if (allRacesDone) {
        await sql`
            UPDATE events
            SET status = 'complete'
            WHERE id = ${eventId}
        `;
    }
}