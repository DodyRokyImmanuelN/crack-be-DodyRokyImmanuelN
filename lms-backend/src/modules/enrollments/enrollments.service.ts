import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async getMyEnrollments(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        learningPath: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            modules: {
              select: {
                id: true,
                _count: {
                  select: { lessons: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Hitung progress keseluruhan per learning path
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const allLessonIds = await this.prisma.lesson.findMany({
          where: {
            module: {
              learningPathId: enrollment.learningPathId,
            },
          },
          select: { id: true },
        });

        const completedLessons = await this.prisma.progress.count({
          where: {
            userId,
            lessonId: { in: allLessonIds.map((l) => l.id) },
            status: 'COMPLETED',
          },
        });

        const totalLessons = allLessonIds.length;
        const percentage = totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        return {
          id: enrollment.id,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          learningPath: enrollment.learningPath,
          progress: {
            completedLessons,
            totalLessons,
            percentage,
          },
        };
      }),
    );

    return enrollmentsWithProgress;
  }
}