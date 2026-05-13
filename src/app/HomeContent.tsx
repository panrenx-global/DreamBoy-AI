'use client';

import { useEffect, useState } from 'react';
import { AuthDialog } from '@/components/AuthDialog';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { CharacterSelect } from '@/components/CharacterSelect';
import { ChatScreen } from '@/components/ChatScreen';
import { Footer } from '@/components/Footer';

export function HomeContent() {
  const { chatState, resetChat } = useChat();
  const { currentUser } = useAuth();
  const [showChat, setShowChat] = useState(false);

  // 当选择角色后自动切换到聊天界面
  useEffect(() => {
    if (chatState.character) {
      setShowChat(true);
    }
  }, [chatState.character]);

  useEffect(() => {
    if (!currentUser && showChat) {
      resetChat();
      setShowChat(false);
    }
  }, [currentUser, resetChat, showChat]);

  if (showChat && chatState.character) {
    return (
      <>
        <ChatScreen onBack={() => setShowChat(false)} />
        <AuthDialog />
      </>
    );
  }

  return (
    <>
      <CharacterSelect />
      <Footer />
      <AuthDialog />
    </>
  );
}
