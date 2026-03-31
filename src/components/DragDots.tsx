type DragHandleProps = {
    label?: string;
    onDragStart: () => void;
    onDragEnd: () => void;
    className?: string;
};

export default function DragHandle({
    label = "Drag to reorder",
    onDragStart,
    onDragEnd,
    className = "",
}: DragHandleProps) {
    return (
        <button
            type="button"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            aria-label={label}
            title={label}
            className={className}
            style={{
                cursor: "grab",
                padding: 4,
                width: 24,
                height: 24,
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 4px)",
                    gridTemplateRows: "repeat(3, 4px)",
                    gap: 2,
                    justifyContent: "center",
                    alignContent: "center",
                    width: 12,
                    height: 16,
                    margin: "0 auto",
                }}
            >
                {[...Array(6)].map((_, dotIndex) => (
                    <span
                        key={dotIndex}
                        style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: "currentColor",
                            display: "block",
                            opacity: 0.7,
                        }}
                    />
                ))}
            </div>
        </button>
    );
}