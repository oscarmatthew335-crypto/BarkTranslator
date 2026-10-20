import React, { createContext, useContext } from 'react';
import en from './en';
import af from './af';
import zu from './zu';
import gameEn from './game/en';
import gameAf from './game/af';
import gameZu from './game/zu';

// The Play tab's strings live in ./game/ and join each language here.
export const DICTS = { en: { ...en, ...gameEn }, af: { ...af, ...gameAf }, zu: { ...zu, ...gameZu } };

export const LANGUAGE_OPTIONS = [
  { id: 'system', labelKey: 'settings.langSystem' },
  { id: 'en', label: 'English' },
  { id: 'af', label: 'Afrikaans' },
  { id: 'zu', label: 'isiZulu' }
];

export function detectDeviceLanguage() {
  try {
    const locale = String(Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.locale || 'en').toLowerCase();
    if (locale.startsWith('af')) return 'af';
    if (locale.startsWith('zu')) return 'zu';
  } catch (_) {}
  return 'en';
}

export function resolveLanguage(pref = 'system') {
  if (pref && pref !== 'system' && DICTS[pref]) return pref;
  return detectDeviceLanguage();
}

let activePref = 'system';
let activeLang = resolveLanguage('system');

export function setAppLanguage(pref = 'system') {
  activePref = pref || 'system';
  activeLang = resolveLanguage(activePref);
  return activeLang;
}

export function getAppLanguage() {
  return activeLang;
}

export function translate(key, vars = {}, lang = activeLang) {
  const dict = DICTS[lang] || DICTS.en;
  const template = dict[key] ?? DICTS.en[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : `{${k}}`));
}

const I18nContext = createContext({
  lang: activeLang,
  pref: activePref,
  t: (key, vars) => translate(key, vars, activeLang)
});

export function I18nProvider({ language = 'system', children }) {
  const lang = setAppLanguage(language);
  const value = {
    lang,
    pref: language || 'system',
    t: (key, vars) => translate(key, vars, lang)
  };
  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}
