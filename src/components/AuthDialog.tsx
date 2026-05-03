'use client';

import { useEffect, useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function AuthFormHint({ message }: { message: string | null }) {
  return <div className="min-h-5 text-sm text-rose-500">{message || ''}</div>;
}

export function AuthDialog() {
  const {
    authMode,
    closeAuthDialog,
    isAuthOpen,
    login,
    openAuthDialog,
    register,
  } = useAuth();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  useEffect(() => {
    if (!isAuthOpen) {
      setMessage(null);
      setLoginPassword('');
      setRegisterPassword('');
      setRegisterEmail('');
      setConfirmPassword('');
      setTurnstileToken('');
      setIsSubmitting(false);
    }
  }, [isAuthOpen]);

  const handleLogin = async () => {
    setIsSubmitting(true);
    const result = await login(loginUsername, loginPassword);
    setIsSubmitting(false);

    if (!result.success) {
      setMessage(result.message || '登录失败');
      return;
    }

    setMessage(null);
  };

  const handleRegister = async () => {
    if (turnstileSiteKey && !turnstileToken) {
      setMessage('请先完成人机验证');
      return;
    }

    setIsSubmitting(true);
    const result = await register(
      registerUsername,
      registerEmail,
      registerPassword,
      confirmPassword,
      turnstileToken,
    );
    setIsSubmitting(false);

    if (!result.success) {
      setMessage(result.message || '注册失败');
      setTurnstileToken('');
      turnstileRef.current?.reset();
      return;
    }

    setMessage(null);
  };

  return (
    <Dialog open={isAuthOpen} onOpenChange={(open) => (open ? openAuthDialog(authMode) : closeAuthDialog())}>
      <DialogContent className="max-w-md rounded-3xl border-white/10 bg-slate-950 p-0 text-white shadow-2xl">
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.25),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.2),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.94),_rgba(2,6,23,0.98))]" />
          <div className="relative p-8">
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="text-2xl font-semibold tracking-wide text-white">
                欢迎回来
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                注册一个账号后，就可以登录进入聊天了
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={authMode}
              onValueChange={(value) => {
                openAuthDialog(value === 'register' ? 'register' : 'login');
                setMessage(null);
                setTurnstileToken('');
              }}
              className="mt-6"
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-white/10 p-1">
                <TabsTrigger value="login" className="rounded-xl text-white data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="rounded-xl text-white data-[state=active]:bg-white data-[state=active]:text-slate-900">
                  注册
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">用户名</label>
                  <Input
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">密码</label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-slate-400"
                  />
                </div>
                <AuthFormHint message={message} />
                <Button
                  onClick={handleLogin}
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-xl bg-rose-500 text-white hover:bg-rose-400"
                >
                  {isSubmitting ? '登录中...' : '登录'}
                </Button>
              </TabsContent>

              <TabsContent value="register" className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">用户名</label>
                  <Input
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="请设置用户名"
                    className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">邮箱</label>
                  <Input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="请输入常用邮箱"
                    className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">密码</label>
                  <Input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="密码不能低于 6 位"
                    className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-200">确认密码</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="h-11 rounded-xl border-white/10 bg-white/8 text-white placeholder:text-slate-400"
                  />
                </div>
                {turnstileSiteKey ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={turnstileSiteKey}
                      onSuccess={(token) => {
                        setTurnstileToken(token);
                      }}
                      onExpire={() => {
                        setTurnstileToken('');
                      }}
                      onError={() => {
                        setTurnstileToken('');
                      }}
                    />
                  </div>
                ) : null}
                <AuthFormHint message={message} />
                <Button
                  onClick={handleRegister}
                  disabled={isSubmitting || (Boolean(turnstileSiteKey) && !turnstileToken)}
                  className="h-11 w-full rounded-xl bg-fuchsia-500 text-white hover:bg-fuchsia-400"
                >
                  {isSubmitting ? '提交中...' : '注册并登录'}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
