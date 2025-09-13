import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, GestureResponderEvent, ActivityIndicator } from 'react-native'

type ButtonProps = {
  title: string
  onPress?: (event: GestureResponderEvent) => void
  disabled?: boolean
  type?: 'solid' | 'outline' | 'clear'
  style?: ViewStyle
  textStyle?: TextStyle
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled,
  type = 'solid',
  style,
  textStyle,
  loading,
}) => {
  const isOutline = type === 'outline'
  const isClear = type === 'clear'
  const containerStyle: ViewStyle[] = [
    styles.button,
    isOutline && styles.buttonOutline,
    isClear && styles.buttonClear,
    disabled && styles.buttonDisabled,
    style as any,
  ]

  const labelStyle: TextStyle[] = [
    styles.buttonText,
    isOutline && styles.buttonTextOutline,
    isClear && styles.buttonTextClear,
    disabled && styles.buttonTextDisabled,
    textStyle as any,
  ]

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.7}
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isOutline || isClear ? primary : '#fff'} />
      ) : (
        <Text style={labelStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const primary = '#2089dc' // RNE default primary

const styles = StyleSheet.create({
  button: {
    backgroundColor: primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: primary,
  },
  buttonClear: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: primary,
  },
  buttonTextClear: {
    color: primary,
  },
  buttonTextDisabled: {
    // keep same color; just reduce opacity via container
  },
})

export default Button

