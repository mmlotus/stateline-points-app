import sql from "./db";

export async function rebuildSeasonStandingsForClass(args: {
    event_id: string;
    class_id: string;
}) {
    const { event_id, class_id } = args;

    const eventRows = await sql`
        SELECT season_id
        FROM events
        WHERE id = ${event_id}
        LIMIT 1
    `;

    if (!eventRows.length) {
        throw new Error("Event not found while rebuilding season standings.");
    }

    const season_id = eventRows[0].season_id as string;

    await sql`BEGIN`;

    try {
        await sql`
            DELETE FROM season_championship_standings
            WHERE season_id = ${season_id}
                AND class_id = ${class_id}
        `;

        await sql`
            INSERT INTO season_championship_standings (
                season_id,
                class_id,
                season_class_car_id,
                total_points,
                total_pay,
                events_count,
                updated_at
            )
            SELECT
                scc.season_id,
                scc.class_id,
                scc.id AS season_class_car_id,
                COALESCE(SUM(cet.total_points), 0) AS total_points,
                COALESCE(SUM(cet.total_pay), 0) AS total_pay,
                COUNT(DISTINCT cet.event_id) AS events_count,
                now() AS updated_at
            FROM season_class_cars scc
            LEFT JOIN event_entries ee
                ON ee.season_class_car_id = scc.id
            LEFT JOIN calculated_event_totals cet
                ON cet.entry_id = ee.id
                AND cet.class_id = scc.class_id
            WHERE scc.season_id = ${season_id}
                AND scc.class_id = ${class_id}
            GROUP BY
                scc.season_id,
                scc.class_id,
                scc.id
            HAVING
                COALESCE(SUM(cet.total_points), 0) <> 0
                OR COALESCE(SUM(cet.total_pay), 0) <> 0
                OR COUNT(DISTINCT cet.event_id) > 0
        `;

        await sql`COMMIT`;

        return { season_id, class_id };
    } catch (error) {
        await sql`ROLLBACK`;
        throw error;
    }
}