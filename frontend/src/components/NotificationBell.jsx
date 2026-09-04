import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

/**
 * Shows the durable feed written by the Notification Service. Push arrives via
 * FCM; this list is the fallback and the history.
 */
export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = () => api.notifications.list().then(setItems).catch(() => {});
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  const unread = items.filter((i) => !i.read).length;

  return (
    <DropdownMenu onOpenChange={(open) => {
      if (!open && unread) api.notifications.readAll().then(() => setItems((prev) => prev.map((i) => ({ ...i, read: true }))));
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Chưa có thông báo nào</p>
        )}
        {items.slice(0, 8).map((n) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
            <span className="text-sm font-medium">{n.title}</span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
            <span className="text-[10px] text-muted-foreground">{formatDate(n.createdAt)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
