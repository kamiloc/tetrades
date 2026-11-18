import { Fragment, type ReactNode } from 'react';

import { formatNumber } from './format';
import type { AppLocale } from './locale-selection';
import { messageTemplate, type MessageKey } from './translations';

export type RichValues = Readonly<Record<string, ReactNode>>;

// Like translate(), but placeholders may be elements (e.g. <strong>{email}</strong>),
// so translated sentences keep their emphasis without splitting the copy.
export function translateRich(locale: AppLocale, key: MessageKey, values: RichValues = {}): ReactNode {
  const count = values['count'];
  const parts = messageTemplate(locale, key, typeof count === 'number' ? count : undefined).split(/\{(\w+)\}/g);
  return parts.map((part, index) => {
    if (index % 2 === 0) return part === '' ? null : <Fragment key={index}>{part}</Fragment>;
    const value = values[part];
    if (value === undefined) return <Fragment key={index}>{`{${part}}`}</Fragment>;
    return <Fragment key={index}>{typeof value === 'number' ? formatNumber(locale, value) : value}</Fragment>;
  });
}
