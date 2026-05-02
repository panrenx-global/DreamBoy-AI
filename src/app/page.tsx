import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import { HomeContent } from './HomeContent';

export const metadata: Metadata = {
  title: '纸片人男友 - AI 虚拟恋爱聊天',
  description: '选择一个专属的虚拟男友，开启甜蜜聊天体验',
};

export default function Home() {
  return (
    <AuthProvider>
      <ChatProvider>
        <HomeContent />
      </ChatProvider>
    </AuthProvider>
  );
}
