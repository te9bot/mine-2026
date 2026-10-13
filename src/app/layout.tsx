import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
    title: "Talha Zobayed Tanim — Frontend Engineer & Data Analyst",
    description: "Portfolio of Talha Zobayed Tanim, a frontend engineer and data analyst from Dhaka with a visual designer's eye.",
};

const karla = localFont({
    src: [
        {
            path: "../../public/fonts/Karla-ExtraBold.ttf",
            weight: "800",
            style: "normal",
        },
        {
            path: "../../public/fonts/Karla-Light.ttf",
            weight: "300",
            style: "normal",
        },
    ],
    variable: "--font-karla",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="no-js" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `document.documentElement.classList.replace('no-js', 'js');
var stored = null;
try { stored = localStorage.getItem('folio-theme'); } catch {}
var theme = stored === 'Light' || stored === 'Dark'
  ? stored
  : (matchMedia('(prefers-color-scheme: light)').matches ? 'Light' : 'Dark');
document.documentElement.dataset.theme = theme.toLowerCase();`,
                    }}
                />
            </head>
            <body className={`antialiased ${karla.variable}`}>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
