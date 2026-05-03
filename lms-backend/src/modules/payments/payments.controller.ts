import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // User buat invoice untuk subscribe learning path
  @UseGuards(JwtAuthGuard)
  @Post('create-invoice')
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.paymentsService.createInvoice(user.id, dto);
    return {
      success: true,
      message: 'Invoice created successfully',
      data,
    };
  }

  // Webhook dari Xendit — tidak pakai JWT tapi pakai webhook token
  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    // Verifikasi webhook token dari Xendit
    if (callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    const data = await this.paymentsService.handleWebhook(payload);
    return data;
  }
}