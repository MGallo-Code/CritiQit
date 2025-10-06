import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface User {
  avatar_url: string | null,
  username: string | null,
  full_name: string | null
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      const { data, error } = await createClient().auth.getSession()
      if (error) {
        console.error(error)
      }

      const userId = data.session?.user.user_metadata.sub

      const { data: userProfile, error: userProfileError } = await createClient().from('profiles').select('*').eq('id', userId).single()

      if (userProfileError) {
        console.error(userProfileError)
      }

  
      const user = {
        avatar_url: userProfile.avatar_url ?? null,
        username: userProfile.username ?? null,
        full_name: userProfile.full_name ?? null
      }

      setUser(user)
    }
    fetchUserImage()
  }, [])

  return user
}
