import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLessonDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: dto.moduleId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    if (dto.type === 'READING' && !dto.content) {
      throw new BadRequestException(
        'Content is required for READING type lesson',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          moduleId: dto.moduleId,
          title: dto.title,
          type: dto.type,
          order: dto.order,
        },
      });

      if (dto.type === 'READING') {
        await tx.readingContent.create({
          data: {
            lessonId: lesson.id,
            content: dto.content!,
            videoUrl: dto.videoUrl,
          },
        });
      }

      return lesson;
    });
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        readingContent: true,
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async findByModule(moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
      },
    });
  }

  async update(id: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lesson.update({
        where: { id },
        data: {
          title: dto.title,
          order: dto.order,
        },
      });

      if (lesson.type === 'READING' && (dto.content || dto.videoUrl)) {
        await tx.readingContent.update({
          where: { lessonId: id },
          data: {
            content: dto.content,
            videoUrl: dto.videoUrl,
          },
        });
      }

      return updated;
    });
  }

  async remove(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.prisma.lesson.delete({ where: { id } });

    return { message: 'Lesson deleted successfully' };
  }
}