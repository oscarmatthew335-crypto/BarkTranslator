import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { useReduceMotion } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// A ring around the paw that fills as the owner teaches Pawlingo, with a
// badge counting down to the next bond level. It sweeps and flashes when it
// moves, and bursts when a level is reached.
export default function ProgressRing({ bond, size = 128, stroke = 8, children }) {
  const reduceMotion = useReduceMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = useRef(new Animated.Value(bond?.fraction || 0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(1)).current;
  const prev = useRef(bond);

  useEffect(() => {
    if (!bond) return;
    const before = prev.current;
    prev.current = bond;
    const moved = before && (before.level !== bond.level || before.remaining !== bond.remaining);
    const levelUp = before && bond.level > before.level;
    if (reduceMotion || !moved) {
      fill.setValue(bond.fraction);
      return;
    }
    if (levelUp) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      // On a level up the ring completes first, then starts the new level.
      ...(levelUp ? [Animated.timing(fill, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false })] : []),
      Animated.parallel([
        Animated.timing(fill, {
          toValue: bond.fraction,
          duration: levelUp ? 0 : 700,
          delay: levelUp ? 250 : 0,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false
        }),
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: levelUp ? 900 : 500, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.spring(badge, { toValue: levelUp ? 1.5 : 1.3, useNativeDriver: true, speed: 40, bounciness: 14 }),
          Animated.spring(badge, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 })
        ])
      ])
    ]).start();
  }, [bond, reduceMotion, fill, flash, badge]);

  // A slow nudge on the badge when only one or two answers are left.
  useEffect(() => {
    if (!bond || bond.remaining > 2 || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(badge, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(badge, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1600)
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bond?.remaining, reduceMotion, badge]);

  const offset = fill.interpolate({ inputRange: [0, 1], outputRange: [circ, 0] });
  const label = bond ? `${bond.remaining} more to the next level` : undefined;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {bond && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: size / 2,
                backgroundColor: C.mint,
                opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
                transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }]
              }
            ]}
          />
          <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(36,22,74,0.12)" strokeWidth={stroke} fill="none" />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={C.mint}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circ} ${circ}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </>
      )}
      {children}
      {bond && (
        <Animated.View
          pointerEvents="none"
          accessible
          accessibilityLabel={label}
          style={[s.badge, { transform: [{ scale: badge }] }]}
        >
          <Text style={s.badgeNum} maxFontSizeMultiplier={1.1}>
            {bond.needsContext ? '!' : bond.remaining}
          </Text>
          <Text style={s.badgeSmall} maxFontSizeMultiplier={1.1}>
            {bond.needsContext ? 'new spot' : 'to go'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -16,
    top: -10,
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 4,
    backgroundColor: C.butter,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeNum: { fontFamily: F.bold, fontSize: 17, lineHeight: 19, color: C.ink },
  badgeSmall: { fontFamily: F.semibold, fontSize: 9, lineHeight: 10, color: C.ink }
});
