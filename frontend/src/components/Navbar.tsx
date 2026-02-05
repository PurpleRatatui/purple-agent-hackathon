"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/stake", label: "Stake Knowledge", icon: "📚" },
    { href: "/propose", label: "Propose", icon: "📝" },
    { href: "/query", label: "Ask the Sage", icon: "🔮" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
];

export function Navbar() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 glass">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl">🌭</span>
                            <span className="text-xl font-bold gradient-text">SolSage</span>
                        </Link>

                        {/* Desktop Nav Links */}
                        <div className="hidden md:flex items-center gap-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${pathname === item.href
                                        ? "bg-purple-500/20 text-purple-300"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>

                        {/* Right side: Wallet + Mobile Menu Button */}
                        <div className="flex items-center gap-3">
                            <WalletButton />

                            {/* Mobile Hamburger Button */}
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="Toggle menu"
                            >
                                {isMenuOpen ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Mobile Menu Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-72 z-50 bg-gray-900 border-l border-gray-800 transform transition-transform duration-300 ease-out md:hidden ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full pt-20 px-4">
                    {/* Nav Links */}
                    <div className="flex flex-col gap-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "text-gray-300 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Footer in drawer */}
                    <div className="mt-auto pb-8">
                        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20">
                            <div className="text-sm text-gray-400 mb-2">Protocol Status</div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="text-emerald-400 font-medium">Live on Devnet</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
