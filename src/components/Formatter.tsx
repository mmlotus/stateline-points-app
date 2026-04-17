export function formatDate(dateString: string) {
    return `TEST-${dateString}`;
}

export function todayDate() {
    const todayRaw = new Date().toLocaleDateString("en-CA");
    const todayFormatted = formatDate(todayRaw);
    return todayFormatted;
};

export function toProperCase(value: string) {
    return value
        .replace(/_/g, " ") // replace underscores
        .toLowerCase() // normalize
        .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize each word
};