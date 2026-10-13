"use client";

import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import type { CanvasTexture } from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CONFIG } from "@/config/constants";
import { useTheme } from "@/context/ThemeContext";
import { useHeroLayout } from "@/context/HeroLayoutContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { profileCardContent } from "@/data/content";
import { CAPTURE_ONLY_LAYER } from "@/lib/captureLayer";
import { drawProfileCardTexture } from "@/lib/profileCardTexture";
import ProfileCard from "@/components/ProfileCard/ProfileCard";
import { useCurlFade } from "./useCurlFade";

interface BioProfileCardProps {
    position: [number, number, number];
    widthPx: number;
    delay?: number;
    startTrigger: boolean;
}

export function BioProfileCard({
    position,
    widthPx,
    delay = 0,
    startTrigger,
}: BioProfileCardProps) {
    const { theme } = useTheme();
    const cardTheme = theme === "Light" ? "light" : "dark";
    const { pxTo3DWidth, pxTo3DHeight } = useHeroLayout();
    const [snapshot, setSnapshot] = useState<CanvasTexture | null>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
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

    useEffect(() => {
        let alive = true;
        let texture: CanvasTexture | null = null;
        drawProfileCardTexture({
            width: CONFIG.profileCard.WIDTH_PX,
            height: CONFIG.profileCard.HEIGHT_PX,
            theme: cardTheme,
            avatarUrl: profileCardContent.avatarUrl,
            name: profileCardContent.name,
            title: profileCardContent.title,
            handle: profileCardContent.handle,
            status: profileCardContent.status,
            contactText: profileCardContent.contactText,
        })
            .then((next) => {
                if (!alive) {
                    next.dispose();
                    return;
                }
                texture = next;
                setSnapshot(next);
            })
            .catch(() => {});
        return () => {
            alive = false;
            texture?.dispose();
        };
    }, [cardTheme]);

    const { WIDTH_PX, HEIGHT_PX } = CONFIG.profileCard;
    const scale = widthPx / WIDTH_PX;
    const worldWidth = widthPx * pxTo3DWidth;
    const worldHeight = HEIGHT_PX * scale * pxTo3DHeight;

    return (
        <group ref={groupRef} position={position}>
            {snapshot && (
                <mesh
                    position={[worldWidth / 2, -worldHeight / 2, 0]}
                    layers-mask={1 << CAPTURE_ONLY_LAYER}
                >
                    <planeGeometry args={[worldWidth, worldHeight]} />
                    <meshBasicMaterial
                        map={snapshot}
                        transparent
                        toneMapped={false}
                        depthWrite={false}
                    />
                </mesh>
            )}
            <Html as="div" className="left-0 top-0">
                <div
                    ref={twinRef}
                    className="pointer-events-auto"
                    style={{ width: widthPx, height: HEIGHT_PX * scale }}
                >
                    <div
                        ref={fadeRef}
                        style={{
                            width: WIDTH_PX,
                            opacity: 0,
                            transform: `scale(${scale})`,
                            transformOrigin: "top left",
                            transition: "opacity 0.35s ease",
                        }}
                    >
                        <ProfileCard
                            avatarUrl={profileCardContent.avatarUrl}
                            name={profileCardContent.name}
                            title={profileCardContent.title}
                            handle={profileCardContent.handle}
                            status={profileCardContent.status}
                            contactText={profileCardContent.contactText}
                            theme={cardTheme}
                            onContactClick={() => {
                                window.location.href = profileCardContent.contactHref;
                            }}
                        />
                    </div>
                </div>
            </Html>
        </group>
    );
}
