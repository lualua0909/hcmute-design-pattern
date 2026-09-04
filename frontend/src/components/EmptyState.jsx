import { PackageOpen } from 'lucide-react';

export function EmptyState({ title = 'Chưa có gì ở đây', description, action, icon: Icon = PackageOpen }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
