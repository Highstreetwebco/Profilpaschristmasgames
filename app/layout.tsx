import type { Metadata } from "next";
import "./game.css";
import "./screen.css";
import "./laptop.css";
import "./briefing.css";

export const metadata: Metadata = {
  title: "Profilpas 2026 Christmas Games",
  description: "Four players. One ringmaster. The Profilpas Christmas games room.",
  icons: {
    icon: "/assets/favicon.svg",
    shortcut: "/assets/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
