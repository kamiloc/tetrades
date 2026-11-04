import { CertificationsView } from './certifications-view';

export default async function TrainerCertificationsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return <CertificationsView clubId={clubId} />;
}
