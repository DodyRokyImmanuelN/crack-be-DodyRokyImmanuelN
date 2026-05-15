import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { LessonType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  AiServiceInterface,
  ChatMessage,
  ChatResponse,
} from './interfaces/ai-service.interface';

@Injectable()
export class AiService implements AiServiceInterface {
  private readonly gemini: GoogleGenAI | null;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.model =
      this.configService.get<string>('AI_MODEL') ?? 'gemini-2.5-flash';
    this.gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async chat(params: {
    userId: string;
    scope: 'GENERAL' | 'LESSON';
    lessonId?: string;
    messages: ChatMessage[];
    progressSummary?: string;
  }): Promise<ChatResponse> {
    if (params.scope === 'GENERAL') {
      return this.chatGeneral(params);
    }

    if (!params.lessonId) {
      throw new NotFoundException('Lesson tidak ditemukan');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: params.lessonId },
      include: {
        readingContent: true,
        module: {
          include: {
            learningPath: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                title: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson tidak ditemukan');
    }

    if (lesson.type === LessonType.QUIZ) {
      throw new ForbiddenException('Asisten belajar tidak tersedia saat quiz');
    }

    const progress = await this.prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: params.userId,
          lessonId: params.lessonId,
        },
      },
      select: {
        status: true,
      },
    });

    const latestQuestion =
      [...params.messages].reverse().find((message) => message.role === 'user')
        ?.content ?? '';

    const fallbackMessage = this.buildContextualResponse({
      question: latestQuestion,
      lessonTitle: lesson.title,
      moduleTitle: lesson.module.title,
      learningPathTitle: lesson.module.learningPath.title,
      content: lesson.readingContent?.content ?? '',
      moduleLessons: lesson.module.lessons,
      progressSummary: params.progressSummary,
      progressStatus: progress?.status,
    });
    const prompt = this.buildLessonPrompt({
      question: latestQuestion,
      lessonTitle: lesson.title,
      moduleTitle: lesson.module.title,
      learningPathTitle: lesson.module.learningPath.title,
      content: lesson.readingContent?.content ?? '',
      moduleLessons: lesson.module.lessons,
      progressSummary: params.progressSummary,
      progressStatus: progress?.status,
      history: params.messages,
    });
    const geminiMessage = await this.generateWithGemini(prompt);

    return {
      message: geminiMessage ?? fallbackMessage,
      model: geminiMessage ? this.model : 'contextual-fallback',
    };
  }

  private async chatGeneral(params: {
    userId: string;
    messages: ChatMessage[];
    progressSummary?: string;
  }): Promise<ChatResponse> {
    const [enrollments, certificates] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId: params.userId },
        include: {
          learningPath: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.certificate.findMany({
        where: { userId: params.userId },
        include: {
          module: { select: { title: true } },
          learningPath: { select: { title: true } },
        },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    const latestQuestion =
      [...params.messages].reverse().find((message) => message.role === 'user')
        ?.content ?? '';
    const activeCourses = enrollments.filter(
      (enrollment) => enrollment.status === 'ACTIVE',
    );
    const completedCourses = enrollments.filter(
      (enrollment) => enrollment.status === 'COMPLETED',
    );
    const courseSummary =
      enrollments.length > 0
        ? enrollments
            .map(
              (enrollment) =>
                `- ${enrollment.learningPath.title}: ${enrollment.status}`,
            )
            .join('\n')
        : 'Belum ada kursus yang diikuti.';
    const certificateSummary =
      certificates.length > 0
        ? certificates
            .slice(0, 5)
            .map((certificate) => {
              const title =
                certificate.learningPath?.title ??
                certificate.module?.title ??
                'Sertifikat';
              return `- ${title} (${certificate.type})`;
            })
            .join('\n')
        : 'Belum ada sertifikat.';
    const fallbackMessage = [
      `Aku melihat ringkasan dashboard kamu.`,
      `Pertanyaan kamu: "${latestQuestion || 'Bantu ringkas progresku'}"`,
      `Total kursus: ${enrollments.length}. Berjalan: ${activeCourses.length}. Selesai: ${completedCourses.length}.`,
      `Daftar kursus:\n${courseSummary}`,
      `Sertifikat:\n${certificateSummary}`,
      params.progressSummary
        ? `Ringkasan dari frontend: ${params.progressSummary}`
        : undefined,
      activeCourses[0]
        ? `Rekomendasi lanjut: buka lagi kursus "${activeCourses[0].learningPath.title}" dan lanjutkan lesson berikutnya.`
        : 'Rekomendasi lanjut: ambil kursus baru atau ulangi materi yang sudah selesai untuk memperkuat pemahaman.',
      'Catatan: mode ini masih fallback berbasis data LMS. Nanti saat model AI dipilih, responsnya bisa lebih natural.',
    ]
      .filter(Boolean)
      .join('\n\n');
    const prompt = this.buildGeneralPrompt({
      question: latestQuestion,
      courseSummary,
      certificateSummary,
      activeCoursesCount: activeCourses.length,
      completedCoursesCount: completedCourses.length,
      totalCourses: enrollments.length,
      progressSummary: params.progressSummary,
      history: params.messages,
    });
    const geminiMessage = await this.generateWithGemini(prompt);

    return {
      message: geminiMessage ?? fallbackMessage,
      model: geminiMessage ? this.model : 'contextual-fallback',
    };
  }

  private async generateWithGemini(prompt: string) {
    if (!this.gemini) return null;

    try {
      const response = await this.gemini.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      return response.text?.trim() || null;
    } catch (error) {
      console.warn('Gemini request failed, using fallback response:', error);
      return null;
    }
  }

  private buildLessonPrompt({
    question,
    lessonTitle,
    moduleTitle,
    learningPathTitle,
    content,
    moduleLessons,
    progressSummary,
    progressStatus,
    history,
  }: {
    question: string;
    lessonTitle: string;
    moduleTitle: string;
    learningPathTitle: string;
    content: string;
    moduleLessons: Array<{ title: string; order: number }>;
    progressSummary?: string;
    progressStatus?: string;
    history: ChatMessage[];
  }) {
    const historyText = history
      .filter((message) => message.role !== 'system')
      .slice(-8)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    return [
      'Kamu adalah asisten belajar di aplikasi LMS.',
      'Jawab dalam bahasa Indonesia yang jelas, ramah, dan ringkas.',
      'Batasi jawaban maksimal 5 bullet pendek atau maksimal 2 paragraf pendek.',
      'Jangan terlalu promosi, jangan terlalu banyak pujian, dan jangan mengulang data yang tidak ditanya.',
      'Jika user hanya menyapa, balas singkat lalu tawarkan bantuan spesifik tentang lesson.',
      'Gunakan hanya konteks lesson yang diberikan. Jika pertanyaan di luar konteks, arahkan user kembali ke materi.',
      'Jangan pernah memberikan jawaban quiz, kunci jawaban, atau cara menyontek.',
      `Learning path: ${learningPathTitle}`,
      `Module: ${moduleTitle}`,
      `Lesson: ${lessonTitle}`,
      progressStatus ? `Status progres lesson: ${progressStatus}` : undefined,
      progressSummary ? `Ringkasan progres: ${progressSummary}` : undefined,
      `Urutan lesson dalam modul:\n${moduleLessons
        .sort((a, b) => a.order - b.order)
        .map((lesson) => `${lesson.order}. ${lesson.title}`)
        .join('\n')}`,
      `Konten lesson:\n${content || '(Konten lesson belum tersedia)'}`,
      `Riwayat chat terakhir:\n${historyText}`,
      `Pertanyaan terbaru user: ${question || 'Bantu jelaskan materi ini'}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildGeneralPrompt({
    question,
    courseSummary,
    certificateSummary,
    activeCoursesCount,
    completedCoursesCount,
    totalCourses,
    progressSummary,
    history,
  }: {
    question: string;
    courseSummary: string;
    certificateSummary: string;
    activeCoursesCount: number;
    completedCoursesCount: number;
    totalCourses: number;
    progressSummary?: string;
    history: ChatMessage[];
  }) {
    const historyText = history
      .filter((message) => message.role !== 'system')
      .slice(-8)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    return [
      'Kamu adalah asisten belajar di dashboard LMS.',
      'Jawab dalam bahasa Indonesia yang jelas, ramah, dan praktis.',
      'Batasi jawaban maksimal 5 bullet pendek atau maksimal 2 paragraf pendek.',
      'Jangan terlalu promosi, jangan terlalu banyak pujian, dan jangan merangkum semua data kecuali user memintanya.',
      'Jika user hanya menyapa, balas singkat lalu tawarkan bantuan seperti cek progres, rekomendasi belajar, atau sertifikat.',
      'Fokus pada progres belajar, rekomendasi langkah berikutnya, sertifikat, dan motivasi belajar.',
      'Jangan membahas jawaban quiz atau meminta user menyontek.',
      `Total kursus: ${totalCourses}`,
      `Kursus berjalan: ${activeCoursesCount}`,
      `Kursus selesai: ${completedCoursesCount}`,
      progressSummary
        ? `Ringkasan progres frontend: ${progressSummary}`
        : undefined,
      `Daftar kursus:\n${courseSummary}`,
      `Sertifikat:\n${certificateSummary}`,
      `Riwayat chat terakhir:\n${historyText}`,
      `Pertanyaan terbaru user: ${question || 'Bantu ringkas progresku'}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildContextualResponse({
    question,
    lessonTitle,
    moduleTitle,
    learningPathTitle,
    content,
    moduleLessons,
    progressSummary,
    progressStatus,
  }: {
    question: string;
    lessonTitle: string;
    moduleTitle: string;
    learningPathTitle: string;
    content: string;
    moduleLessons: Array<{ title: string; order: number }>;
    progressSummary?: string;
    progressStatus?: string;
  }) {
    const cleanContent = content
      .replace(/[#>*_`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const excerpt = cleanContent.slice(0, 900);
    const nextLessons = moduleLessons
      .sort((a, b) => a.order - b.order)
      .map((lesson) => `${lesson.order}. ${lesson.title}`)
      .join('\n');

    if (!cleanContent) {
      return [
        `Aku sudah melihat konteks lesson "${lessonTitle}", tapi belum ada konten reading yang bisa kupakai sebagai sumber jawaban.`,
        'Coba tanyakan hal yang lebih umum tentang modul ini, atau cek apakah konten lesson sudah diisi dari admin.',
      ].join('\n\n');
    }

    return [
      `Konteks saat ini: ${learningPathTitle} > ${moduleTitle} > ${lessonTitle}.`,
      progressStatus
        ? `Status progres lesson kamu: ${progressStatus}.`
        : 'Lesson ini belum punya progres yang tercatat.',
      progressSummary ? `Ringkasan progres: ${progressSummary}` : undefined,
      `Pertanyaan kamu: "${question || 'Bantu jelaskan materi ini'}"`,
      `Berdasarkan materi lesson ini, bagian pentingnya adalah: ${excerpt}${
        cleanContent.length > excerpt.length ? '...' : ''
      }`,
      `Urutan lesson di modul ini:\n${nextLessons}`,
      'Catatan: mode ini masih memakai jawaban fallback berbasis konteks. Nanti setelah model AI dipilih, responsnya bisa dibuat lebih natural dan interaktif.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
}
