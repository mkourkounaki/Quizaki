import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';

export function PrimaryButton({
  title,
  onPress,
  variant = 'yellow',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'yellow' | 'blue' | 'red' | 'green';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'yellow'
      ? colors.yellow
      : variant === 'blue'
        ? colors.blue
        : variant === 'red'
          ? colors.red
          : colors.green;
  const labelColor = variant === 'yellow' ? colors.buttonTextOnYellow : colors.buttonTextOnTint;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.text, { color: labelColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.button,
    borderWidth: 3,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  text: {
    fontSize: 18,
    fontWeight: '800',
  },
});
