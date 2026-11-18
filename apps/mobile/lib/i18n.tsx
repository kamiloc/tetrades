import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { getDeviceAppLocale } from './device-locale';
import type { AppLocale } from './locale-selection';
import { translate, type MessageKey, type MessageValues } from './translations';

type LocalizationContextValue = {
  locale: AppLocale;
  t: (key: MessageKey, values?: MessageValues) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

export function MobileLocalizationProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<AppLocale>(getDeviceAppLocale);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setLocale(getDeviceAppLocale());
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<LocalizationContextValue>(
    () => ({ locale, t: (key, values) => translate(locale, key, values) }),
    [locale],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useMobileLocalization(): LocalizationContextValue {
  const value = useContext(LocalizationContext);
  if (value === undefined) {
    throw new Error('useMobileLocalization must be used inside MobileLocalizationProvider');
  }
  return value;
}
