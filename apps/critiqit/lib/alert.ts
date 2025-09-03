import { Alert as RNAlert, Platform } from 'react-native'

/**
 * Cross-platform alert utility that works on web and mobile
 */
export const Alert = {
  alert: (title: string, message?: string, buttons?: any[], options?: any) => {
    if (Platform.OS === 'web') {
      // For web, use browser's confirm/alert
      const fullMessage = message ? `${title}\n\n${message}` : title
      
      if (buttons && buttons.length > 1) {
        // Use confirm for yes/no type alerts
        const result = window.confirm(fullMessage)
        if (result && buttons[0]?.onPress) {
          buttons[0].onPress()
        } else if (!result && buttons[1]?.onPress) {
          buttons[1].onPress()
        }
      } else {
        // Simple alert
        window.alert(fullMessage)
        if (buttons?.[0]?.onPress) {
          buttons[0].onPress()
        }
      }
    } else {
      // Use React Native's Alert for mobile
      RNAlert.alert(title, message, buttons, options)
    }
  }
}
