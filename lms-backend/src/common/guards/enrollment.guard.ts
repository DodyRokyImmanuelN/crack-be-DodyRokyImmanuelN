import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const lessonId = request.params.id || request.params.lessonId;

    if (!lessonId) return true;

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

    if (!lesson) throw new NotFoundException('Lesson not found');

    const learningPathId = lesson.module.learningPath.id;

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        learningPathId,
        status: {
          in: ['ACTIVE', 'COMPLETED'],
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You have not enrolled for this learning path',
      );
    }

    return true;
  }
}
