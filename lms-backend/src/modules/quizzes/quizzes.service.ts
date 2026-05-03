import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuizDto) {
    // Cek apakah lesson ada dan tipenya QUIZ
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.type !== 'QUIZ') {
      throw new BadRequestException('Lesson type must be QUIZ');
    }

    // Cek apakah quiz sudah ada untuk lesson ini
    const existingQuiz = await this.prisma.quiz.findUnique({
      where: { lessonId: dto.lessonId },
    });

    if (existingQuiz) {
      throw new BadRequestException('Quiz already exists for this lesson');
    }

    // Buat quiz + questions + options dalam satu transaksi
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

      // Return quiz dengan semua questions dan options
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
    // Ambil quiz beserta jawaban yang benar
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Cek apakah final exam dan sudah pernah dikerjakan
    if (quiz.isFinalExam) {
      const existingAttempt = await this.prisma.quizAttempt.findFirst({
        where: { quizId, userId },
      });

      if (existingAttempt) {
        throw new BadRequestException(
          'Final exam can only be attempted once',
        );
      }
    }

    // Hitung attempt number
    const attemptCount = await this.prisma.quizAttempt.count({
      where: { quizId, userId },
    });

    // Hitung score
    let earnedPoints = 0;
    let totalPoints = 0;

    for (const question of quiz.questions) {
      totalPoints += question.points;

      const userAnswer = dto.answers.find(
        (a) => a.questionId === question.id,
      );

      if (userAnswer) {
        const correctOption = question.options.find(
          (o) => o.id === userAnswer.optionId && o.isCorrect,
        );

        if (correctOption) {
          earnedPoints += question.points;
        }
      }
    }

    const score = totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0;

    const isPassed = score >= quiz.passingScore;

    // Simpan attempt
    await this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        score,
        isPassed,
        attemptNumber: attemptCount + 1,
      },
    });

    // Update progress kalau passed
    if (isPassed) {
      await this.prisma.progress.upsert({
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
        },
        create: {
          userId,
          lessonId: quiz.lessonId,
          status: 'COMPLETED',
          score,
          completedAt: new Date(),
        },
      });
    }

    return {
      score,
      isPassed,
      passingScore: quiz.passingScore,
      attemptNumber: attemptCount + 1,
      earnedPoints,
      totalPoints,
    };
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
                // isCorrect TIDAK dikirim ke user
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
}