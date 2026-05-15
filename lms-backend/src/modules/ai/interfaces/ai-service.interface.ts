export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  model: string;
  tokenUsed?: number;
}

export interface AiServiceInterface {
  chat(params: {
    userId: string;
    scope: 'GENERAL' | 'LESSON';
    lessonId?: string;
    messages: ChatMessage[];
    progressSummary?: string;
  }): Promise<ChatResponse>;
}
