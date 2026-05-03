import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  // PUBLIC — ambil quiz by lesson (tanpa jawaban benar)
  @Get('lesson/:lessonId')
  async findByLesson(@Param('lessonId') lessonId: string) {
    const data = await this.quizzesService.findByLesson(lessonId);
    return {
      success: true,
      message: 'Quiz fetched successfully',
      data,
    };
  }

  // PROTECTED — submit jawaban quiz
  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  async submit(
    @Param('id') quizId: string,
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.quizzesService.submit(quizId, user.id, dto);
    return {
      success: true,
      message: data.isPassed ? 'Congratulations! You passed!' : 'You did not pass. Try again!',
      data,
    };
  }

  // ADMIN ONLY — buat quiz
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateQuizDto) {
    const data = await this.quizzesService.create(dto);
    return {
      success: true,
      message: 'Quiz created successfully',
      data,
    };
  }
}