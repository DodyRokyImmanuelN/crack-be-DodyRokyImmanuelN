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
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Modules')
@Controller('modules')
export class ModulesController {
  constructor(private modulesService: ModulesService) {}

  // PUBLIC — lihat modul berdasarkan learning path
  @ApiOperation({ summary: 'Get modules by learning path' })
  @Get()
  async findByLearningPath(@Query('learningPathId') learningPathId: string) {
    const data = await this.modulesService.findByLearningPath(learningPathId);
    return {
      success: true,
      message: 'Modules successfuly taken',
      data,
    };
  }

  @ApiOperation({ summary: 'Get module details by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.modulesService.findOne(id);
    return {
      success: true,
      message: 'Module successfuly taken',
      data,
    };
  }

  // ADMIN ONLY
  @ApiOperation({ summary: 'Admin — create a module' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateModuleDto) {
    const data = await this.modulesService.create(dto);
    return {
      success: true,
      message: 'Module successfuly created',
      data,
    };
  }
  @ApiOperation({ summary: 'Admin — update a module' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateModuleDto,
  ) {
    const data = await this.modulesService.update(id, dto);
    return {
      success: true,
      message: 'Module successfuly updated',
      data,
    };
  }

  @ApiOperation({ summary: 'Admin — delete a module' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.modulesService.remove(id);
    return {
      success: true,
      message: 'Module successfuly deleted',
    };
  }
}