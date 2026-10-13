"use client";

import { Html } from "@react-three/drei";
import { memo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CONFIG, FONTS } from "@/config/constants";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PhotoBook } from "@/components/PhotoBook/PhotoBook";
import { DetailsText } from "./DetailsText";
import { useCurlFade } from "./useCurlFade";

interface PhotographySectionProps {
    heading: string;
    headingX: number;
    headingY: number;
    bookX: number;
    bookY: number;
    bookWidthPx: number;
    bookHeightPx: number;
    headingFontSize: number;
    pxTo3DWidth: number;
    startTrigger: boolean;
}

function InlinePhotoBook({
    position,
    widthPx,
    heightPx,
    delay,
    startTrigger,
}: {
    position: [number, number, number];
    widthPx: number;
    heightPx: number;
    delay: number;
    startTrigger: boolean;
}) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const [expandedAt, setExpandedAt] = useState<number | null>(null);
    const fadeRef = useRef<HTMLDivElement>(null);
    const { groupRef, twinRef, revealedRef } = useCurlFade<HTMLDivElement>(
        (opacity) => {
            if (fadeRef.current) fadeRef.current.style.opacity = String(opacity);
        },
    );

    useGSAP(
        () => {
            if (!startTrigger) return;
            if (prefersReducedMotion) {
                revealedRef.current = true;
                return;
            }
            const call = gsap.delayedCall(delay, () => {
                revealedRef.current = true;
            });
            return () => call.kill();
        },
        { dependencies: [startTrigger, delay, prefersReducedMotion] },
    );

    return (
        <group ref={groupRef} position={position}>
            <Html as="div" className="left-0 top-0">
                <div
                    ref={twinRef}
                    className="pointer-events-auto"
                    style={{ width: widthPx, height: heightPx }}
                >
                    <div
                        ref={fadeRef}
                        style={{ opacity: 0, transition: "opacity 0.35s ease" }}
                    >
                        <PhotoBook
                            mode="inline"
                            width={widthPx}
                            height={heightPx}
                            onExpand={setExpandedAt}
                        />
                    </div>
                </div>
                {expandedAt !== null && (
                    <PhotoBook
                        mode="overlay"
                        initialFlipped={expandedAt}
                        onClose={() => setExpandedAt(null)}
                    />
                )}
            </Html>
        </group>
    );
}

export const PhotographySection = memo(function PhotographySection({
    heading,
    headingX,
    headingY,
    bookX,
    bookY,
    bookWidthPx,
    bookHeightPx,
    headingFontSize,
    pxTo3DWidth,
    startTrigger,
}: PhotographySectionProps) {
    return (
        <>
            <DetailsText
                text={heading}
                position={[headingX, headingY, 0]}
                anchorX="left"
                anchorY="top"
                calculatedFontSize={headingFontSize}
                pixelFontSize={headingFontSize / pxTo3DWidth}
                font={FONTS.karlaLight}
                fontWeightClass="font-light"
                role="textPrimary"
                startTrigger={startTrigger}
                delay={CONFIG.detailsTimings.HEADING_DELAY}
                direction="leftToRight"
                lineHeight={1}
                letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
            />

            <InlinePhotoBook
                position={[bookX, bookY, 0]}
                widthPx={bookWidthPx}
                heightPx={bookHeightPx}
                delay={CONFIG.detailsTimings.BODY_DELAY}
                startTrigger={startTrigger}
            />
        </>
    );
});
