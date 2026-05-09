import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
    description:
      'Send Messages and get response from AI',
  })
  @ApiResponse({ status: 200, description: 'Respons dari AI' })
  @ApiResponse({ status: 501, description: 'AI belum diimplementasi' })
  async chat(@Body() chatDto: ChatDto) {
    return this.aiService.chat(chatDto.messages);
  }
}