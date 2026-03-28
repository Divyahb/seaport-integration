import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "searport frontend",
  description: "Next.js dashboard"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
