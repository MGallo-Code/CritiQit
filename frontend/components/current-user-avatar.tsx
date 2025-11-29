'use client'

import Link from 'next/link'
import { useCurrentUser } from '@/providers/current-user-provider'
import { AvatarDisplay } from '@/components/avatar/avatar-display'

export const CurrentUserAvatar = () => {
  const { user, isLoading } = useCurrentUser()

  if (!user) return null

  return (
    <Link className="flex items-center gap-2" href="/protected/profile">
      <AvatarDisplay
        profile={{
          avatar_url: user.avatar_url,
          avatar_preset_id: user.avatar_preset_id,
          avatar_background_color: user.avatar_background_color,
          username: user.username || 'User',
        }}
        size="sm"
      />
      {user.username && <p>{user.username}</p>}
    </Link>
  )
}
