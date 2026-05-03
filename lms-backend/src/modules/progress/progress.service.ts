import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async completeLesson(userId: string, lessonId: string) {
    // Cek lesson ada
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

    // Cek hanya lesson READING yang bisa di-complete manual
    if (lesson.type !== 'READING') {
      throw new BadRequestException(
        'Only READING lessons can be manually completed. QUIZ lessons are completed automatically after passing.',
      );
    }

    // Cek user sudah enroll
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

    // Update progress ke COMPLETED
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
      },
      create: {
        userId,
        lessonId,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Cek apakah semua lesson dalam module sudah selesai
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

    // Ambil progress user untuk semua lesson di module ini
    const progresses = await this.prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: module.lessons.map((l) => l.id) },
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

    return {
      moduleId,
      totalLessons: module.lessons.length,
      completedLessons: completedCount,
      percentage: Math.round(
        (completedCount / module.lessons.length) * 100,
      ),
      lessons: lessonsWithProgress,
    };
  }

  private async checkModuleCompletion(
    userId: string,
    moduleId: string,
    learningPathId: string,
  ) {
    // Ambil semua lesson dalam module
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
    });

    // Ambil semua progress COMPLETED untuk lesson di module ini
    const completedProgresses = await this.prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: lessons.map((l) => l.id) },
        status: 'COMPLETED',
      },
    });

    // Kalau semua lesson sudah selesai
    if (completedProgresses.length === lessons.length) {
      // Generate sertifikat modul
      await this.generateModuleCertificate(userId, moduleId);

      // Cek apakah semua module dalam learning path sudah selesai
      await this.checkLearningPathCompletion(userId, learningPathId);
    }
  }

  private async checkLearningPathCompletion(
    userId: string,
    learningPathId: string,
  ) {
    // Ambil semua module dalam learning path
    const modules = await this.prisma.module.findMany({
      where: { learningPathId },
      include: { lessons: true },
    });

    // Cek semua lesson di semua module sudah selesai
    const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));

    const completedProgresses = await this.prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: allLessonIds },
        status: 'COMPLETED',
      },
    });

    if (completedProgresses.length === allLessonIds.length) {
      // Update enrollment status ke COMPLETED
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

      // Generate sertifikat learning path
      await this.generateLearningPathCertificate(userId, learningPathId);
    }
  }

  private async generateModuleCertificate(userId: string, moduleId: string) {
    // Cek apakah sertifikat sudah ada
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