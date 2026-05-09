export interface ChatMessage {
    role : 'user' | 'assistant' | 'system';
    content: string;   
}

export interface ChatResponse {
    message: string;
    model: string;
    tokenUsed?: number;
}

export interface AiServiceInterface {
    chat(message: ChatMessage[]): Promise<ChatResponse>;
}