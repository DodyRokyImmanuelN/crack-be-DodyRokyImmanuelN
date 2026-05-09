import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()  
@ApiTags('Progress')
@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  // Complete lesson READING
  @ApiOperation({ summary: 'Mark a lesson as complete' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':lessonId/complete')
  async completeLesson(
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.progressService.completeLesson(user.id, lessonId);
    return {
      success: true,
      message: 'Lesson completed successfully',
      data,
    };
  }

  // Get progress user di sebuah module
  @ApiOperation({ summary: 'Get user progress for a module' })
  @UseGuards(JwtAuthGuard)
  @Get('module/:moduleId')
  async getModuleProgress(
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.progressService.getModuleProgress(
      user.id,
      moduleId,
    );
    return {
      success: true,
      message: 'Module progress fetched successfully',
      data,
    };
  }
}