"use client";

import Image from "next/image";

type CardImgProps = {
    name: string;
    alt?: string;
    className?: string;
};

export default function CardImg({ name, alt = "", className = "" }: CardImgProps) {
    return (
        <Image
            src={`/images/vectors/${name}.svg`}
            alt={alt}
            width={1}
            height={1}
            className={`w-full h-auto ${className}`}
            loading="lazy"
        />
    );
}