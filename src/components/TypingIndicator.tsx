'use client';

import { CharacterId } from '@/types/chat';

interface TypingIndicatorProps {
  characterName: string;
  characterId?: CharacterId;
  characterAvatar?: string;
}

// 角色主题色映射
const avatarColors: Record<CharacterId, string> = {
  'warm-boy': 'from-pink-200 to-rose-300',
  'cool-guy': 'from-purple-200 to-indigo-300',
  'sunshine': 'from-yellow-200 to-orange-300',
  'artsy': 'from-cyan-200 to-blue-300',
};

export function TypingIndicator({ characterName, characterId, characterAvatar }: TypingIndicatorProps) {
  // 获取角色主题色
  const gradientClass = characterId ? avatarColors[characterId] : 'from-pink-200 to-rose-300';

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* 角色头像 - 使用角色主题色 */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden`}>
        {characterAvatar ? (
          <img 
            src={characterAvatar} 
            alt={characterName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white font-bold">{characterName.charAt(0)}</span>
        )}
      </div>

      {/* 气泡 */}
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* 文字提示 */}
      <span className="text-sm text-gray-400 animate-pulse">
        {characterName}正在输入...
      </span>
    </div>
  );
}
