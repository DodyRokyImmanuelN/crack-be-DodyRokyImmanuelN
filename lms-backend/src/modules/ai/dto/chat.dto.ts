import {IsArray, IsEnum, IsString, ValidateNested} from 'class-validator';
import { ChatMessage } from '../interfaces/ai-service.interface';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';


export class ChatMessageDto implements ChatMessage {
    @ApiProperty({ enum: ['user', 'assistant', 'system'] })
    @IsEnum (['user', 'assistant', 'system'])
    role!: 'user' | 'assistant' | 'system';

    @ApiProperty({example: 'Hello, how can I assist you today?'})
    @IsString()
    content!: string;
}

export class ChatDto {
    @ApiProperty({ type: [ChatMessageDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    messages!: ChatMessageDto[];
}