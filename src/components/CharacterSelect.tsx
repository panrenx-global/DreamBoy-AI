'use client';

import { useState, type MouseEvent } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Character } from '@/types/chat';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.6, 0.05, 0.01, 0.9],
    },
  },
};

const characterGradients: Record<string, string> = {
  'warm-boy': 'from-rose-400/24 via-pink-300/10 to-white/5',
  'cool-guy': 'from-violet-400/24 via-indigo-300/10 to-white/5',
  sunshine: 'from-amber-300/24 via-orange-300/10 to-white/5',
  artsy: 'from-cyan-300/24 via-sky-300/10 to-white/5',
};

function CharacterCard({
  character,
  onSelect,
}: {
  character: Character;
  onSelect: (character: Character) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 280,
    damping: 28,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 280,
    damping: 28,
  });

  const handleMouseMove = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      style={{
        rotateX: shouldReduceMotion ? 0 : rotateX,
        rotateY: shouldReduceMotion ? 0 : rotateY,
        transformStyle: 'preserve-3d',
      }}
      onClick={() => onSelect(character)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="group relative block text-left outline-none"
    >
      <Card className="relative h-full overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] p-6 shadow-[0_26px_90px_-48px_rgba(244,114,182,0.85)] backdrop-blur-xl transition-colors duration-500 group-hover:border-white/24">
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${characterGradients[character.id] || 'from-white/12 via-white/5 to-transparent'} opacity-70 transition-opacity duration-500 group-hover:opacity-100`}
          animate={isHovered ? { opacity: 1 } : { opacity: shouldReduceMotion ? 0.85 : 0.7 }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0.55, scale: 0.9 }}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/10 p-2 text-rose-100"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
        </motion.div>

        <div className="relative z-10 flex h-full flex-col items-center gap-5 text-center">
          <div className="relative">
            <motion.div
              className="absolute -inset-3 rounded-full bg-white/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
              animate={
                isHovered && !shouldReduceMotion
                  ? { rotate: 360, scale: [1, 1.08, 1] }
                  : { rotate: 0, scale: 1 }
              }
              transition={{
                duration: 3,
                repeat: isHovered && !shouldReduceMotion ? Infinity : 0,
                ease: 'linear',
              }}
            />
            <div className="relative h-32 w-32 overflow-hidden rounded-full border border-white/20 bg-white/10 p-1 shadow-2xl">
              <Image
                src={character.avatar}
                alt={character.name}
                fill
                sizes="128px"
                className="rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <span className="absolute bottom-2 right-1 h-5 w-5 rounded-full border-4 border-slate-950 bg-emerald-400" />
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white transition-colors group-hover:text-rose-100">
              {character.name}
            </h2>
            <p className="min-h-10 text-sm leading-5 text-slate-300">
              {character.tagline}
            </p>
          </div>

          <div className="flex min-h-14 flex-wrap items-center justify-center gap-2">
            {character.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-white/15 bg-white/8 text-xs text-slate-200"
              >
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-auto inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm text-rose-100 transition-colors group-hover:bg-white/16">
            <MessageCircle className="h-4 w-4" aria-hidden />
            开始聊天
          </div>
        </div>
      </Card>
    </motion.button>
  );
}

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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_30%),linear-gradient(180deg,#0f172a,#020617)] px-4 py-8">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

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

      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.6, 0.05, 0.01, 0.9] }}
          className="mb-12 text-center"
        >
          <Badge className="mb-5 gap-2 border-white/10 bg-white/10 text-slate-200 backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-rose-300 text-rose-300" aria-hidden />
            AI Boyfriend
          </Badge>
          <h1 className="mb-4 bg-gradient-to-r from-rose-200 via-fuchsia-200 to-sky-200 bg-clip-text text-4xl font-semibold text-transparent md:text-6xl">
            纸片人男友
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            选择你的专属男友，开启甜蜜聊天
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {isLoadingCharacters && characters.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/6 px-6 py-10 text-center text-sm text-slate-400">
              正在加载角色...
            </div>
          ) : null}

          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onSelect={handleSelectCharacter}
            />
          ))}
        </motion.div>

        <div className="mt-10 text-center text-sm text-slate-500">
          <p>{currentUser ? '选择一个角色开始聊天' : '先登录或注册，再选择角色开始聊天'}</p>
        </div>
      </div>
    </div>
  );
}
