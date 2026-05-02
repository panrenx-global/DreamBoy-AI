import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '纸片人男友 - AI 虚拟恋爱聊天',
  description: '选择一个专属的虚拟男友，开启甜蜜聊天体验',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
