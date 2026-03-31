"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import styles from "../styles/Global.module.css";

export default function ScrollTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > 150);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        isVisible && (
            <button
                onClick={scrollToTop}
                className={styles.scrollToTop}
                title="Beam me up, Scotty!"
            ><ChevronUp size={20} /></button>
        )
    );
}