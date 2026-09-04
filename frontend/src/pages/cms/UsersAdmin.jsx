import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate, ROLE_LABELS } from '@/lib/utils';

export function UsersAdmin() {
  const [users, setUsers] = useState(null);

  const load = () => api.users.list().then(setUsers).catch((err) => { setUsers([]); toast.error(err.message); });
  useEffect(load, []);

  const toggleRole = async (user) => {
    const role = user.role === 'admin' ? 'customer' : 'admin';
    try {
      await api.users.setRole(user.id, role);
      toast.success(`${user.email} giờ là ${ROLE_LABELS[role]}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Người dùng</h1>
        <p className="text-sm text-muted-foreground">Tài khoản được đồng bộ từ Firebase Auth ở lần đăng nhập đầu tiên.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {users === null ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Thông báo đẩy</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.displayName || '—'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{ROLE_LABELS[user.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.hasFcmToken ? 'Đã đăng ký' : 'Chưa đăng ký'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggleRole(user)}>
                        Chuyển thành {user.role === 'admin' ? 'khách hàng' : 'quản trị'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
