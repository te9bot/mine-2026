import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Talha Zobayed Tanim — Frontend Engineer & Data Analyst";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
    const karla = await readFile(path.join(process.cwd(), "public", "fonts", "Karla-ExtraBold.ttf"));

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 80,
                    background: "#0b0b0c",
                    color: "#f4f4f2",
                    fontFamily: "Karla",
                }}
            >
                <div style={{ display: "flex", fontSize: 34, color: "#8a8a86" }}>talha.cloud</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 108, lineHeight: 1.05 }}>Talha Zobayed Tanim</div>
                    <div style={{ display: "flex", fontSize: 44, marginTop: 28, color: "#b8b8b3" }}>
                        Frontend Engineer & Data Analyst
                    </div>
                </div>
                <div style={{ display: "flex", fontSize: 30, color: "#8a8a86" }}>Dhaka, Bangladesh</div>
            </div>
        ),
        { ...size, fonts: [{ name: "Karla", data: karla, weight: 800, style: "normal" }] },
    );
}
