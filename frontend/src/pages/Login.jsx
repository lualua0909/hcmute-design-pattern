import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';

export function Login() {
  const { firebaseReady, devBypass, signInWithGoogle, signInWithEmail, registerWithEmail, signInAsDev } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const redirect = params.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [devUid, setDevUid] = useState('demo-customer');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      navigate(redirect, { replace: true });
    } catch (err) {
      toast.error('Đăng nhập thất bại', { description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng nhập SportHub</CardTitle>
          <CardDescription>
            {firebaseReady ? 'Xác thực bằng Firebase Auth.' : 'Khoá Firebase còn là placeholder — đang dùng dev token của gateway.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {firebaseReady && (
            <>
              <Button variant="outline" className="w-full" disabled={busy} onClick={() => run(signInWithGoogle)}>
                Đăng nhập với Google
              </Button>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">hoặc</span>
                <Separator className="flex-1" />
              </div>

              <form
                className="space-y-3"
                onSubmit={(e) => { e.preventDefault(); run(() => signInWithEmail(email, password)); }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}Đăng nhập
                </Button>
                <Button
                  type="button" variant="ghost" className="w-full" disabled={busy}
                  onClick={() => run(() => registerWithEmail(email, password))}
                >
                  Tạo tài khoản mới
                </Button>
                </form>
              </>
          )}

          {devBypass && (
            <>
              {firebaseReady && (
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">hoặc dùng dev token</span>
                  <Separator className="flex-1" />
                </div>
              )}

              <form
                className="space-y-3"
                onSubmit={(e) => { e.preventDefault(); run(() => signInAsDev(devUid, 'customer')); }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="uid">Mã người dùng demo</Label>
                  <Input id="uid" value={devUid} onChange={(e) => setDevUid(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}Đăng nhập as customer
                </Button>
                <Button
                  type="button" variant="outline" className="w-full" disabled={busy}
                  onClick={() => run(() => signInAsDev('demo-admin', 'admin'))}
                >
                  Đăng nhập với vai trò quản trị (CMS)
                </Button>
              </form>
            </>
          )}

          {!firebaseReady && !devBypass && (
            <p className="text-sm text-destructive">
              Firebase chưa được cấu hình và dev bypass đang tắt. Điền khoá Firebase để đăng nhập.
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">Về trang cửa hàng</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
