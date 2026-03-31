"use client";

import Image from "next/image";
import styles from "../../styles/Banner.module.css";

interface BannerProps {
    type: string;
    title?: string;
    subtitle?: string;
    titleClassName?: string;
    heightOverride?: string;
}

export default function Banner({ type, title, subtitle, titleClassName, heightOverride }: BannerProps) {
    const bannerImages: Record<string, string> = {
        default: "/images/banners/raceflagtrack.jpg",
    };

    const focalPoints: Record<string, string> = {
        default: "center center",
    };

    const bannerSrc = bannerImages[type] || bannerImages.default;
    const focalPoint = focalPoints[type] || "center center";

    return (
        <div className={styles.banner} style={{ "--banner-height": heightOverride || undefined } as React.CSSProperties}>
            <Image
                src={bannerSrc}
                alt={`${type} Banner`}
                fill
                priority
                sizes="100vw"
                className={styles.bannerImage}
                style={{ objectPosition: focalPoint }}
            />
            <div className={styles.bannerContent}>
                <h1 className={titleClassName ? titleClassName : styles.title}>
                    {title || "If you ain't first, you're last"}
                </h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
        </div>
    );
}