'use client';

import { createContext, useContext, useMemo, type PropsWithChildren, type ReactNode } from 'react';

import type { AppLocale } from './locale-selection';
import { translateRich, type RichValues } from './rich-text';
import { translate, type MessageKey, type MessageValues } from './translations';

type LocalizationContextValue = {
  locale: AppLocale;
  t: (key: MessageKey, values?: MessageValues) => string;
  rich: (key: MessageKey, values?: RichValues) => ReactNode;
};

function localization(locale: AppLocale): LocalizationContextValue {
  return {
    locale,
    t: (key, values) => translate(locale, key, values),
    rich: (key, values) => translateRich(locale, key, values),
  };
}

// The root layout always provides the request locale. The English default
// (the fallback language) only applies to a component rendered on its own,
// such as in a unit test.
const LocalizationContext = createContext<LocalizationContextValue>(localization('en'));

export function WebLocalizationProvider({
  children,
  locale,
}: PropsWithChildren<{ locale: AppLocale }>) {
  const value = useMemo(() => localization(locale), [locale]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useWebLocalization(): LocalizationContextValue {
  return useContext(LocalizationContext);
}
