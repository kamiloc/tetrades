import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { translateRich } from './rich-text';

describe('translateRich', () => {
  it('places elements inside the translated sentence', () => {
    const markup = renderToStaticMarkup(
      <p>{translateRich('es', 'login.sentTo', { email: <strong>ana@example.co</strong> })}</p>,
    );
    expect(markup).toBe(
      '<p>Enviamos un enlace de inicio de sesión y un código a <strong>ana@example.co</strong>. Abre el enlace en este navegador o ingresa el código a continuación.</p>',
    );
  });

  it('keeps an unknown placeholder visible instead of dropping it', () => {
    const markup = renderToStaticMarkup(<p>{translateRich('en', 'login.sentTo')}</p>);
    expect(markup).toContain('{email}');
  });
});
