import { AthleteView } from './athlete-view';

export default async function TrainerAthletePage({
  params,
}: {
  params: Promise<{ clubId: string; athleteId: string }>;
}) {
  const { clubId, athleteId } = await params;
  return <AthleteView clubId={clubId} athleteId={athleteId} />;
}
