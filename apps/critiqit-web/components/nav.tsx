"use client"

import Link from "next/link";
import { CurrentUserAvatar } from "./current-user-avatar";
import { useCurrentUser } from "@/hooks/use-current-user";

const anonNavItems = [
    { label: "Home", href: "/" },
]

const authNavItems = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/protected" },
    { label: "Profile", href: "/profile" }
]

export function Nav() {
    const currentUser = useCurrentUser();
    const navItems = currentUser ? authNavItems : anonNavItems;
    return (
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                <div className="flex gap-5 items-center font-semibold">
                    <Link href={"/"}>CritiQit</Link>
                </div>
                <div className="flex items-center gap-4">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>{item.label}</Link>
                    ))}
                    <CurrentUserAvatar />
                </div>
            </div>
        </nav>
    );
}