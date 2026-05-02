'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoicePlayerProps {
  audioUri?: string | null;
  text?: string;
  className?: string;
}

// 波形组件
function Waveform({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0.3, 0.6, 0.4, 0.8, 0.5, 0.7, 0.3, 0.5, 0.6, 0.4, 0.8, 0.5].map((h, i) => (
        <div
          key={i}
          className={`w-1 bg-rose-400 rounded-full transition-all ${isPlaying ? 'animate-pulse' : ''}`}
          style={{
            height: `${h * 16}px`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

// 使用 Web Speech API 进行语音合成
function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      // 预加载语音列表
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isSupported || typeof window === 'undefined' || !window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // 取消之前的语音
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // 忽略取消时的错误
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // 设置语音参数
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 限制文本长度，避免过长文本导致错误
      if (text.length > 200) {
        utterance.text = text.slice(0, 200) + '...';
      }
      
      // 尝试获取中文语音
      try {
        const voices = window.speechSynthesis.getVoices();
        const chineseVoice = voices.find(v => 
          v.lang.includes('zh') || 
          v.lang.includes('CN') || 
          v.lang.includes('Hans')
        );
        if (chineseVoice) {
          utterance.voice = chineseVoice;
        }
      } catch (e) {
        // 忽略获取语音列表时的错误
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        // 忽略中断错误 (interrupted)
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Speech synthesis error:', e.error);
        }
        resolve(); // 不 reject，避免控制台报错
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        setIsSpeaking(false);
        resolve();
      }
    });
  }, [isSupported]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // 忽略
      }
      setIsSpeaking(false);
    }
  }, []);

  return { speak, stop, isSpeaking, isSupported };
}

export function VoicePlayer({ audioUri, text, className = '' }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { speak, stop, isSpeaking, isSupported } = useSpeechSynthesis();

  // 播放音频文件
  const playAudio = useCallback(() => {
    if (!audioRef.current) return;
    try {
      audioRef.current.play();
      setIsPlaying(true);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (!audioRef.current) return;
    try {
      audioRef.current.pause();
      setIsPlaying(false);
    } catch (e) {
      // 忽略
    }
  }, []);

  // 使用 Web Speech API 播放文字
  const playText = useCallback(async () => {
    if (!text) return;
    setIsPlaying(true);
    try {
      await speak(text);
    } catch (e) {
      // 错误已在 speak 内部处理
    } finally {
      setIsPlaying(false);
    }
  }, [text, speak]);

  const handlePlay = useCallback(() => {
    if (audioUri) {
      if (isPlaying) {
        pauseAudio();
      } else {
        playAudio();
      }
    } else if (text && isSupported) {
      if (isPlaying || isSpeaking) {
        stop();
        setIsPlaying(false);
      } else {
        playText();
      }
    }
  }, [audioUri, text, isPlaying, isSpeaking, isSupported, pauseAudio, playAudio, stop, playText]);

  // 音频播放结束
  useEffect(() => {
    if (!audioRef.current) return;
    
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setIsPlaying(false);
    
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('error', handleError);
    
    return () => {
      audioRef.current?.removeEventListener('ended', handleEnded);
      audioRef.current?.removeEventListener('error', handleError);
    };
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      try {
        stop();
      } catch (e) {
        // 忽略清理时的错误
      }
    };
  }, [stop]);

  // 有音频 URI 时
  if (audioUri) {
    return (
      <>
        <audio
          ref={audioRef}
          src={audioUri}
          preload="none"
        />
        <div className={`flex items-center gap-2 ${className}`}>
          <button
            onClick={handlePlay}
            className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 flex items-center justify-center transition-colors flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-rose-600" />
            ) : (
              <Play className="w-4 h-4 text-rose-600 ml-0.5" />
            )}
          </button>
          <Waveform isPlaying={isPlaying} />
        </div>
      </>
    );
  }

  // 没有音频 URI，使用 Web Speech API
  if (text && isSupported) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={handlePlay}
          className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          {(isPlaying || isSpeaking) ? (
            <Pause className="w-4 h-4 text-rose-600" />
          ) : (
            <Play className="w-4 h-4 text-rose-600 ml-0.5" />
          )}
        </button>
        <Waveform isPlaying={isPlaying || isSpeaking} />
      </div>
    );
  }

  // 不显示任何内容（不支持且无音频）
  return null;
}
