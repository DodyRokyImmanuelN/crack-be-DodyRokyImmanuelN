import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async getMyCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { userId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
          },
        },
        learningPath: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async verifyCertificate(code: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        module: {
          select: {
            id: true,
            title: true,
          },
        },
        learningPath: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found or invalid');
    }

    return {
      isValid: true,
      certificate: {
        code: certificate.code,
        type: certificate.type,
        issuedAt: certificate.issuedAt,
        issuedTo: certificate.user.name,
        module: certificate.module,
        learningPath: certificate.learningPath,
      },
    };
  }
}