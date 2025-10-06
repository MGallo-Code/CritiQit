'use client'

import { useCurrentUser } from '@/hooks/use-current-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const currentUser = useCurrentUser()
  const profileImage = currentUser?.avatar_url || '/images/default-avatar.svg'
  const username = currentUser?.username || "User Profile Image"

  return (
    <Avatar>
      <p>{username}</p>
      <AvatarImage src={profileImage} alt={username} />
      <AvatarFallback>{username}</AvatarFallback>
    </Avatar>
  )
}
