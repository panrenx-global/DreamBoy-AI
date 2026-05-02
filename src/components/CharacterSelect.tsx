'use client';

import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import type { Character } from '@/types/chat';

// 角色对应的 GlowCard 颜色
const glowColorMap: Record<string, 'blue' | 'purple' | 'green' | 'red' | 'orange'> = {
  'warm-boy': 'red',      // 林屿 - 粉色系用 red
  'cool-guy': 'purple',   // 顾冽 - 紫色系
  'sunshine': 'orange',   // 苏晨 - 橙黄色系
  'artsy': 'blue',        // 沈默 - 蓝色系
};

export function CharacterSelect() {
  const { chatState, selectCharacter } = useChat();
  const { currentUser, isHydrated, logout, openAuthDialog } = useAuth();
  const { characters, isLoadingCharacters } = chatState;

  const handleLogout = async () => {
    await logout();
  };

  const handleSelectCharacter = (character: Character) => {
    if (!currentUser) {
      openAuthDialog('login');
      return;
    }

    selectCharacter(character);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 py-8 px-4">
      <div className="absolute right-4 top-6 z-20 flex items-center gap-3 md:right-8">
        {isHydrated && currentUser ? (
          <>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
              {currentUser.username}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded-full border-white/15 bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white"
            >
              退出登录
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => openAuthDialog('login')}
              className="rounded-full border-white/15 bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white"
            >
              登录
            </Button>
            <Button
              onClick={() => openAuthDialog('register')}
              className="rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-5 text-white shadow-lg shadow-rose-500/30 hover:from-rose-400 hover:to-fuchsia-400"
            >
              注册
            </Button>
          </>
        )}
      </div>

      <div className="max-w-5xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-rose-400 bg-clip-text text-transparent mb-4">
            纸片人男友
          </h1>
          <p className="text-gray-400 text-lg">
            选择你的专属男友，开启甜蜜聊天
          </p>
        </div>

        {/* 角色卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {isLoadingCharacters && characters.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-gray-400">
              正在加载角色...
            </div>
          ) : null}

          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => handleSelectCharacter(character)}
              className="group block"
            >
              <GlowCard
                glowColor={glowColorMap[character.id]}
                customSize
                width="100%"
                height="auto"
                className="!aspect-auto !grid-rows-auto p-6"
              >
                {/* 角色信息 */}
                <div className="flex flex-col items-center text-center gap-4">
                  {/* 头像 */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/20 group-hover:ring-white/40 transition-all duration-300 shadow-xl">
                      <img
                        src={character.avatar}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* 在线状态指示器 */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-slate-900 animate-pulse" />
                  </div>

                  {/* 名字 */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-300 transition-colors">
                      {character.name}
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {character.tagline}
                    </p>
                  </div>

                  {/* 性格标签 */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {character.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/20 hover:bg-white/20 transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 点击提示 */}
                  <div className="mt-2 text-sm text-gray-500 group-hover:text-pink-400 transition-colors">
                    点击开始聊天 →
                  </div>
                </div>
              </GlowCard>
            </button>
          ))}
        </div>

        {/* 底部装饰 */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>{currentUser ? '选择一个角色开始聊天' : '先登录或注册，再选择角色开始聊天'}</p>
        </div>
      </div>
    </div>
  );
}
