"use client";

import React, { useRef, useState, useEffect, PropsWithChildren } from "react";
import styles from "../styles/Global.module.css";

export default function DragScrollContainer({ children }: PropsWithChildren) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseDown = (e: MouseEvent) => {
            setIsDragging(true);
            setStartX(e.pageX - container.offsetLeft);
            setScrollLeft(container.scrollLeft);
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5; //drag speed
            container.scrollLeft = scrollLeft - walk;
        };

        const stopDrag = () => setIsDragging(false);

        container.addEventListener("mousedown", handleMouseDown);
        container.addEventListener("mousemove", handleMouseMove);
        container.addEventListener("mouseup", stopDrag);
        container.addEventListener("mouseleave", stopDrag);

        return () => {
            container.removeEventListener("mousedown", handleMouseDown);
            container.removeEventListener("mousemove", handleMouseMove);
            container.removeEventListener("mouseup", stopDrag);
            container.removeEventListener("mouseleave", stopDrag);
        };
    }, [isDragging, startX, scrollLeft]);

    return (
        <div
            ref={containerRef}
            className={`${styles.dragScrollWrapper} ${isDragging ? styles.dragging : ""}`}
        >
            {children}
        </div>
    );
}