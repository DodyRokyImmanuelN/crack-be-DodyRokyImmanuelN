import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateModuleDto) {
    // Cek apakah learning path ada
    const learningPath = await this.prisma.learningPath.findUnique({
      where: { id: dto.learningPathId },
    });

    if (!learningPath) {
      throw new NotFoundException('Learning path not found');
    }
    const baseSlug = slugify(dto.title, { lower: true, strict: true });
    const slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;

    return this.prisma.module.create({
      data: {
        title: dto.title,
        description: dto.description,
        order: dto.order,
        learningPathId: dto.learningPathId,
        slug,
      },
    });
  }

  async findByLearningPath(learningPathId: string) {
    // Cek apakah learning path ada
    const learningPath = await this.prisma.learningPath.findUnique({
      where: { id: learningPathId },
    });

    if (!learningPath) {
      throw new NotFoundException('Learning path not found');
    }

    return this.prisma.module.findMany({
      where: { learningPathId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        order: true,
        _count: {
          select: { lessons: true },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const module = await this.prisma.module.findUnique({
      where: { slug },
      include: {
        learningPath: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            order: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return module;
  }

  async update(id: string, dto: UpdateModuleDto) {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return this.prisma.module.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    await this.prisma.module.delete({ where: { id } });

    return { message: 'Module succesfully deleted' };
  }
}
