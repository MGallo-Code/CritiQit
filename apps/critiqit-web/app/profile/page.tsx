'use client'

import Link from 'next/link'
import { useCurrentUser } from '@/providers/current-user-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThemeSwitcher } from '@/components/auth/theme-switcher'
import { LogoutButton } from '@/components/auth/logout-button'

const ProfilePage = () => {
  const { user, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <section className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">You&apos;re signed out</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your profile and account preferences.
          </p>
          <Link
            href="/auth/login"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Go to sign in
          </Link>
        </div>
      </section>
    )
  }

  const username = user.username
  const email = user.email
  const fullName = user.full_name ?? 'Not Set'
  const avatarAlt = username
    ? `${username}'s profile image`
    : 'User profile image'

  return (
    <section className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-3xl flex-col gap-10 rounded-lg border border-border bg-background p-8 shadow-sm">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={user.avatar_url ?? undefined}
                alt={avatarAlt}
              />
            </Avatar>
            <div className="flex flex-col gap-1 p-5">
              <h1 className="text-3xl font-semibold"><span className="text-2xl text-muted-foreground font-light">@</span>{username}</h1>
            </div>
          </div>
        </header>

        <section className="grid gap-6 rounded-lg border border-border/70 p-6">
          <h2 className="text-lg font-semibold">Profile Information</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Username
              </dt>
              <dd className="text-sm font-medium">@{username}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Email
              </dt>
              <dd className="text-sm font-medium">{email}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold uppercase text-muted-foreground">
                Full name
              </dt>
              <dd className="text-sm font-medium">{fullName}</dd>
            </div>
          </dl>
        </section>

        <div className="flex justify-end">
          <LogoutButton />
        </div>
      </div>
    </section>
  )
}

export default ProfilePage
