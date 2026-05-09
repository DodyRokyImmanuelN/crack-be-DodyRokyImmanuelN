import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiServiceInterface, ChatMessage, ChatResponse } from './interfaces/ai-service.interface';

@Injectable()
export class AiService implements AiServiceInterface{
    constructor(private readonly configService: ConfigService) {}

    async chat(messages: ChatMessage[]): Promise<ChatResponse> {
        /**
     * 
     *
     * Nanti di sini bisa disambungkan ke:
     *   - OpenAI   → import OpenAI from 'openai'
     *   - Gemini   → import { GoogleGenerativeAI } from '@google/generative-ai'
     *   - Claude   → import Anthropic from '@anthropic-ai/sdk'
     *
     * Semua provider cukup ikuti interface AiServiceInterface di atas.
     *
     * Contoh context yang bisa dipakai:
     *   - konten markdown dari ReadingContent sebagai system prompt
     *   - progress user untuk rekomendasi lesson berikutnya
     */
        throw new NotImplementedException(
            'AiService is not implemented yet. Please implement the chat method to handle AI interactions.',
        );
    }
}
