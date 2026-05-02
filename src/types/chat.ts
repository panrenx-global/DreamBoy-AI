// 角色ID
export type CharacterId = string;

// 角色信息
export interface Character {
  id: CharacterId;
  name: string;
  tagline: string;
  tags: string[];
  avatar: string;
  speaker: string;
  systemPrompt: string;
  appearance: string;
}

// 消息类型
export type MessageType = 'text' | 'voice' | 'image' | 'mixed';

// 消息
export interface Message {
  id: string;
  dbId?: number;
  role: 'user' | 'character';
  type: MessageType;
  content: string;
  audioUri?: string;
  imageUri?: string;
  imagePrompt?: string;
  timestamp: number;
}

// 聊天状态
export interface ChatState {
  characters: Character[];
  character: Character | null;
  threadId: number | null;
  messages: Message[];
  isTyping: boolean;
  isGeneratingImage: boolean;
  isLoadingCharacters: boolean;
  isLoadingHistory: boolean;
}

export interface ChatMessagePayload {
  id: string;
  dbId: number;
  role: 'user' | 'character';
  type: MessageType;
  content: string;
  audioUri?: string | null;
  imageUri?: string | null;
  imagePrompt?: string | null;
  timestamp: number;
}

// API 请求/响应类型
export interface ChatRequest {
  characterId: CharacterId;
  content: string;
}

export interface ChatResponse {
  threadId: number;
  reply: string;
  userMessage: ChatMessagePayload;
  assistantMessage: ChatMessagePayload;
  imagePrompt?: string | null;
  error?: string;
  isFallback?: boolean;
}

export interface ChatHistoryResponse {
  threadId: number | null;
  messages: ChatMessagePayload[];
}

export interface CharactersResponse {
  characters: Character[];
}

export interface TTSRequest {
  text: string;
  speaker: string;
  uid: string;
  messageId: number;
}

export interface TTSResponse {
  audioUri: string;
  audioSize: number;
  message?: ChatMessagePayload;
  error?: string;
}

export interface ImageRequest {
  prompt: string;
  threadId: number;
}

export interface ImageResponse {
  imageUri: string;
  imageUrl?: string;
  message?: ChatMessagePayload;
  error?: string;
}
