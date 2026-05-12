import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magnababble",
  description: "The word tile party game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-indigo-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
