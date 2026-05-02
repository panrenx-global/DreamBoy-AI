'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Button } from '@/components/ui/button';
import { Send, ArrowLeft, ImageOff } from 'lucide-react';

interface ChatScreenProps {
  onBack: () => void;
}

export function ChatScreen({ onBack }: ChatScreenProps) {
  const { chatState, sendMessage, resetChat } = useChat();
  const { currentUser, logout } = useAuth();
  const { character, messages, isTyping, isGeneratingImage, isLoadingHistory } = chatState;
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isGeneratingImage]);

  // 处理发送
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isTyping || isLoadingHistory) return;

    setInputValue('');
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSend();
  };

  // 处理回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || isComposingRef.current) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // 处理返回
  const handleBack = () => {
    resetChat();
    onBack();
  };

  const handleLogout = async () => {
    await logout();
    resetChat();
    onBack();
  };

  if (!character) return null;

  // 角色头像颜色
  const avatarColors: Record<string, string> = {
    'warm-boy': 'from-pink-200 to-rose-300',
    'cool-guy': 'from-purple-200 to-indigo-300',
    'sunshine': 'from-yellow-200 to-orange-300',
    'artsy': 'from-cyan-200 to-blue-300',
  };

  return (
    <div className="flex flex-col h-screen bg-[#EDEDED]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[600px] mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* 角色信息 */}
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[character.id] || 'from-gray-200 to-gray-300'} flex items-center justify-center shadow-sm overflow-hidden`}
            >
              {character.avatar ? (
                <img 
                  src={character.avatar} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold">{character.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="font-semibold text-gray-800">{character.name}</h1>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                在线
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="hidden rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 sm:block">
                {currentUser.username}
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                void handleLogout();
              }}
              className="text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            >
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* 聊天区域 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[600px] mx-auto py-4">
          {/* 欢迎消息 */}
          {messages.length === 0 && !isTyping && (
            <div className="text-center py-12 px-4">
              <div
                className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${avatarColors[character.id] || 'from-gray-200 to-gray-300'} flex items-center justify-center shadow-md mb-4`}
              >
                <span className="text-white font-bold text-3xl">{character.name.charAt(0)}</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                {character.name}
              </h2>
              <p className="text-gray-500 text-sm">
                {character.tagline}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-8 animate-pulse">
                开始聊天吧～
              </p>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              characterName={character.name}
              characterId={character.id}
              characterAvatar={character.avatar}
            />
          ))}

          {/* 正在输入动画 */}
          {isTyping && (
            <TypingIndicator 
              characterName={character.name} 
              characterId={character.id}
              characterAvatar={character.avatar}
            />
          )}

          {/* 图片生成中提示 */}
          {isGeneratingImage && (
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400">
              <ImageOff className="w-4 h-4 animate-pulse" />
              <span>正在生成图片...</span>
            </div>
          )}

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 输入区域 */}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-[600px] mx-auto px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
              }}
              placeholder="输入消息..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent max-h-32 text-gray-800 placeholder:text-gray-400"
              style={{
                minHeight: '44px',
                height: 'auto',
              }}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping || isLoadingHistory}
              className="rounded-full w-11 h-11 bg-rose-500 hover:bg-rose-600 transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
