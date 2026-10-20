// Afrikaans and isiZulu versions of the pets' lines and the situation labels.
// English (src/data/*) stays the source: anything missing here shows in English.
import af from './af';
import zu from './zu';

export const PET_TRANSLATIONS = { af, zu };

// line: the English line; species: 'dog' | 'cat'; pack: personality id.
export function localizeLine(line, { species, pack, lang }) {
  return PET_TRANSLATIONS[lang]?.lines?.[species]?.[pack]?.[line] || line;
}

// field: 'label' | 'shortLabel' | 'tip'
export function localizeContext(ctx, field, { species, lang }) {
  const contexts = PET_TRANSLATIONS[lang]?.contexts;
  const tr = contexts?.[species]?.[ctx.id] || contexts?.shared?.[ctx.id];
  return tr?.[field] || ctx[field];
}
