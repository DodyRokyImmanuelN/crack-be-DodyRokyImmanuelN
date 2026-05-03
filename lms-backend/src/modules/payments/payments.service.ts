import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import Xendit from 'xendit-node';

const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY!,
});

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(userId: string, dto: CreateInvoiceDto) {
    // Cek learning path ada
    const learningPath = await this.prisma.learningPath.findUnique({
      where: { id: dto.learningPathId },
    });

    if (!learningPath) {
      throw new NotFoundException('Learning path not found');
    }

    // Cek user belum enroll
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId: dto.learningPathId,
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException(
        'You are already enrolled in this learning path',
      );
    }

    // Cek apakah ada payment pending yang belum diselesaikan
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        userId,
        learningPathId: dto.learningPathId,
        status: 'PENDING',
      },
    });

    if (existingPayment && existingPayment.xenditPaymentUrl) {
      // Return payment URL yang sudah ada
      return {
        paymentUrl: existingPayment.xenditPaymentUrl,
        invoiceId: existingPayment.xenditInvoiceId,
      };
    }

    // Ambil data user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Buat invoice di Xendit
    const invoice = await xendit.Invoice.createInvoice({
      data: {
        externalId: `payment-${userId}-${dto.learningPathId}-${Date.now()}`,
        amount: learningPath.price,
        payerEmail: user!.email,
        description: `Pembayaran untuk: ${learningPath.title}`,
        invoiceDuration: 86400, // 24 jam dalam detik
        successRedirectUrl: `${process.env.FRONTEND_URL}/payment/success`,
        failureRedirectUrl: `${process.env.FRONTEND_URL}/payment/failed`,
      },
    });

    // Simpan payment ke database
    await this.prisma.payment.create({
      data: {
        userId,
        learningPathId: dto.learningPathId,
        amount: learningPath.price,
        status: 'PENDING',
        xenditInvoiceId: invoice.id,
        xenditPaymentUrl: invoice.invoiceUrl,
        expiredAt: new Date(Date.now() + 86400 * 1000),
      },
    });

    return {
      paymentUrl: invoice.invoiceUrl,
      invoiceId: invoice.id,
    };
  }

  async handleWebhook(payload: any) {
    const { external_id, status } = payload;

    if (status !== 'PAID') {
      return { received: true };
    }

    // Cari payment berdasarkan xenditInvoiceId
    const payment = await this.prisma.payment.findFirst({
      where: { xenditInvoiceId: payload.id },
    });

    if (!payment) {
      return { received: true };
    }

    // Update status payment
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Auto enroll user
    await this.enrollUser(payment.userId, payment.learningPathId);

    return { received: true };
  }

  private async enrollUser(userId: string, learningPathId: string) {
    // Buat enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        learningPathId,
        status: 'ACTIVE',
      },
    });

    // Ambil semua lesson dalam learning path
    const lessons = await this.prisma.lesson.findMany({
      where: {
        module: {
          learningPathId,
        },
      },
    });

    // Buat progress awal untuk setiap lesson
    await this.prisma.progress.createMany({
      data: lessons.map((lesson) => ({
        userId,
        lessonId: lesson.id,
        status: 'NOT_STARTED' as const,
      })),
      skipDuplicates: true,
    });

    return enrollment;
  }
}