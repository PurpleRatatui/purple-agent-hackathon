"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const navItems = [
    { href: "/propose", label: "Propose" },
    { href: "/query", label: "Query" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/docs", label: "API" },
];

export function Navbar() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo - More Prominent */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                                <div className="relative w-10 h-10 bg-[#0d0d12] rounded-xl flex items-center justify-center border border-white/10">
                                    <span className="text-2xl">🌭</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-white leading-tight">SolSage</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Knowledge Protocol</span>
                            </div>
                        </Link>

                        {/* Desktop Nav Links - Minimal */}
                        <div className="hidden lg:flex items-center">
                            <div className="flex items-center bg-white/5 rounded-full p-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${pathname === item.href
                                            ? "bg-white text-gray-900"
                                            : "text-gray-400 hover:text-white"
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-4">
                            {/* Live indicator - Desktop */}
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs text-emerald-400 font-medium">Devnet</span>
                            </div>

                            <WalletButton />

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                aria-label="Toggle menu"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile Menu */}
            <div
                className={`fixed top-0 right-0 h-full w-80 z-50 bg-[#0d0d12] border-l border-white/5 transform transition-transform duration-300 ease-out lg:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Close button */}
                <button
                    onClick={() => setIsMenuOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex flex-col h-full pt-6 px-6">
                    {/* Logo in drawer */}
                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/5">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center border border-white/10">
                            <span className="text-3xl">🌭</span>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-white">SolSage</div>
                            <div className="text-xs text-gray-500">Knowledge Protocol</div>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="flex flex-col gap-1">
                        <Link
                            href="/"
                            onClick={() => setIsMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === "/"
                                ? "bg-white/10 text-white"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <span className="text-lg">🏠</span>
                            <span className="font-medium">Home</span>
                        </Link>
                        {navItems.map((item) => {
                            const icons: Record<string, string> = {
                                "/propose": "🌭",
                                "/query": "🔮",
                                "/dashboard": "📊",
                                "/docs": "📄"
                            };
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href
                                        ? "bg-white/10 text-white"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <span className="text-lg">{icons[item.href] || "📌"}</span>
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Status card */}
                    <div className="mt-auto pb-8">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-emerald-500/10 border border-white/5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-sm text-white font-medium">Live on Devnet</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Connected to Solana Devnet. Stake knowledge and earn $SAGE tokens.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
