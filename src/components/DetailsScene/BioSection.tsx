"use client";

import { memo } from "react";
import { DetailsText } from "./DetailsText";
import { BioProfileCard } from "./BioProfileCard";
import { CONFIG, FONTS } from "@/config/constants";

interface BioSectionProps {
    heading: string;
    lines: readonly string[];
    imageX: number;
    imageY: number;
    headingX: number;
    headingY: number;
    textY: number;
    imageWidth: number;
    textX: number;
    headingFontSize: number;
    bodyFontSize: number;
    bodyLineHeight: number;
    pxTo3DWidth: number;
    startTrigger: boolean;
}

export const BioSection = memo(function BioSection({
    heading,
    lines,
    imageX,
    imageY,
    headingX,
    headingY,
    textY,
    imageWidth,
    textX,
    headingFontSize,
    bodyFontSize,
    bodyLineHeight,
    pxTo3DWidth,
    startTrigger,
}: BioSectionProps) {
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

            <BioProfileCard
                position={[imageX, imageY, 0]}
                widthPx={imageWidth / pxTo3DWidth}
                delay={CONFIG.detailsTimings.BODY_DELAY}
                startTrigger={startTrigger}
            />

            {lines.map((line, index) =>
                line === "" ? null : (
                    <DetailsText
                        key={index}
                        text={line}
                        position={[textX, textY - index * bodyLineHeight, 0]}
                        anchorX="left"
                        anchorY="top"
                        calculatedFontSize={bodyFontSize}
                        pixelFontSize={bodyFontSize / pxTo3DWidth}
                        font={FONTS.karlaLight}
                        fontWeightClass="font-light"
                        role="textBody"
                        startTrigger={startTrigger}
                        delay={
                            CONFIG.detailsTimings.BODY_DELAY +
                            index * CONFIG.detailsTimings.BODY_STAGGER_STEP
                        }
                        direction="leftToRight"
                        lineHeight={1}
                        letterSpacing={CONFIG.detailsLayout.LETTER_SPACING}
                    />
                ),
            )}
        </>
    );
});
