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

@Controller('lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  // PUBLIC
  @Get()
  async findByModule(@Query('moduleId') moduleId: string) {
    const data = await this.lessonsService.findByModule(moduleId);
    return {
      success: true,
      message: 'Lessons fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.lessonsService.findOne(id);
    return {
      success: true,
      message: 'Lesson fetched successfully',
      data,
    };
  }

  // ADMIN ONLY
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    const data = await this.lessonsService.update(id, dto);
    return {
      success: true,
      message: 'Lesson updated successfully',
      data,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.lessonsService.remove(id);
    return {
      success: true,
      message: data.message,
    };
  }
}