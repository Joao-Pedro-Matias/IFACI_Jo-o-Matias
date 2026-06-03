import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IoT HMI Dashboard",
  description: "Human Machine Interface — Monitoramento de Sensores IoT",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
