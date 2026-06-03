import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Peer Reviewer — AI Review Panel",
  description:
    "Submit a scientific manuscript and get a realistic, multi-reviewer peer review with an editorial decision — powered by NVIDIA NIM. Built by Albatross Technologies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
