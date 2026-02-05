"use client";

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

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl">🌭</span>
                        <span className="text-xl font-bold gradient-text">SolSage</span>
                    </Link>

                    {/* Nav Links */}
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

                    {/* Wallet */}
                    <WalletButton />
                </div>
            </div>
        </nav>
    );
}
