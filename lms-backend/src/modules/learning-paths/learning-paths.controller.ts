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
import { LearningPathsService } from './learning-paths.service';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Learning Paths')
@Controller('learning-paths')
export class LearningPathsController {
  constructor(private learningPathsService: LearningPathsService) {}

  // PUBLIC — semua orang bisa akses
  @ApiOperation({ summary: 'Get all learning paths' })
  @Get()
  async findAll() {
    const data = await this.learningPathsService.findAll();
    return {
      success: true,
      message: 'Learning paths successfully taken',
      data,
    };
  }

  @ApiOperation({ summary: 'Get learning path details by slug' })
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const data = await this.learningPathsService.findBySlug(slug);
    return {
      success: true,
      message: 'Learning path successfully taken',
      data,
    };
  }

  // ADMIN ONLY
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin — get all learning paths' })
  @Get('admin/all')
  async findAllAdmin() {
    const data = await this.learningPathsService.findAllAdmin();
    return {
      success: true,
      message: 'All learning paths successfully taken',
      data,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin — create a learning path' })
  @Post()
  async create(@Body() dto: CreateLearningPathDto) {
    const data = await this.learningPathsService.create(dto);
    return {
      success: true,
      message: 'Learning path successfully created',
      data,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin — update a learning path' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLearningPathDto,
  ) {
    const data = await this.learningPathsService.update(id, dto);
    return {
      success: true,
      message: 'Learning path successfully updated',
      data,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin — delete a learning path' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.learningPathsService.remove(id);
    return {
      success: true,
      message: data.message,
    };
  }
}