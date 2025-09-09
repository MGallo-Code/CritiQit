import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { StyleSheet, View, Image, Button, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system'
import { Alert } from '../lib/alert'
import { useAuth } from '../lib/auth-context'

interface Props {
  size: number
  url: string | null
  onUpload?: (filePath: string) => void
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
  const { session } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const avatarSize = { height: size, width: size }

  useEffect(() => {
    if (url) {
      setAvatarUrl(url) // Use the URL with cache-buster directly from props
    }
  }, [url])

  async function uploadAvatar() {
    if (!onUpload || !session?.user) return

    try {
      setUploading(true)

      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Sorry, we need camera roll permissions to make this work!')
          return
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('User cancelled image picking.')
        return
      }

      const imageUri = result.assets[0].uri
      const context = ImageManipulator.manipulate(imageUri)
      const imageRef = await context.renderAsync()
      const formatted = await imageRef.saveAsync({
        format: SaveFormat.WEBP,
        compress: 0.5,
      })
      const finalUri = formatted.uri
      
      const userId = session.user.id
      const filePath = `${userId}/avatar.webp`

      if (Platform.OS === 'web') {
        // Web: use Supabase client with blob
        const response = await fetch(finalUri)
        const arrayBuffer = await response.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: 'image/webp' })
        
        const { error } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'image/webp',
          })

        if (error) throw error
      } else {
        // Mobile: use Expo FileSystem direct upload
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
        const accessToken = session.access_token
        
        if (!supabaseUrl || !accessToken) {
          throw new Error('Missing Supabase configuration')
        }

        const uploadUrl = `${supabaseUrl}/storage/v1/object/avatars/${filePath}`
        const res = await FileSystem.uploadAsync(uploadUrl, finalUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': 'image/webp',
            'Authorization': `Bearer ${accessToken}`,
            'x-upsert': 'true',
            'Cache-Control': '3600',
          },
        })

        if (res.status !== 200 && res.status !== 201) {
          const message = res.body ? JSON.parse(res.body)?.message : `Upload failed with status ${res.status}`
          throw new Error(message)
        }
      }

      // Call the parent's upload handler with the clean file path
      onUpload(filePath)
    } catch (error) {
      console.error('An error occurred during upload:', error)
      if (error instanceof Error) {
        Alert.alert('Error', error.message)
      } else {
        Alert.alert('Error', 'An unexpected error occurred.')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <View>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          accessibilityLabel="Avatar"
          style={[avatarSize, styles.avatar, styles.image]}
        />
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage]} />
      )}
      {onUpload && (
        <View>
          <Button
            title={uploading ? 'Uploading ...' : 'Upload'}
            onPress={uploadAvatar}
            disabled={uploading}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 5,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  image: {
    objectFit: 'cover',
    paddingTop: 0,
  },
  noImage: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgb(200, 200, 200)',
    borderRadius: 5,
  },
})
