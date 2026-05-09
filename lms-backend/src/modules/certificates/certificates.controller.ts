import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  // Get semua sertifikat milik user yang login
  @ApiOperation({ summary: 'Get current user certificates' })
  @ApiBearerAuth()
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
  @ApiOperation({ summary: 'Verify certificate authenticity by code' })
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