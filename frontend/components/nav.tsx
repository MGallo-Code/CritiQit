"use client"

import Link from "next/link";
import { useCurrentUser } from '@/providers/current-user-provider'
import { CurrentUserAvatar } from '@/components/current-user-avatar'


const anonNavItems = [
    { label: "Home", href: "/" },
]

const authNavItems = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/protected/dashboard" }
]

export function Nav() {
    const { user } = useCurrentUser();
    const navItems = user ? authNavItems : anonNavItems;

    const profileItem = user ? (
        <CurrentUserAvatar />
    ) : (
        <Link href="/auth/login" className="px-2 sm:px-3 py-2 min-h-[44px] flex items-center">
            Sign in
        </Link>
    )

    return (
        <nav className="w-full flex justify-center border-b border-border bg-background h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 px-4 sm:px-5 text-base">
                <Link href="/" className="font-bold text-lg py-2">
                    CritiQit
                </Link>
                <div className="flex items-center gap-1 sm:gap-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="px-2 sm:px-3 py-2 min-h-[44px] flex items-center"
                        >
                            {item.label}
                        </Link>
                    ))}
                    {profileItem}
                </div>
            </div>
        </nav>
    );
}
