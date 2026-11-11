import { RosterView } from './roster-view';

export default async function TrainerRosterPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <RosterView clubId={clubId} />;
}
