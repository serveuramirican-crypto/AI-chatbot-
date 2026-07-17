export type MessageRole = 'user' | 'agent' | 'admin';

export interface ProductRecommendation {
  id: string;
  name: string;
  image: string;
  price: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  products?: ProductRecommendation[];
}

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Conversation {
  id: string;
  user: ChatUser;
  messages: ChatMessage[];
  lastInteraction: string;
  isTakenOver: boolean; // True if the admin (human) is controlling the chat
}
