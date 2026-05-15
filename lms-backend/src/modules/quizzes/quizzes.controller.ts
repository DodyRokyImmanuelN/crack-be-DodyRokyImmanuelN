import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EnrollmentGuard } from '../../common/guards/enrollment.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(
    private quizzesService: QuizzesService,
    private prisma: PrismaService,
  ) {}

  // PUBLIC — ambil quiz by lesson (tanpa jawaban benar)
  @ApiOperation({ summary: 'Get quizzes for a lesson' })
  @ApiBearerAuth()
  @Get('lesson/:lessonId')
  @UseGuards(JwtAuthGuard, EnrollmentGuard)
  async findByLesson(@Param('lessonId') lessonId: string) {
    const data = await this.quizzesService.findByLesson(lessonId);
    return {
      success: true,
      message: 'Quiz fetched successfully',
      data,
    };
  }

  // ADMIN ONLY — ambil quiz lengkap termasuk jawaban benar
  @ApiOperation({ summary: 'Admin — get quiz details for a lesson' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/lesson/:lessonId')
  async findByLessonForAdmin(@Param('lessonId') lessonId: string) {
    const data = await this.quizzesService.findByLessonForAdmin(lessonId);
    return {
      success: true,
      message: 'Quiz fetched successfully',
      data,
    };
  }

  // Get last attempt untuk quiz tertentu
  @ApiOperation({ summary: 'Get last attempt for a quiz' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/last-attempt')
  async getLastAttempt(
    @Param('id') quizId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.prisma.quizAttempt.findFirst({
      where: { quizId, userId: user.id },
      orderBy: { submittedAt: 'desc' },
    });
    return {
      success: true,
      message: 'Last attempt fetched successfully',
      data,
    };
  }

  // PROTECTED — submit jawaban quiz
  @ApiOperation({ summary: 'Submit quiz answers' })
  @ApiBearerAuth()
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
      message: data.isPassed
        ? 'Congratulations! You passed!'
        : 'You did not pass. Try again!',
      data,
    };
  }

  // ADMIN ONLY — buat quiz
  @ApiOperation({ summary: 'Admin — create a quiz' })
  @ApiBearerAuth()
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

  // ADMIN ONLY — update quiz
  @ApiOperation({ summary: 'Admin — update a quiz' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    const data = await this.quizzesService.update(id, dto);
    return {
      success: true,
      message: 'Quiz updated successfully',
      data,
    };
  }

  // ADMIN ONLY — delete quiz
  @ApiOperation({ summary: 'Admin — delete a quiz' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.quizzesService.remove(id);
    return {
      success: true,
      message: data.message,
    };
  }
}
