"use client";

import { FC } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const WalletButton: FC = () => {
    const { connected, publicKey } = useWallet();

    return (
        <div className="flex items-center gap-4">
            {connected && publicKey && (
                <span className="text-sm text-gray-400">
                    {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
            )}
            <WalletMultiButton />
        </div>
    );
};
