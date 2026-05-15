import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EnrollmentGuard } from '../../common/guards/enrollment.guard';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  // PUBLIC
  @ApiOperation({ summary: 'Get lessons by module' })
  @Get()
  async findByModule(@Query('moduleId') moduleId: string) {
    if (!moduleId) {
      return {
        success: false,
        message: 'moduleId query is required',
        data: [],
      };
    }

    const data = await this.lessonsService.findByModule(moduleId);
    return {
      success: true,
      message: 'Lessons retrieved successfully',
      data,
    };
  }

  @ApiOperation({ summary: 'Get lesson detail by slug' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EnrollmentGuard)
  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const data = await this.lessonsService.findBySlug(slug);
    return {
      success: true,
      message: 'Lesson retrieved successfully',
      data,
    };
  }

  // ADMIN ONLY
  @ApiOperation({ summary: 'Admin — create a lesson' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateLessonDto) {
    const data = await this.lessonsService.create(dto);
    return {
      success: true,
      message: 'Lesson created successfully',
      data,
    };
  }

  @ApiOperation({ summary: 'Admin — update a lesson' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    const data = await this.lessonsService.update(id, dto);
    return {
      success: true,
      message: 'Lesson updated successfully',
      data,
    };
  }

  @ApiOperation({ summary: 'Admin — delete a lesson' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.lessonsService.remove(id);
    return {
      success: true,
      message: 'Lesson deleted successfully',
    };
  }
}