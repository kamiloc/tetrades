import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { resolveAcceptLanguage, type AppLocale } from './locale-selection';
import { translateRich, type RichValues } from './rich-text';
import { translate, type MessageKey, type MessageValues } from './translations';

// Server Components read the same per-request locale the root layout passes
// to the client provider, so server and client copy always match.
export async function getRequestLocale(): Promise<AppLocale> {
  return resolveAcceptLanguage((await headers()).get('accept-language'));
}

export async function getServerLocalization(): Promise<{
  locale: AppLocale;
  t: (key: MessageKey, values?: MessageValues) => string;
  rich: (key: MessageKey, values?: RichValues) => ReactNode;
}> {
  const locale = await getRequestLocale();
  return {
    locale,
    t: (key, values) => translate(locale, key, values),
    rich: (key, values) => translateRich(locale, key, values),
  };
}
