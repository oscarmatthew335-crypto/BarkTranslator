import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { C, F, INK_WIDTH } from '../theme';

// The comic speech bubble that pops onto the pet. `size` scales the text for
// the on-screen version vs. the share card.
export default function SpeechBubble({ name, face, text, footer, animateKey, size = 'screen', children }) {
  const pop = useRef(new Animated.Value(animateKey ? 0 : 1)).current;

  useEffect(() => {
    if (!animateKey) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
  }, [animateKey, pop]);

  const big = size === 'card';
  const textSize = text.length > 110 ? (big ? 21 : 19) : text.length > 70 ? (big ? 24 : 21) : big ? 28 : 24;

  return (
    <Animated.View
      style={{
        opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
          { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '-1.2deg'] }) }
        ]
      }}
    >
      <View style={s.wrap}>
        <View style={[s.shadow, StyleSheet.absoluteFill]} />
        <View style={s.bubble}>
          <Text style={s.name}>
            {face} {name} says
          </Text>
          <Text style={[s.text, { fontSize: textSize, lineHeight: textSize * 1.18 }]}>{text}</Text>
          {footer}
          {children}
        </View>
        {/* tail */}
        <View style={s.tailShadow} />
        <View style={s.tail} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingRight: 5, paddingBottom: 5, marginBottom: 20 },
  shadow: { top: 5, left: 5, backgroundColor: C.ink, borderRadius: 26 },
  bubble: {
    backgroundColor: C.paper,
    borderRadius: 26,
    borderWidth: INK_WIDTH + 0.5,
    borderColor: C.ink,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14
  },
  name: { fontFamily: F.semibold, fontSize: 14, color: C.inkSoft, marginBottom: 4 },
  text: { fontFamily: F.bold, color: C.ink },
  tail: {
    position: 'absolute',
    bottom: -9,
    left: 38,
    width: 26,
    height: 26,
    backgroundColor: C.paper,
    borderRightWidth: INK_WIDTH + 0.5,
    borderBottomWidth: INK_WIDTH + 0.5,
    borderColor: C.ink,
    transform: [{ rotate: '45deg' }]
  },
  tailShadow: {
    position: 'absolute',
    bottom: -14,
    left: 43,
    width: 26,
    height: 26,
    backgroundColor: C.ink,
    transform: [{ rotate: '45deg' }],
    zIndex: -1
  }
});
