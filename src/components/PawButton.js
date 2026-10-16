import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Easing } from 'react-native';
import { C, INK_WIDTH } from '../theme';

const SIZE = 104;

// Hold-to-record button. While recording, the ring grows with the live mic
// level, so the owner can see the pet is being heard.
export default function PawButton({ recording, busy, level, onPressIn, onPressOut, label }) {
  const press = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(press, { toValue: recording ? 1 : 0, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  }, [recording, press]);

  // Mic level (dBFS, about -60 quiet to 0 loud) drives the ring size.
  useEffect(() => {
    const v = recording && typeof level === 'number' ? Math.max(0, Math.min(1, (level + 55) / 50)) : 0;
    Animated.timing(ring, { toValue: v, duration: 90, useNativeDriver: true }).start();
  }, [level, recording, ring]);

  // A slow breathing glow while idle invites a press.
  useEffect(() => {
    if (recording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(idle, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [recording, idle]);

  const ringScale = recording
    ? ring.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.55] })
    : idle.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.12] });
  const ringOpacity = recording ? 0.55 : idle.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] });

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={16}
    >
      <View style={s.wrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            s.ring,
            { backgroundColor: recording ? C.pink : C.butter, opacity: ringOpacity, transform: [{ scale: ringScale }] }
          ]}
        />
        <View style={s.shadow} />
        <Animated.View
          style={[
            s.button,
            {
              backgroundColor: recording ? C.pink : C.butter,
              opacity: busy && !recording ? 0.7 : 1,
              transform: [
                { translateX: press.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) },
                { translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }
              ]
            }
          ]}
        >
          <Text style={s.paw}>🐾</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { width: SIZE + 5, height: SIZE + 5, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, left: 0, top: 0 },
  shadow: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: C.ink, left: 5, top: 5 },
  button: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: INK_WIDTH + 0.5,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  paw: { fontSize: 46 }
});
