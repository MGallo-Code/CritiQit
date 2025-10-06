'use client'

import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const currentUser = useCurrentUser()
  const profileImage = currentUser?.avatar_url || '/images/default-avatar.svg'
  const username = currentUser?.username || ""

  return (
    <Avatar>
      {username && <p>{username}</p>}
      <AvatarImage src={profileImage} alt={username || "User Profile Image"} />
      <AvatarFallback>{username}</AvatarFallback>
    </Avatar>
  )
}
