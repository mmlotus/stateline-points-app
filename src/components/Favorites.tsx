"use client";

import styles from "@/styles/Global.module.css";
import { Star } from "lucide-react";

interface FavoriteStarProps {
    partnerId: number;
    isFavorite: boolean;
    onToggle: (partnerId: number) => void;
}

export default function FavoriteStar({ partnerId, isFavorite, onToggle }: FavoriteStarProps) {
    return (
        <button onClick={() => onToggle(partnerId)} className={styles.iconButton}>
            {isFavorite ? (
                <Star size={20} fill="#cf920e" stroke="#cf920e" cursor="pointer"/>
            ) : (
                <Star size={20} cursor="pointer"/>
            )}
        </button>
    );
}