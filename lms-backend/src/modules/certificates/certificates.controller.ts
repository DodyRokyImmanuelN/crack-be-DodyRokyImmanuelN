import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  // Get semua sertifikat milik user yang login
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyCertificates(@CurrentUser() user: { id: string }) {
    const data = await this.certificatesService.getMyCertificates(user.id);
    return {
      success: true,
      message: 'Certificates fetched successfully',
      data,
    };
  }

  // Public — verifikasi keaslian sertifikat
  @Get('verify/:code')
  async verifyCertificate(@Param('code') code: string) {
    const data = await this.certificatesService.verifyCertificate(code);
    return {
      success: true,
      message: 'Certificate is valid',
      data,
    };
  }
}