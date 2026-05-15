import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat dengan AI',
    description: 'Asisten belajar berdasarkan lesson yang sedang dibuka',
  })
  @ApiResponse({ status: 200, description: 'Respons dari AI' })
  async chat(@CurrentUser('id') userId: string, @Body() chatDto: ChatDto) {
    return this.aiService.chat({
      userId,
      scope: chatDto.scope,
      lessonId: chatDto.lessonId,
      messages: chatDto.messages,
      progressSummary: chatDto.progressSummary,
    });
  }
}
