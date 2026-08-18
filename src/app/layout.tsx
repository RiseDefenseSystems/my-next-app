import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revbot RAG AI | Rise Defense Systems - RDS RevOps",
  description: "AI-Powered Revenue Operations RAG Assistant backed by Neon Postgres & pgvector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#060c18] text-slate-100 selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
