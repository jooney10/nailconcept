import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { getBusiness } from "@/lib/business";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBusiness();
  return {
    title: `${b.name} — Book your appointment`,
    description: b.tagline,
    openGraph: {
      title: b.name,
      description: b.tagline,
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const b = await getBusiness();
  // Inject the editable brand colours as CSS variables so admin changes apply.
  const brandVars = {
    "--brand": b.colorPrimary,
    "--accent": b.colorAccent,
  } as React.CSSProperties;

  return (
    <html lang="en-GB" className={`${fraunces.variable} ${nunito.variable}`}>
      <body style={brandVars}>{children}</body>
    </html>
  );
}
