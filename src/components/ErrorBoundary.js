import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { reportError } from '../crash';
import { C, F, INK_WIDTH } from '../theme';

// If a screen crashes, show a calm recovery screen instead of a blank app,
// and report what happened.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    reportError(Object.assign(error || {}, { stack: `${error?.stack || ''}\n${info?.componentStack || ''}` }), {
      fatal: false,
      where: 'render'
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={s.wrap}>
        <Text style={s.emoji}>🐾</Text>
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.body}>Your pets and journal are safe. Tap below to go back.</Text>
        <Pressable style={s.btn} onPress={() => this.setState({ failed: false })} accessibilityRole="button">
          <Text style={s.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emoji: { fontSize: 54 },
  title: { fontFamily: F.bold, fontSize: 24, color: C.ink, marginTop: 8 },
  body: { fontFamily: F.regular, fontSize: 15, color: C.inkSoft, textAlign: 'center', marginTop: 6, lineHeight: 21 },
  btn: {
    marginTop: 20,
    backgroundColor: C.butter,
    borderRadius: 999,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    paddingHorizontal: 22,
    paddingVertical: 12
  },
  btnText: { fontFamily: F.semibold, fontSize: 16, color: C.ink }
});
