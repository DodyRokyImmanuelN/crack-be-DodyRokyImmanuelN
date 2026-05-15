import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CertificateType } from '@prisma/client';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuizDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.type !== 'QUIZ') {
      throw new BadRequestException('Lesson type must be QUIZ');
    }

    const existingQuiz = await this.prisma.quiz.findUnique({
      where: { lessonId: dto.lessonId },
    });

    if (existingQuiz) {
      throw new BadRequestException('Quiz already exists for this lesson');
    }

    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          lessonId: dto.lessonId,
          timeLimit: dto.timeLimit,
          passingScore: dto.passingScore,
          isFinalExam: dto.isFinalExam ?? false,
        },
      });

      for (const q of dto.questions) {
        const question = await tx.question.create({
          data: {
            quizId: quiz.id,
            text: q.text,
            points: q.points,
            order: q.order,
          },
        });

        await tx.option.createMany({
          data: q.options.map((opt) => ({
            questionId: question.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        });
      }

      return tx.quiz.findUnique({
        where: { id: quiz.id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: true },
          },
        },
      });
    });
  }

  async submit(quizId: string, userId: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
        },
        lesson: {
          select: {
            moduleId: true,
            module: {
              select: {
                learningPathId: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.isFinalExam) {
      const existingAttempt = await this.prisma.quizAttempt.findFirst({
        where: { quizId, userId },
      });

      if (existingAttempt) {
        throw new BadRequestException('Final exam can only be attempted once');
      }
    }

    const attemptCount = await this.prisma.quizAttempt.count({
      where: { quizId, userId },
    });

    let earnedPoints = 0;
    let totalPoints = 0;

    for (const question of quiz.questions) {
      totalPoints += question.points;

      const userAnswer = dto.answers.find((a) => a.questionId === question.id);

      if (userAnswer) {
        const correctOption = question.options.find(
          (o) => o.id === userAnswer.optionId && o.isCorrect,
        );

        if (correctOption) {
          earnedPoints += question.points;
        }
      }
    }

    const score =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const isPassed = score >= quiz.passingScore;

    // Simpan attempt dan update progress dalam satu transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.quizAttempt.create({
        data: {
          userId,
          quizId,
          score,
          isPassed,
          attemptNumber: attemptCount + 1,
        },
      });

      if (isPassed) {
        await tx.progress.upsert({
          where: {
            userId_lessonId: {
              userId,
              lessonId: quiz.lessonId,
            },
          },
          update: {
            status: 'COMPLETED',
            score,
            completedAt: new Date(),
            lastAccessedAt: new Date(),
          },
          create: {
            userId,
            lessonId: quiz.lessonId,
            status: 'COMPLETED',
            score,
            completedAt: new Date(),
            lastAccessedAt: new Date(),
          },
        });
      }
    });

    // Cek apakah modul selesai setelah kuis ini lulus
    let moduleCompleted = false;
    if (isPassed) {
      moduleCompleted = await this.checkAndIssueCertificate(
        userId,
        quiz.lesson.moduleId,
        quiz.lesson.module.learningPathId,
      );
    }

    return {
      score,
      isPassed,
      passingScore: quiz.passingScore,
      attemptNumber: attemptCount + 1,
      earnedPoints,
      totalPoints,
      moduleCompleted,
    };
  }

  /**
   * Mengecek apakah semua lesson di modul sudah selesai dan menerbitkan sertifikat
   */
  private async checkAndIssueCertificate(
    userId: string,
    moduleId: string,
    learningPathId: string,
  ): Promise<boolean> {
    // 1. Ambil jumlah total lesson dalam modul ini
    const totalLessons = await this.prisma.lesson.count({
      where: { moduleId },
    });

    // 2. Ambil jumlah lesson yang sudah diselesaikan oleh user
    const completedLessons = await this.prisma.progress.count({
      where: {
        userId,
        status: 'COMPLETED',
        lesson: { moduleId },
      },
    });

    // 3. Jika belum semua selesai, keluar
    if (totalLessons !== completedLessons || totalLessons === 0) {
      return false;
    }

    // 4. Cek apakah sertifikat sudah ada untuk menghindari duplikasi
    const existingCertificate = await this.prisma.certificate.findFirst({
      where: {
        userId,
        moduleId,
        type: CertificateType.MODULE,
      },
    });

    if (!existingCertificate) {
      await this.prisma.certificate.create({
        data: {
          userId,
          moduleId,
          type: CertificateType.MODULE,
        },
      });
    }

    await this.checkLearningPathCompletion(userId, learningPathId);
    return true; // Sudah ada sertifikat
  }

  private async checkLearningPathCompletion(
    userId: string,
    learningPathId: string,
  ) {
    const modules = await this.prisma.module.findMany({
      where: { learningPathId },
      include: { lessons: true },
    });

    const allLessonIds = modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.id),
    );

    if (allLessonIds.length === 0) return false;

    const completedProgresses = await this.prisma.progress.count({
      where: {
        userId,
        lessonId: { in: allLessonIds },
        status: 'COMPLETED',
      },
    });

    if (completedProgresses !== allLessonIds.length) return false;

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

    const existingCertificate = await this.prisma.certificate.findFirst({
      where: { userId, learningPathId, type: CertificateType.LEARNING_PATH },
    });

    if (!existingCertificate) {
      await this.prisma.certificate.create({
        data: {
          userId,
          learningPathId,
          type: CertificateType.LEARNING_PATH,
        },
      });
    }

    return true;
  }

  async findByLesson(lessonId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId },
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
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async findByLessonForAdmin(lessonId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async update(id: string, dto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (dto.lessonId && dto.lessonId !== quiz.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId },
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      if (lesson.type !== 'QUIZ') {
        throw new BadRequestException('Lesson type must be QUIZ');
      }

      const existingQuiz = await this.prisma.quiz.findUnique({
        where: { lessonId: dto.lessonId },
      });

      if (existingQuiz && existingQuiz.id !== id) {
        throw new BadRequestException('Quiz already exists for this lesson');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id },
        data: {
          lessonId: dto.lessonId,
          timeLimit: dto.timeLimit,
          passingScore: dto.passingScore,
          isFinalExam: dto.isFinalExam,
        },
      });

      if (dto.questions) {
        await tx.question.deleteMany({
          where: { quizId: id },
        });

        for (const q of dto.questions) {
          const question = await tx.question.create({
            data: {
              quizId: id,
              text: q.text,
              points: q.points,
              order: q.order,
            },
          });

          await tx.option.createMany({
            data: q.options.map((opt) => ({
              questionId: question.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
            })),
          });
        }
      }

      return tx.quiz.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: true },
          },
        },
      });
    });
  }

  async remove(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.prisma.quiz.delete({
      where: { id },
    });

    return { message: 'Quiz deleted successfully' };
  }
}
