import { CanvasTexture, SRGBColorSpace } from "three";

type ProfileCardSnapshot = {
    width: number;
    height: number;
    theme: "light" | "dark";
    avatarUrl: string;
    name: string;
    title: string;
    handle: string;
    status: string;
    contactText: string;
};

const PALETTES = {
    light: { frame: "#fbfbfb", edge: "#e4e4e4", ink: "#111111", muted: "#6b6b6b", tile: "#f0f0f0" },
    dark: { frame: "#1c1c1e", edge: "#2e2e30", ink: "#f2f2f2", muted: "#9a9a9a", tile: "#2a2a2c" },
} as const;

const SCALE = 2;
const PAD = 10;
const STATUS_COLOR = "#34c759";

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

function drawCover(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    alignY: number,
) {
    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    ctx.drawImage(
        image,
        x + (width - drawWidth) / 2,
        y + (height - drawHeight) * alignY,
        drawWidth,
        drawHeight,
    );
}

export async function drawProfileCardTexture(card: ProfileCardSnapshot) {
    const palette = PALETTES[card.theme];
    const [image] = await Promise.all([loadImage(card.avatarUrl), document.fonts.ready]);
    const family =
        getComputedStyle(document.body).getPropertyValue("--font-karla").trim() ||
        "sans-serif";

    const canvas = document.createElement("canvas");
    canvas.width = card.width * SCALE;
    canvas.height = card.height * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    ctx.scale(SCALE, SCALE);

    const { width, height } = card;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, width - 1, height - 1, 30);
    ctx.fillStyle = palette.frame;
    ctx.fill();
    ctx.strokeStyle = palette.edge;
    ctx.stroke();

    const tileWidth = width - PAD * 2;
    const tileHeight = tileWidth * 1.25;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(PAD, PAD, tileWidth, tileHeight, 20);
    ctx.clip();
    ctx.fillStyle = palette.tile;
    ctx.fillRect(PAD, PAD, tileWidth, tileHeight);
    drawCover(ctx, image, PAD, PAD, tileWidth, tileHeight, 1);
    const scrim = ctx.createLinearGradient(0, PAD + tileHeight, 0, PAD + tileHeight * 0.48);
    scrim.addColorStop(0, "rgba(0, 0, 0, 0.6)");
    scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = scrim;
    ctx.fillRect(PAD, PAD, tileWidth, tileHeight);
    ctx.restore();

    const tileBottom = PAD + tileHeight;
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 20px ${family}`;
    ctx.fillText(card.name, PAD + 20, tileBottom - 44);
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = `14px ${family}`;
    ctx.fillText(card.title, PAD + 20, tileBottom - 20);

    const footerCenter = tileBottom + (height - tileBottom) / 2;
    const avatarX = PAD + 20;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + 18, footerCenter, 18, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, image, avatarX, footerCenter - 18, 36, 36, 0);
    ctx.restore();

    const metaX = avatarX + 48;
    ctx.fillStyle = palette.ink;
    ctx.font = `600 14px ${family}`;
    ctx.fillText(`@${card.handle}`, metaX, footerCenter - 3);
    ctx.fillStyle = STATUS_COLOR;
    ctx.beginPath();
    ctx.arc(metaX + 3, footerCenter + 11, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.muted;
    ctx.font = `12.5px ${family}`;
    ctx.fillText(card.status, metaX + 12, footerCenter + 15);

    ctx.font = `600 13px ${family}`;
    const contactWidth = ctx.measureText(card.contactText).width + 50;
    const contactX = width - PAD - 20 - contactWidth;
    ctx.beginPath();
    ctx.roundRect(contactX, footerCenter - 18, contactWidth, 36, 15);
    ctx.fillStyle = palette.tile;
    ctx.fill();
    ctx.strokeStyle = palette.edge;
    ctx.stroke();
    ctx.fillStyle = palette.ink;
    ctx.fillText(card.contactText, contactX + 36, footerCenter + 4.5);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(contactX + 15, footerCenter - 6, 14, 11);
    ctx.beginPath();
    ctx.moveTo(contactX + 15, footerCenter - 6);
    ctx.lineTo(contactX + 22, footerCenter);
    ctx.lineTo(contactX + 29, footerCenter - 6);
    ctx.stroke();

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
}
