import { InlineAlert } from '../../../../../components/inline-alert';
import { PageBody, PageHeader } from '../../../../../components/layout';
import { TopBar } from '../../../../../components/portal-shell';
import { getSessionUser } from '../../../../../lib/session';

import { InvitationsList } from './invitations-list';

export const dynamic = 'force-dynamic';

// The email comes from the server session, not the API (design D7). The API
// matches invitations against the same address only when it's confirmed.
export default async function TrainerInvitationsPage() {
  const user = await getSessionUser();
  const email = user?.email ?? null;
  const confirmed = user?.emailConfirmed === true && email !== null;

  return (
    <>
      <TopBar crumbs={[{ label: 'Trainer portal' }, { label: 'Invitations' }]} />
      <PageBody>
        <PageHeader
          title="Trainer invitations"
          sub={confirmed ? <>Showing invitations for {email}</> : undefined}
        />
        {confirmed ? (
          <InvitationsList email={email} />
        ) : (
          <InlineAlert tone="warning" title="Confirm your email to see invitations">
            Invitations appear only for a confirmed email address. Sign out and sign in again with
            the link or code we email you; that confirms the address.
          </InlineAlert>
        )}
      </PageBody>
    </>
  );
}
