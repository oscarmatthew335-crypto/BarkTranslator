import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH, R } from '../theme';

// A card with a deep indigo ink outline and a hard, offset shadow behind it.
export function Sticker({ children, color = C.paper, radius = R.modal, offset = 4, style, innerStyle }) {
  return (
    <View style={[{ paddingRight: offset, paddingBottom: offset }, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { top: offset, left: offset, backgroundColor: C.shadow, borderRadius: radius }
        ]}
      />
      <View
        style={[
          { backgroundColor: color, borderRadius: radius, borderWidth: INK_WIDTH, borderColor: C.ink, overflow: 'hidden' },
          innerStyle
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// A tactile cartoon pill button that squashes down onto its hard offset shadow when pressed.
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
        <View style={[StyleSheet.absoluteFill, { top: offset, left: offset, backgroundColor: C.shadow, borderRadius: R.pill }]} />
        <Animated.View
          style={{
            backgroundColor: color,
            borderRadius: R.pill,
            borderWidth: INK_WIDTH,
            borderColor: C.ink,
            borderBottomWidth: INK_WIDTH + 1,
            paddingVertical: small ? 7 : 11,
            paddingHorizontal: small ? 14 : 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            overflow: 'hidden',
            transform: [
              { translateX: press.interpolate({ inputRange: [0, 1], outputRange: [0, offset] }) },
              { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, offset] }) }
            ]
          }}
        >
          {/* Glossy upper inner highlight strip */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 2,
              left: 14,
              right: 14,
              height: 4,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.42)'
            }}
          />
          {emoji ? <Text style={{ fontSize: small ? 14 : 17 }}>{emoji}</Text> : null}
          {label ? (
            <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: F.bold, fontSize: small ? 13 : 16, color: textColor }}>
              {label}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </Pressable>
  );
}

export function ScreenTitle({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: F.bold, fontSize: 28, color: C.ink, lineHeight: 33 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.inkSoft, marginTop: 4, lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// True when the phone's "reduce motion" accessibility setting is on.
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => alive && setReduce(Boolean(v))).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduce(Boolean(v)));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}
