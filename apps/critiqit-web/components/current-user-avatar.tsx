'use client'

import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const currentUser = useCurrentUser()
  const profileImage = currentUser?.avatar_url || '/images/default-avatar.svg'
  const username = currentUser?.username || ""

  return (
      <a className="flex items-center gap-2" href="/profile">
        <Avatar>
          <AvatarImage src={profileImage} alt={username || "User Profile Image"} />
          <AvatarFallback>{username}</AvatarFallback>
        </Avatar>
        {username && <p>{username}</p>}
      </a>
  )
}
