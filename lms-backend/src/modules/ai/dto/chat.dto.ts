import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ChatMessage } from '../interfaces/ai-service.interface';

export class ChatMessageDto implements ChatMessage {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsEnum(['user', 'assistant', 'system'])
  role!: 'user' | 'assistant' | 'system';

  @ApiProperty({ example: 'Apa inti dari lesson ini?' })
  @IsString()
  content!: string;
}

export class ChatDto {
  @ApiProperty({
    enum: ['GENERAL', 'LESSON'],
    default: 'LESSON',
    description: 'GENERAL untuk dashboard, LESSON untuk materi tertentu',
  })
  @IsIn(['GENERAL', 'LESSON'])
  scope!: 'GENERAL' | 'LESSON';

  @ApiProperty({
    required: false,
    example: '5d1f0d8c-3454-48f9-9d36-27f6efbd51f7',
    description: 'Wajib untuk scope LESSON',
  })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @ApiProperty({
    required: false,
    description: 'Progress ringkas dari frontend, opsional',
  })
  @IsOptional()
  @IsString()
  progressSummary?: string;
}
