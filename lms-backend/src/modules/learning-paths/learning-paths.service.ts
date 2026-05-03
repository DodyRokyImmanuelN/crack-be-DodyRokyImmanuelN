import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';
import slugify from 'slugify';

@Injectable()
export class LearningPathsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLearningPathDto) {
    // Generate slug dari title
    const slug = slugify(dto.title, {
      lower: true,
      strict: true,
    });

    // Cek apakah slug sudah ada
    const existing = await this.prisma.learningPath.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(
        'Learning path with this title is aleady exists',
      );
    }

    return this.prisma.learningPath.create({
      data: {
        ...dto,
        slug,
      },
    });
  }

  async findAll() {
    // Hanya return yang sudah published (untuk public)
    return this.prisma.learningPath.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        price: true,
        _count: {
          select: { modules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin() {
    // Admin bisa lihat semua termasuk yang draft
    return this.prisma.learningPath.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        price: true,
        isPublished: true,
        _count: {
          select: { modules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const learningPath = await this.prisma.learningPath.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            _count: {
              select: { lessons: true },
            },
          },
        },
      },
    });

    if (!learningPath) {
      throw new NotFoundException('Learning path not found');
    }

    return learningPath;
  }

  async update(id: string, dto: UpdateLearningPathDto) {
    // Cek apakah learning path ada
    const learningPath = await this.prisma.learningPath.findUnique({
      where: { id },
    });

    if (!learningPath) {
      throw new NotFoundException('Learning path not found');
    }

    // Jika title berubah, generate slug baru
    let slug = learningPath.slug;
    if (dto.title && dto.title !== learningPath.title) {
      slug = slugify(dto.title, { lower: true, strict: true });

      // Cek slug baru tidak bentrok
      const existing = await this.prisma.learningPath.findUnique({
        where: { slug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Learning path with this title is already exists',
        );
      }
    }

    return this.prisma.learningPath.update({
      where: { id },
      data: { ...dto, slug },
    });
  }

  async remove(id: string) {
    const learningPath = await this.prisma.learningPath.findUnique({
      where: { id },
    });

    if (!learningPath) {
      throw new NotFoundException('Learning path not found');
    }

    await this.prisma.learningPath.delete({ where: { id } });

    return { message: 'Learning path deleted' };
  }
}