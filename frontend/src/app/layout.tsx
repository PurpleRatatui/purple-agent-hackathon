import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SolSage - Knowledge Pays",
  description: "The Solana protocol where knowledge pays. Stake expertise. Get paid when it's used. Attribution on-chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0F0F0F]">
        <WalletContextProvider>
          <Navbar />
          <main className="pt-16">{children}</main>
        </WalletContextProvider>
      </body>
    </html>
  );
}
