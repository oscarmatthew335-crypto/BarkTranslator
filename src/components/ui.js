import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';

// A card with an ink outline and a hard, offset ink shadow behind it.
export function Sticker({ children, color = C.paper, radius = 20, offset = 4, style, innerStyle }) {
  return (
    <View style={[{ paddingRight: offset, paddingBottom: offset }, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { top: offset, left: offset, backgroundColor: C.ink, borderRadius: radius }
        ]}
      />
      <View
        style={[
          { backgroundColor: color, borderRadius: radius, borderWidth: INK_WIDTH, borderColor: C.ink },
          innerStyle
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// A sticker that squashes down onto its shadow when pressed.
export function StickerButton({ label, emoji, onPress, color = C.butter, small, style, disabled, textColor = C.ink }) {
  const press = useRef(new Animated.Value(0)).current;
  const offset = small ? 3 : 4;
  const animate = (to) =>
    Animated.spring(press, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        animate(1);
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => animate(0)}
      onPress={onPress}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={{ paddingRight: offset, paddingBottom: offset }}>
        <View style={[StyleSheet.absoluteFill, { top: offset, left: offset, backgroundColor: C.ink, borderRadius: 999 }]} />
        <Animated.View
          style={{
            backgroundColor: color,
            borderRadius: 999,
            borderWidth: INK_WIDTH,
            borderColor: C.ink,
            paddingVertical: small ? 7 : 11,
            paddingHorizontal: small ? 12 : 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transform: [
              { translateX: press.interpolate({ inputRange: [0, 1], outputRange: [0, offset] }) },
              { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, offset] }) }
            ]
          }}
        >
          {emoji ? <Text style={{ fontSize: small ? 14 : 17 }}>{emoji}</Text> : null}
          {label ? (
            <Text style={{ fontFamily: F.semibold, fontSize: small ? 13 : 16, color: textColor }}>{label}</Text>
          ) : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}

export function ScreenTitle({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: F.bold, fontSize: 30, color: C.ink, lineHeight: 34 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontFamily: F.regular, fontSize: 15, color: C.inkSoft, marginTop: 4, lineHeight: 21 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
