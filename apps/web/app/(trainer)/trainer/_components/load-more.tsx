'use client';

import { Button } from '../../../../components/button';
import { useWebLocalization } from '../../../../lib/i18n';

export function LoadMore({
  show,
  loading,
  onClick,
}: {
  show: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const { t } = useWebLocalization();
  if (!show) return null;
  return (
    <div className="flex justify-center">
      <Button onClick={onClick} disabled={loading}>
        {loading ? t('common.loading') : t('common.loadMore')}
      </Button>
    </div>
  );
}
