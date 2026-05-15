import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async trackLessonAccess(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    return this.prisma.progress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        lastAccessedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        status: 'NOT_STARTED',
        lastAccessedAt: new Date(),
      },
    });
  }

  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            learningPath: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.type !== 'READING') {
      throw new BadRequestException(
        'Only READING lessons can be manually completed. QUIZ lessons are completed automatically after passing.',
      );
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId: lesson.module.learningPathId,
        },
      },
    });

    if (!enrollment) {
      throw new BadRequestException(
        'You are not enrolled in this learning path',
      );
    }

    const progress = await this.prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lastAccessedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        status: 'COMPLETED',
        completedAt: new Date(),
        lastAccessedAt: new Date(),
      },
    });

    await this.checkModuleCompletion(
      userId,
      lesson.moduleId,
      lesson.module.learningPathId,
    );

    return progress;
  }

  async getModuleProgress(userId: string, moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    const progresses = await this.prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: module.lessons.map((l) => l.id) },
      },
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    const lessonsWithProgress = module.lessons.map((lesson) => {
      const progress = progresses.find((p) => p.lessonId === lesson.id);
      return {
        ...lesson,
        progress: progress?.status ?? 'NOT_STARTED',
        score: progress?.score ?? null,
        completedAt: progress?.completedAt ?? null,
      };
    });

    const completedCount = lessonsWithProgress.filter(
      (l) => l.progress === 'COMPLETED',
    ).length;

    // Ambil lesson yang paling terakhir diakses
    const lastAccessedProgress = progresses.find(
      (p) => p.lastAccessedAt !== null,
    );
    const lastAccessedLesson = lastAccessedProgress
      ? module.lessons.find((l) => l.id === lastAccessedProgress.lessonId)
      : null;

    return {
      moduleId,
      totalLessons: module.lessons.length,
      completedLessons: completedCount,
      percentage: Math.round(
        (completedCount / module.lessons.length) * 100,
      ),
      lastAccessedLessonSlug: lastAccessedLesson?.slug ?? null,
      lessons: lessonsWithProgress,
    };
  }

  private async checkModuleCompletion(
    userId: string,
    moduleId: string,
    learningPathId: string,
  ) {
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
    });

    const completedProgresses = await this.prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: lessons.map((l) => l.id) },
        status: 'COMPLETED',
      },
    });

    if (completedProgresses.length === lessons.length) {
      await this.generateModuleCertificate(userId, moduleId);
      await this.checkLearningPathCompletion(userId, learningPathId);
    }
  }

  private async checkLearningPathCompletion(
    userId: string,
    learningPathId: string,
  ) {
    const modules = await this.prisma.module.findMany({
      where: { learningPathId },
      include: { lessons: true },
    });

    const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));

    const completedProgresses = await this.prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: allLessonIds },
        status: 'COMPLETED',
      },
    });

    if (completedProgresses.length === allLessonIds.length) {
      await this.prisma.enrollment.update({
        where: {
          userId_learningPathId: {
            userId,
            learningPathId,
          },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await this.generateLearningPathCertificate(userId, learningPathId);
    }
  }

  private async generateModuleCertificate(userId: string, moduleId: string) {
    const existing = await this.prisma.certificate.findFirst({
      where: { userId, moduleId, type: 'MODULE' },
    });

    if (existing) return existing;

    return this.prisma.certificate.create({
      data: {
        userId,
        moduleId,
        type: 'MODULE',
      },
    });
  }

  private async generateLearningPathCertificate(
    userId: string,
    learningPathId: string,
  ) {
    const existing = await this.prisma.certificate.findFirst({
      where: { userId, learningPathId, type: 'LEARNING_PATH' },
    });

    if (existing) return existing;

    return this.prisma.certificate.create({
      data: {
        userId,
        learningPathId,
        type: 'LEARNING_PATH',
      },
    });
  }
}