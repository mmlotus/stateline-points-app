export function formatDate(dateString: string) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}.${day}.${year}`;
};

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