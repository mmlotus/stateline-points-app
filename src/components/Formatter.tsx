export function formatDate(dateString: string) {
    if (!dateString) return "";

    const match = String(dateString).match(/^\d{4}-\d{2}-\d{2}$/);
    if (match) {
        const [year, month, day] = match;
        return `${month}.${day}.${year}`;
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    
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