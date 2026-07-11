import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brújula v3",
  description: "Simulador de escenarios con Ollama local"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
