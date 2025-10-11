'use client'

import { useCurrentUser } from '@/providers/current-user-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Component to display current user's avatar + name
export const CurrentUserAvatar = () => {
  // get current user's data and loading state
  const { user, isLoading } = useCurrentUser()
  const profileImage = user?.avatar_url || '/images/default-avatar.svg'
  const displayName = user?.username || ''

  return (
    <a className="flex items-center gap-2" href="/profile">
      <Avatar>
        <AvatarImage src={profileImage} alt={displayName || "User Profile Image"} />
        <AvatarFallback>{displayName}</AvatarFallback>
      </Avatar>
      {!isLoading && displayName && <p>{displayName}</p>}
    </a>
  )
}
