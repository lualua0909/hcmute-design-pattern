import { Badge } from '@/components/ui/badge';
import { cn, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/lib/utils';

export function StatusBadge({ status }) {
  return (
    <Badge className={cn('border-0', ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.pending)}>
      {ORDER_STATUS_LABELS[status] || status}
    </Badge>
  );
}
