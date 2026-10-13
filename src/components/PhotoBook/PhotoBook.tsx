"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { CONFIG } from "@/config/constants";
import { photographyContent } from "@/data/content";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { acquireRootScrollLock } from "@/lib/rootScrollLock";
import {
    buildPhotoBookPages,
    pageLabel,
    PhotoBookPageContent,
} from "./PhotoBookPages";
import "./PhotoBook.css";

const B = CONFIG.photoBook;
const pages = buildPhotoBookPages();
const sheetCount = pages.length / 2;

type Side = "left" | "right";

type Drag = {
    id: number;
    startX: number;
    side: Side;
    sheet: number;
    active: boolean;
    progress: number;
};

type PhotoBookProps =
    | { mode: "overlay"; initialFlipped?: number; onClose: () => void }
    | {
          mode: "inline";
          width: number;
          height: number;
          onExpand: (flipped: number) => void;
      };

const sheetTransform = (angle: number) =>
    `perspective(${B.PERSPECTIVE_PX}px) rotateY(${-angle}deg)`;

function fitBook(width: number, height: number, overlay: boolean) {
    const single = width < B.SINGLE_PAGE_BELOW_PX || width < height;
    const heightLimit = overlay ? height * B.MAX_PAGE_HEIGHT_FRACTION : height;
    const pageWidthLimit = single
        ? width *
          (overlay ? B.MAX_SPREAD_WIDTH_FRACTION : B.INLINE_SINGLE_PAGE_WIDTH_FRACTION)
        : (width * (overlay ? B.MAX_SPREAD_WIDTH_FRACTION : 1)) / 2;
    const pageH = Math.max(
        0,
        Math.min(heightLimit, pageWidthLimit * B.PAGE_ASPECT),
    );
    return { single, pageW: pageH / B.PAGE_ASPECT, pageH };
}

const windowSize = () => ({ width: window.innerWidth, height: window.innerHeight });

export function PhotoBook(props: PhotoBookProps) {
    const overlay = props.mode === "overlay";
    const prefersReducedMotion = usePrefersReducedMotion();
    const [viewport, setViewport] = useState(windowSize);
    const [flipped, setFlipped] = useState(
        props.mode === "overlay" ? (props.initialFlipped ?? 0) : 0,
    );
    const [focus, setFocus] = useState<Side>("left");
    const [lifted, setLifted] = useState<Record<number, number>>({});
    const rootRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<HTMLDivElement>(null);
    const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);
    const dragRef = useRef<Drag | null>(null);
    const liftCounterRef = useRef(0);
    const timersRef = useRef(new Set<number>());
    const flipMs = prefersReducedMotion ? 1 : B.FLIP_MS;

    const size = overlay
        ? fitBook(viewport.width, viewport.height, true)
        : fitBook(props.width, props.height - B.CONTROLS_PX, false);

    useEffect(() => {
        if (!overlay) return;
        const onResize = () => setViewport(windowSize());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [overlay]);

    useEffect(() => {
        if (!overlay) return;
        const lease = acquireRootScrollLock(window.scrollY, {
            preventNativeScroll: true,
        });
        const previousFocus = document.activeElement;
        rootRef.current?.focus();
        return () => {
            lease.release();
            if (previousFocus instanceof HTMLElement) previousFocus.focus();
        };
    }, [overlay]);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            for (const timer of timers) window.clearTimeout(timer);
            timers.clear();
        };
    }, []);

    const lift = useCallback(
        (sheet: number) => {
            liftCounterRef.current += 1;
            const z = sheetCount + 2 + liftCounterRef.current;
            setLifted((current) => ({ ...current, [sheet]: z }));
            const timer = window.setTimeout(() => {
                timersRef.current.delete(timer);
                setLifted((current) => {
                    if (current[sheet] !== z) return current;
                    const next = { ...current };
                    delete next[sheet];
                    return next;
                });
            }, flipMs + 60);
            timersRef.current.add(timer);
        },
        [flipMs],
    );

    const canNext = flipped < sheetCount;
    const canPrev = flipped > 0;

    const next = () => {
        if (!canNext) return;
        if (size.single && flipped > 0 && focus === "left") {
            setFocus("right");
            return;
        }
        lift(flipped);
        setFlipped(flipped + 1);
        setFocus("left");
    };

    const prev = () => {
        if (!canPrev) return;
        if (size.single && flipped < sheetCount && focus === "right") {
            setFocus("left");
            return;
        }
        lift(flipped - 1);
        setFlipped(flipped - 1);
        setFocus("right");
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || !bookRef.current) return;
        const rect = bookRef.current.getBoundingClientRect();
        const side: Side =
            event.clientX >= rect.left + rect.width / 2 ? "right" : "left";
        dragRef.current = {
            id: event.pointerId,
            startX: event.clientX,
            side,
            sheet: side === "right" ? flipped : flipped - 1,
            active: false,
            progress: 0,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const sheetEl = sheetRefs.current[drag.sheet];

        if (!drag.active) {
            if (
                size.single ||
                !sheetEl ||
                Math.abs(dx) < B.DRAG_THRESHOLD_PX
            ) {
                return;
            }
            drag.active = true;
            sheetEl.style.transition = "none";
            sheetEl.style.zIndex = String(sheetCount * 4);
        }
        if (!sheetEl) return;

        const travel = (drag.side === "right" ? -dx : dx) / (size.pageW * 1.5);
        drag.progress = Math.min(Math.max(travel, 0), 1);
        const angle =
            drag.side === "right"
                ? drag.progress * 180
                : 180 - drag.progress * 180;
        sheetEl.style.transform = sheetTransform(angle);
    };

    const finishPointer = (
        event: ReactPointerEvent<HTMLDivElement>,
        cancelled: boolean,
    ) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        dragRef.current = null;
        const dx = event.clientX - drag.startX;

        if (drag.active) {
            const sheetEl = sheetRefs.current[drag.sheet];
            const commit = !cancelled && drag.progress > B.DRAG_COMMIT_FRACTION;
            const forward = drag.side === "right";
            const endsFlipped = forward === commit;
            if (sheetEl) {
                sheetEl.style.transition = "";
                sheetEl.style.transform = sheetTransform(endsFlipped ? 180 : 0);
            }
            lift(drag.sheet);
            if (commit) {
                setFlipped(forward ? drag.sheet + 1 : drag.sheet);
                setFocus(forward ? "left" : "right");
            }
            return;
        }

        if (cancelled) return;
        const swipe = Math.abs(dx) >= B.DRAG_THRESHOLD_PX * 6;
        if (size.single && swipe) {
            if (dx < 0) next();
            else prev();
            return;
        }
        if (Math.abs(dx) >= B.DRAG_THRESHOLD_PX) return;
        const stageRect = event.currentTarget.getBoundingClientRect();
        const forward = size.single
            ? event.clientX >= stageRect.left + stageRect.width / 2
            : drag.side === "right";
        if (forward) next();
        else prev();
    };

    const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape" && props.mode === "overlay") {
            event.preventDefault();
            props.onClose();
        } else if (event.key === "ArrowRight" || event.key === "PageDown") {
            event.preventDefault();
            next();
        } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault();
            prev();
        }
    };

    const halfPage = size.pageW / 2;
    const shift =
        flipped === 0
            ? -halfPage
            : flipped === sheetCount
              ? halfPage
              : size.single
                ? focus === "left"
                    ? halfPage
                    : -halfPage
                : 0;

    const leftPage = pages[flipped * 2 - 1];
    const rightPage = pages[flipped * 2];
    const status =
        flipped === 0
            ? pageLabel(pages[0])
            : flipped === sheetCount
              ? pageLabel(pages[pages.length - 1])
              : pageLabel(size.single && focus === "left" ? leftPage : rightPage);

    const vars = {
        "--pb-page-w": `${size.pageW}px`,
        "--pb-page-h": `${size.pageH}px`,
        "--pb-flip-ms": `${flipMs}ms`,
    } as CSSProperties;

    const stage = (
        <div
            className={`photo-book-stage${overlay ? "" : " photo-book-stage--inline"}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(event) => finishPointer(event, false)}
            onPointerCancel={(event) => finishPointer(event, true)}
        >
            <div
                ref={bookRef}
                className="photo-book-book"
                style={{ transform: `translateX(${shift}px)` }}
            >
                <div
                    className="photo-book-block photo-book-block--left"
                    style={{ opacity: flipped > 0 ? 1 : 0 }}
                />
                <div
                    className="photo-book-block photo-book-block--right"
                    style={{ opacity: flipped < sheetCount ? 1 : 0 }}
                />
                {Array.from({ length: sheetCount }, (_, index) => {
                    const isFlipped = index < flipped;
                    const front = pages[index * 2];
                    const back = pages[index * 2 + 1];
                    const loadImages =
                        Math.abs(index - flipped) <= B.LOAD_RADIUS_SHEETS;
                    return (
                        <div
                            key={index}
                            ref={(element) => {
                                sheetRefs.current[index] = element;
                            }}
                            className="photo-book-sheet"
                            style={{
                                transform: sheetTransform(isFlipped ? 180 : 0),
                                zIndex:
                                    lifted[index] ??
                                    (isFlipped ? index + 1 : sheetCount - index + 1),
                            }}
                        >
                            <div
                                className={`photo-book-face photo-book-face--front${front.kind === "cover" ? " photo-book-face--cover" : ""}`}
                                aria-hidden={index !== flipped}
                            >
                                <PhotoBookPageContent
                                    page={front}
                                    folio={index * 2}
                                    side="right"
                                    loadImages={loadImages}
                                />
                            </div>
                            <div
                                className="photo-book-face photo-book-face--back"
                                aria-hidden={index !== flipped - 1}
                            >
                                <PhotoBookPageContent
                                    page={back}
                                    folio={index * 2 + 1}
                                    side="left"
                                    loadImages={loadImages}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const navigation = (
        <>
            <button
                type="button"
                className="photo-book-button"
                onClick={prev}
                disabled={!canPrev}
            >
                ← Previous
            </button>
            <span className="photo-book-status" aria-live="polite">
                {status}
            </span>
            <button
                type="button"
                className="photo-book-button"
                onClick={next}
                disabled={!canNext}
            >
                {flipped === 0 ? "Open" : "Next"} →
            </button>
        </>
    );

    const hint = size.single
        ? "Tap a page or swipe to turn it"
        : "Click a page or drag it to turn · ← → keys";

    if (props.mode === "inline") {
        return (
            <div
                ref={rootRef}
                className="photo-book-inline"
                role="group"
                aria-roledescription="photo book"
                aria-label={photographyContent.bookTitle}
                tabIndex={0}
                onKeyDown={onKeyDown}
                style={{ ...vars, width: props.width, height: props.height }}
            >
                <div
                    className="photo-book-inline__viewport"
                    style={{ height: size.pageH }}
                >
                    {stage}
                </div>
                <div className="photo-book-inline__controls">
                    {navigation}
                    <button
                        type="button"
                        className="photo-book-button photo-book-inline__expand"
                        onClick={() => props.onExpand(flipped)}
                        aria-label="Open the book full screen"
                        title={hint}
                    >
                        ⤢ Full screen
                    </button>
                </div>
            </div>
        );
    }

    return createPortal(
        <div
            ref={rootRef}
            className="photo-book-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={photographyContent.bookTitle}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            onPointerDown={(event) => {
                if (event.target === event.currentTarget) props.onClose();
            }}
            style={vars}
        >
            <div className="photo-book-bar">
                <span className="photo-book-bar__title">
                    {photographyContent.heading} · {photographyContent.bookTitle}
                </span>
                <button
                    type="button"
                    className="photo-book-button"
                    onClick={props.onClose}
                    aria-label="Close the book"
                >
                    ✕
                </button>
            </div>
            {stage}
            <p className="photo-book-hint">{hint}</p>
            <div className="photo-book-controls">{navigation}</div>
        </div>,
        document.body,
    );
}
