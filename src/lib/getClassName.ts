export function getClassDisplayName(
    cls: { name: string; class_sponsor?: string | null }
) {
    if (!cls) return "";
    return cls.class_sponsor?.trim()
        ? `${cls.class_sponsor} ${cls.name}`
        : cls.name;
}