import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, F } from '../theme';
import { APP_NAME } from '../species';
import { Sticker } from './ui';

const CONFIDENT_AT = 25;

// "Bruno's language": how far Pawlingo has got learning this pet.
export default function LearningCard({ progress, species, petName, compact }) {
  if (!progress) return null;
  const { total, byContext, stage, toUnlock, needsMoreContexts } = progress;
  const pct = Math.min(1, total / CONFIDENT_AT);

  let headline;
  let body;
  if (stage === 'starting') {
    headline = `Getting to know ${petName}`;
    const more = toUnlock > 0 ? `${toUnlock} more ${toUnlock === 1 ? 'sound' : 'sounds'}` : 'a sound';
    body = needsMoreContexts
      ? `Teach ${more} from at least two different situations and ${APP_NAME} starts guessing what ${petName} means.`
      : `Teach ${more} and ${APP_NAME} starts guessing what ${petName} means.`;
  } else if (stage === 'learning') {
    headline = `Learning ${petName}'s language`;
    body = `Guesses are on. Every time you say what ${petName} really meant, they get sharper.`;
  } else {
    headline = `${APP_NAME} knows ${petName} well`;
    body = `Keep teaching now and then. ${petName}'s sounds change as they grow, and ${APP_NAME} grows with them.`;
  }

  const counts = species.contexts.filter((c) => byContext[c.id]).map((c) => ({ label: c.label, n: byContext[c.id] }));

  return (
    <Sticker color={C.paper} radius={22} innerStyle={s.card} style={{ marginBottom: 16 }}>
      <Text style={s.kicker}>
        🧠 {petName}'s language
      </Text>
      <Text style={s.headline}>{headline}</Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${Math.max(4, pct * 100)}%` }]} />
      </View>
      <Text style={s.count}>
        {total} {total === 1 ? 'sound' : 'sounds'} taught
      </Text>
      <Text style={s.body}>{body}</Text>
      {!compact && counts.length > 0 && (
        <View style={s.chips}>
          {counts.map((c) => (
            <View key={c.label} style={s.chip}>
              <Text style={s.chipText}>
                {c.label} {c.n}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Sticker>
  );
}

const s = StyleSheet.create({
  card: { padding: 16 },
  kicker: { fontFamily: F.semibold, fontSize: 13, color: C.inkSoft },
  headline: { fontFamily: F.bold, fontSize: 20, color: C.ink, marginTop: 2, marginBottom: 10 },
  track: { height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.ink, backgroundColor: C.bg, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.mint },
  count: { fontFamily: F.semibold, fontSize: 13, color: C.ink, marginTop: 6 },
  body: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: C.bg, borderRadius: 999, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontFamily: F.medium, fontSize: 12, color: C.ink }
});
