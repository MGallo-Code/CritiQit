import React from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'

type LeftIcon = { type?: string; name?: string }

type Props = TextInputProps & {
  label?: string
  leftIcon?: LeftIcon
}

const iconFromName = (name?: string) => {
  switch (name) {
    case 'envelope':
      return '✉️'
    case 'lock':
      return '🔒'
    default:
      return undefined
  }
}

export const Input: React.FC<Props> = ({ label, leftIcon, style, ...rest }) => {
  const icon = iconFromName(leftIcon?.name)

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrapper}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined, style as any]}
          placeholderTextColor="#9AA0A6"
          {...rest}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
  },
  icon: {
    fontSize: 16,
    marginLeft: 12,
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputWithIcon: {
    paddingLeft: 6,
  },
})

export default Input
