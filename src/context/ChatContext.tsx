'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { characters as fallbackCharacters } from '@/data/characters';
import { useAuth } from '@/context/AuthContext';
import type {
  Character,
  ChatHistoryResponse,
  ChatMessagePayload,
  ChatResponse,
  ChatState,
  CharactersResponse,
  ImageResponse,
  Message,
  TTSResponse,
} from '@/types/chat';
import { cleanTextForSpeech, canUseForTTS } from '@/utils/cleanText';

interface ChatContextType {
  chatState: ChatState;
  selectCharacter: (character: Character) => void;
  sendMessage: (content: string) => Promise<void>;
  resetChat: () => void;
}

const initialState: ChatState = {
  characters: [],
  character: null,
  threadId: null,
  messages: [],
  isTyping: false,
  isGeneratingImage: false,
  isLoadingCharacters: true,
  isLoadingHistory: false,
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function mapPayloadToMessage(message: ChatMessagePayload): Message {
  return {
    id: message.id,
    dbId: message.dbId,
    role: message.role,
    type: message.type,
    content: message.content,
    audioUri: message.audioUri || undefined,
    imageUri: message.imageUri || undefined,
    imagePrompt: message.imagePrompt || undefined,
    timestamp: message.timestamp,
  };
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatState, setChatState] = useState<ChatState>(initialState);
  const { currentUser } = useAuth();
  const isGeneratingRef = useRef(false);
  const selectionRef = useRef(0);

  const loadCharacters = useCallback(async () => {
    setChatState((prev) => ({ ...prev, isLoadingCharacters: true }));

    try {
      const response = await fetch('/api/characters', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load characters');
      }

      const data = (await response.json()) as CharactersResponse;
      setChatState((prev) => ({
        ...prev,
        characters: data.characters,
        isLoadingCharacters: false,
      }));
    } catch {
      setChatState((prev) => ({
        ...prev,
        characters: fallbackCharacters,
        isLoadingCharacters: false,
      }));
    }
  }, []);

  const loadHistory = useCallback(async (characterId: string, selectionId: number) => {
    if (!currentUser) {
      setChatState((prev) => ({
        ...prev,
        threadId: null,
        messages: [],
        isLoadingHistory: false,
      }));
      return;
    }

    setChatState((prev) => ({
      ...prev,
      messages: [],
      threadId: null,
      isLoadingHistory: true,
    }));

    try {
      const response = await fetch(`/api/chat/history?characterId=${encodeURIComponent(characterId)}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = (await response.json()) as ChatHistoryResponse;

      if (selectionRef.current !== selectionId) {
        return;
      }

      setChatState((prev) => ({
        ...prev,
        threadId: data.threadId,
        messages: data.messages.map(mapPayloadToMessage),
        isLoadingHistory: false,
      }));
    } catch {
      if (selectionRef.current !== selectionId) {
        return;
      }

      setChatState((prev) => ({
        ...prev,
        threadId: null,
        messages: [],
        isLoadingHistory: false,
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  const selectCharacter = useCallback((character: Character) => {
    const selectionId = selectionRef.current + 1;
    selectionRef.current = selectionId;

    setChatState((prev) => ({
      ...prev,
      character,
      threadId: null,
      messages: [],
      isTyping: false,
      isGeneratingImage: false,
      isLoadingHistory: Boolean(currentUser),
    }));

    void loadHistory(character.id, selectionId);
  }, [currentUser, loadHistory]);

  const resetChat = useCallback(() => {
    selectionRef.current += 1;
    setChatState((prev) => ({
      ...prev,
      character: null,
      threadId: null,
      messages: [],
      isTyping: false,
      isGeneratingImage: false,
      isLoadingHistory: false,
    }));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const { character } = chatState;
    const selectionId = selectionRef.current;

    if (!character || !currentUser || isGeneratingRef.current) {
      return;
    }

    isGeneratingRef.current = true;

    const tempUserMessage: Message = {
      id: `temp-user-${generateId()}`,
      role: 'user',
      type: 'text',
      content,
      timestamp: Date.now(),
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, tempUserMessage],
      isTyping: true,
    }));

    try {
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          content,
        }),
      });

      const chatData = (await chatResponse.json()) as ChatResponse | { error?: string };

      if (!('assistantMessage' in chatData) || !('userMessage' in chatData)) {
        throw new Error(('error' in chatData && chatData.error) || 'Chat API failed');
      }

      if (selectionRef.current !== selectionId) {
        return;
      }

      const persistedUserMessage = mapPayloadToMessage(chatData.userMessage);
      const assistantMessage = mapPayloadToMessage(chatData.assistantMessage);

      setChatState((prev) => ({
        ...prev,
        threadId: chatData.threadId,
        messages: [
          ...prev.messages.filter((message) => message.id !== tempUserMessage.id),
          persistedUserMessage,
          assistantMessage,
        ],
        isTyping: false,
      }));

      if (!chatResponse.ok || chatData.isFallback) {
        return;
      }

      if (assistantMessage.dbId && canUseForTTS(assistantMessage.content)) {
        void (async () => {
          try {
            const ttsResponse = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: cleanTextForSpeech(assistantMessage.content),
                speaker: character.speaker,
                uid: assistantMessage.id,
                messageId: assistantMessage.dbId,
                threadId: chatData.threadId,
              }),
            });

            const ttsData = (await ttsResponse.json()) as TTSResponse;

            if (!ttsResponse.ok || !ttsData.message || selectionRef.current !== selectionId) {
              return;
            }

            const persistedVoiceMessage = mapPayloadToMessage(ttsData.message);

            setChatState((prev) => ({
              ...prev,
              messages: prev.messages.map((message) =>
                message.dbId === persistedVoiceMessage.dbId ? persistedVoiceMessage : message,
              ),
            }));
          } catch {
            // ignore TTS failures in UI
          }
        })();
      }

      if (chatData.imagePrompt) {
        setChatState((prev) => ({ ...prev, isGeneratingImage: true }));

        void (async () => {
          try {
            const enhancedPrompt = `${chatData.imagePrompt}。画风要求：动漫风格，高质量，精细，${character.appearance}。不要出现文字。`;
            const imageResponse = await fetch('/api/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: enhancedPrompt,
                threadId: chatData.threadId,
                imagePrompt: chatData.imagePrompt,
              }),
            });

            const imageData = (await imageResponse.json()) as ImageResponse;

            if (!imageResponse.ok || !imageData.message || selectionRef.current !== selectionId) {
              return;
            }

            const persistedImageMessage = mapPayloadToMessage(imageData.message);

            setChatState((prev) => ({
              ...prev,
              messages: [...prev.messages, persistedImageMessage],
            }));
          } catch {
            // ignore image generation failure in UI
          } finally {
            if (selectionRef.current === selectionId) {
              setChatState((prev) => ({ ...prev, isGeneratingImage: false }));
            }
          }
        })();
      }
    } catch (error) {
      if (selectionRef.current !== selectionId) {
        return;
      }

      console.error('Send message error:', error);

      const errorMessage: Message = {
        id: generateId(),
        role: 'character',
        type: 'text',
        content: '网络不太好，等一下再试试～',
        timestamp: Date.now(),
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isTyping: false,
        isGeneratingImage: false,
      }));
    } finally {
      isGeneratingRef.current = false;
    }
  }, [chatState, currentUser]);

  return (
    <ChatContext.Provider value={{ chatState, selectCharacter, sendMessage, resetChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
