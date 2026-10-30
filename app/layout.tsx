import type { Metadata, Viewport } from "next";
import { MotionProvider } from "@/components/ui/motion-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magnababble",
  description: "The word tile party game. Fill in the blanks, win the crowd.",
};

export const viewport: Viewport = {
  themeColor: "#1e1b4b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-indigo-950 text-white antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
