import { InlineAlert } from '../../../../../components/inline-alert';
import { PageBody, PageHeader } from '../../../../../components/layout';
import { TopBar } from '../../../../../components/portal-shell';
import { getServerLocalization } from '../../../../../lib/server-i18n';
import { getSessionUser } from '../../../../../lib/session';

import { InvitationsList } from './invitations-list';

export const dynamic = 'force-dynamic';

// The email comes from the server session, not the API (design D7). The API
// matches invitations against the same address only when it's confirmed.
export default async function TrainerInvitationsPage() {
  const [user, { t }] = await Promise.all([getSessionUser(), getServerLocalization()]);
  const email = user?.email ?? null;
  const confirmed = user?.emailConfirmed === true && email !== null;

  return (
    <>
      <TopBar crumbs={[{ label: t('portal.trainer') }, { label: t('nav.invitations') }]} />
      <PageBody>
        <PageHeader
          title={t('trainerInvites.title')}
          sub={confirmed ? t('trainerInvites.showingFor', { email }) : undefined}
        />
        {confirmed ? (
          <InvitationsList email={email} />
        ) : (
          <InlineAlert tone="warning" title={t('trainerInvites.confirmTitle')}>
            {t('trainerInvites.confirmBody')}
          </InlineAlert>
        )}
      </PageBody>
    </>
  );
}
