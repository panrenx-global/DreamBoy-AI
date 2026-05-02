'use client';

import { useState } from 'react';
import { Message, CharacterId } from '@/types/chat';
import { VoicePlayer } from './VoicePlayer';
import { ImageViewer } from './ImageViewer';
import { Loader2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  characterName: string;
  characterId?: CharacterId;
  characterAvatar?: string;
  isGeneratingImage?: boolean;
}

// 角色主题色映射
const avatarColors: Record<CharacterId, string> = {
  'warm-boy': 'from-pink-200 to-rose-300',
  'cool-guy': 'from-purple-200 to-indigo-300',
  'sunshine': 'from-yellow-200 to-orange-300',
  'artsy': 'from-cyan-200 to-blue-300',
};

export function MessageBubble({ 
  message, 
  characterName, 
  characterId,
  characterAvatar,
  isGeneratingImage 
}: MessageBubbleProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const isUser = message.role === 'user';

  // 获取角色主题色
  const gradientClass = characterId ? avatarColors[characterId] : 'from-pink-200 to-rose-300';

  return (
    <>
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} px-4 py-2`}>
        {/* 角色头像 - 使用角色主题色 */}
        {!isUser && (
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden`}
          >
            {characterAvatar ? (
              <img 
                src={characterAvatar} 
                alt={characterName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-sm">{characterName.charAt(0)}</span>
            )}
          </div>
        )}

        {/* 消息内容 */}
        <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
          {/* 文字气泡 - 始终显示 */}
          {message.type === 'text' || message.type === 'voice' ? (
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                isUser
                  ? 'bg-[#95EC69] text-gray-800 rounded-tr-sm'
                  : 'bg-white text-gray-800 rounded-tl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            </div>
          ) : null}

          {/* 语音播放条 - 非用户消息显示 */}
          {!isUser && (message.type === 'voice' || message.audioUri || message.content) && (
            <VoicePlayer 
              audioUri={message.audioUri} 
              text={message.content}
              className="self-start"
            />
          )}

          {/* 图片消息 - 统一圆角风格 */}
          {message.type === 'image' && (
            <div
              className={`rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-transform hover:scale-[1.02] ${
                !isUser ? 'rounded-tl-sm' : 'rounded-tr-sm'
              }`}
              onClick={() => setImageViewerOpen(true)}
            >
              {isGeneratingImage || !message.imageUri ? (
                <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : (
                <img
                  src={message.imageUri}
                  alt="发送的图片"
                  className="w-48 h-48 object-cover rounded-2xl"
                />
              )}
            </div>
          )}
        </div>

        {/* 用户头像 */}
        {isUser && (
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">我</span>
          </div>
        )}
      </div>

      {/* 图片查看器 */}
      <ImageViewer
        imageUri={message.imageUri || ''}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
      />
    </>
  );
}
