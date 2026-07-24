import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Lyniq — The Network",
  description: "A cyberpunk community platform. Discuss, share, connect.",
  metadataBase: new URL("https://lyniq.net"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
          <footer className="border-t border-cyber-border mt-16 py-8 text-center text-cyber-muted text-sm">
            <p className="font-display tracking-widest text-cyber-cyan/60">
              LYNIQ.NET
            </p>
            <p className="mt-2">Built for the network.</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
