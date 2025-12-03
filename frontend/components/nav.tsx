"use client"

import { useState } from "react"
import Link from "next/link"
import { useCurrentUser } from '@/providers/current-user-provider'
import { CurrentUserAvatar } from '@/components/current-user-avatar'
import { AvatarDisplay } from '@/components/avatar/avatar-display'
import { Menu, X, Home, LayoutDashboard, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
} from "@/components/ui/drawer"

const anonNavItems = [
    { label: "Home", href: "/", icon: Home },
]

const authNavItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Dashboard", href: "/protected/dashboard", icon: LayoutDashboard }
]

export function Nav() {
    const { user } = useCurrentUser();
    const navItems = user ? authNavItems : anonNavItems;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Desktop profile/sign-in item
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

                {/* Desktop Navigation - hidden below md, flex at md+ */}
                <div className="hidden md:flex items-center gap-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="px-3 py-2 min-h-[44px] flex items-center hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                        >
                            {item.label}
                        </Link>
                    ))}
                    {profileItem}
                </div>

                {/* Mobile Navigation - flex below md, hidden at md+ */}
                <div className="flex md:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                </div>

                {/* Mobile Menu Drawer */}
                <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <DrawerContent className="max-h-[85vh] overflow-hidden flex flex-col">
                        <DrawerHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b border-border pb-4">
                            <DrawerTitle className="text-xl font-bold">Menu</DrawerTitle>
                            <DrawerClose asChild>
                                <Button variant="ghost" size="icon" className="h-11 w-11 focus-visible:ring-2 focus-visible:ring-primary">
                                    <X className="h-6 w-6" />
                                    <span className="sr-only">Close menu</span>
                                </Button>
                            </DrawerClose>
                        </DrawerHeader>

                        <div className="flex flex-col p-4 pb-8 gap-3 overflow-y-auto flex-1">
                            {/* User Profile Section (when logged in) */}
                            {user && (
                                <Link
                                    href="/protected/profile"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-4 px-4 py-4 rounded-lg bg-card/50 hover:bg-muted active:bg-muted transition-colors min-h-[72px] mb-3 border border-border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    <AvatarDisplay
                                        profile={{
                                            avatar_url: user.avatar_url,
                                            avatar_preset_index: user.avatar_preset_index,
                                            avatar_background_color: user.avatar_background_color,
                                            username: user.username ?? '',
                                        }}
                                        size="md"
                                        className="h-12 w-12"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-lg font-medium">
                                            {user.username || 'Your Profile'}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            View profile
                                        </span>
                                    </div>
                                </Link>
                            )}

                            {/* Navigation Items */}
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-4 px-4 py-4 text-lg rounded-lg hover:bg-muted active:bg-muted transition-colors min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    >
                                        <Icon className="h-6 w-6 text-muted-foreground" />
                                        {item.label}
                                    </Link>
                                );
                            })}

                            {/* Sign In (when not logged in) */}
                            {!user && (
                                <Link
                                    href="/auth/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-4 px-4 py-4 text-lg font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-colors min-h-[56px] mt-3 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                    <LogIn className="h-6 w-6" />
                                    Sign in
                                </Link>
                            )}
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </nav>
    );
}
