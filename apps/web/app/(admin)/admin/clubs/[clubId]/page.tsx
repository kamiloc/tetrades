import { ClubDetailView } from './club-detail-view';

export default async function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  return <ClubDetailView clubId={clubId} />;
}
