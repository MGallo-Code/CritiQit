'use client'

import Link from 'next/link'
import { useCurrentUser } from '@/providers/current-user-provider'
import { Avatar, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const { user, isLoading } = useCurrentUser()
  const username = user?.username ?? ''
  const avatarUrl = user?.avatar_url || '/images/default-avatar.svg'
  const avatarAlt = username
    ? `${username}'s profile image`
    : 'User profile image'

  return (
    <Link className="flex items-center gap-2" href="/protected/profile">
      <Avatar>
        <AvatarImage
          src={avatarUrl}
          alt={avatarAlt}
        />
      </Avatar>
      {username && <p>{username}</p>}
    </Link>
  )
}
