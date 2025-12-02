'use client'

import Link from 'next/link'
import { useCurrentUser } from '@/providers/current-user-provider'
import { AvatarDisplay } from '@/components/avatar/avatar-display'

export const CurrentUserAvatar = () => {
  const { user } = useCurrentUser()

  if (!user) return null

  return (
    <Link
      className="flex items-center gap-2 px-2 sm:px-3 py-2 min-h-[44px]"
      href="/protected/profile"
    >
      <AvatarDisplay
        profile={{
          avatar_url: user.avatar_url,
          avatar_preset_index: user.avatar_preset_index,
          avatar_background_color: user.avatar_background_color,
          username: user.username || 'User',
        }}
        size="sm"
      />
      {user.username && <p className="text-base">{user.username}</p>}
    </Link>
  )
}
