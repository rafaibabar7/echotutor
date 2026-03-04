// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoTutor — AI-Powered Perioperative Echocardiography Education",
  description:
    "An AI educational assistant for TEE and echocardiography, developed for the Valve Research Group at BIDMC, Harvard Medical School.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ background: "#F9FAFB" }}>{children}</body>
    </html>
  );
}