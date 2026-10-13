/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { photographyContent, type PhotoBookPhoto } from "@/data/content";

const { photos } = photographyContent;

const WALL_ROWS = 6;
const WALL_ROW_LENGTH = 8;
const WALL_STRIDE = 3;
const thumbOf = (src: string) =>
    src.replace("/photography/", "/photography/thumbs/");
const wallRows = Array.from({ length: WALL_ROWS }, (_, row) => {
    const tiles = Array.from(
        { length: WALL_ROW_LENGTH },
        (_, index) =>
            thumbOf(photos[(row * 4 + index * WALL_STRIDE) % photos.length].src),
    );
    return [...tiles, ...tiles];
});

export type PhotoBookPage =
    | { kind: "cover" }
    | { kind: "foreword" }
    | { kind: "title" }
    | { kind: "story"; photo: PhotoBookPhoto; plate: number }
    | { kind: "photo"; photo: PhotoBookPhoto; plate: number }
    | { kind: "closing" }
    | { kind: "colophon" }
    | { kind: "blank" }
    | { kind: "back" };

export function buildPhotoBookPages(): PhotoBookPage[] {
    const pages: PhotoBookPage[] = [
        { kind: "cover" },
        { kind: "foreword" },
        { kind: "title" },
    ];
    photos.forEach((photo, index) => {
        pages.push({ kind: "story", photo, plate: index + 1 });
        pages.push({ kind: "photo", photo, plate: index + 1 });
    });
    pages.push({ kind: "closing" }, { kind: "colophon" });
    if (pages.length % 2 === 0) pages.push({ kind: "blank" });
    pages.push({ kind: "back" });
    return pages;
}

const plateLabel = (plate: number) => String(plate).padStart(2, "0");

const chapters = photos.reduce<{ name: string; first: number; last: number }[]>(
    (list, photo, index) => {
        const last = list.at(-1);
        if (last && last.name === photo.chapter) last.last = index + 1;
        else list.push({ name: photo.chapter, first: index + 1, last: index + 1 });
        return list;
    },
    [],
);

export function pageLabel(page: PhotoBookPage): string {
    switch (page.kind) {
        case "cover":
            return "Cover";
        case "back":
            return "Back cover";
        case "foreword":
        case "title":
            return "Foreword";
        case "story":
        case "photo":
            return `Plate ${plateLabel(page.plate)} of ${photos.length}`;
        default:
            return "The end";
    }
}

export function PhotoBookCover({ hint }: { hint?: ReactNode }) {
    return (
        <div className="photo-book-cover">
            <div className="photo-book-cover__mosaic" aria-hidden>
                <div className="photo-book-cover__wall">
                    {wallRows.map((tiles, row) => (
                        <div
                            key={row}
                            className="photo-book-cover__row"
                            style={{ "--row": row } as CSSProperties}
                        >
                            {tiles.map((src, index) => (
                                <img
                                    key={index}
                                    src={src}
                                    alt=""
                                    draggable={false}
                                    decoding="async"
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <span className="photo-book-cover__kicker">
                {photographyContent.bookSubtitle}
            </span>
            <span className="photo-book-cover__title">
                {photographyContent.bookTitle}
            </span>
            <span className="photo-book-cover__byline">
                {photographyContent.byline}
            </span>
            {hint && <span className="photo-book-cover__hint">{hint}</span>}
        </div>
    );
}

export function PhotoBookPageContent({
    page,
    folio,
    side,
    loadImages,
}: {
    page: PhotoBookPage;
    folio: number;
    side: "left" | "right";
    loadImages: boolean;
}) {
    const folioClass = `photo-book-folio${side === "right" ? " photo-book-folio--right" : ""}`;

    switch (page.kind) {
        case "cover":
            return <PhotoBookCover hint={`${photographyContent.openLabel} →`} />;
        case "back":
            return (
                <div className="photo-book-cover photo-book-cover--back">
                    <span className="photo-book-cover__kicker">
                        {photos.length} photographs
                    </span>
                    <span className="photo-book-cover__title">
                        {photographyContent.bookTitle}
                    </span>
                    <span className="photo-book-cover__byline">
                        {photographyContent.byline}
                    </span>
                </div>
            );
        case "foreword":
            return (
                <div className="photo-book-page">
                    <span className="photo-book-kicker">Foreword</span>
                    <div className="photo-book-rule" />
                    {photographyContent.foreword.map((paragraph) => (
                        <p key={paragraph} className="photo-book-copy">
                            {paragraph}
                        </p>
                    ))}
                    <span className="photo-book-signature">
                        {photographyContent.photographer}
                    </span>
                    <span className={folioClass}>{folio}</span>
                </div>
            );
        case "title":
            return (
                <div className="photo-book-page photo-book-centered">
                    <h2 className="photo-book-display">
                        {photographyContent.bookTitle}
                    </h2>
                    <span className="photo-book-byline">
                        {photographyContent.byline}
                    </span>
                    <ul className="photo-book-contents">
                        {chapters.map((chapter) => (
                            <li key={chapter.name}>
                                <span>{chapter.name}</span>
                                <span>
                                    {plateLabel(chapter.first)}–{plateLabel(chapter.last)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <span className={folioClass}>{folio}</span>
                </div>
            );
        case "story":
            return (
                <div className="photo-book-page">
                    <span className="photo-book-kicker">{page.photo.chapter}</span>
                    <span className="photo-book-plate">{plateLabel(page.plate)}</span>
                    <h3 className="photo-book-title">{page.photo.title}</h3>
                    <div className="photo-book-rule" />
                    <p className="photo-book-copy">{page.photo.description}</p>
                    <span className={folioClass}>{folio}</span>
                </div>
            );
        case "photo":
            return (
                <div className="photo-book-page">
                    <figure className="photo-book-figure">
                        <div className="photo-book-figure__frame">
                            {loadImages && (
                                <img
                                    src={page.photo.src}
                                    alt={page.photo.alt}
                                    decoding="async"
                                    draggable={false}
                                />
                            )}
                        </div>
                        <figcaption>
                            No. {plateLabel(page.plate)} · {page.photo.title}
                        </figcaption>
                    </figure>
                    <span className={folioClass}>{folio}</span>
                </div>
            );
        case "closing":
            return (
                <div className="photo-book-page photo-book-centered">
                    {photographyContent.closing.map((line, index) => (
                        <p
                            key={line}
                            className={index === 0 ? "photo-book-display" : "photo-book-copy"}
                            style={index === 0 ? { fontSize: "7cqw", marginBottom: "5cqw" } : undefined}
                        >
                            {line}
                        </p>
                    ))}
                    <span className="photo-book-signature">
                        {photographyContent.photographer}
                    </span>
                </div>
            );
        case "colophon":
            return (
                <div className="photo-book-page photo-book-centered">
                    <span className="photo-book-kicker">Colophon</span>
                    <div className="photo-book-rule" />
                    <p className="photo-book-copy">
                        {photographyContent.bookTitle}. {photos.length} photographs,
                        most of them made along the Padma near Bheramara, Bangladesh.
                    </p>
                </div>
            );
        default:
            return null;
    }
}
