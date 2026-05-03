import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyEnrollments(@CurrentUser() user: { id: string }) {
    const data = await this.enrollmentsService.getMyEnrollments(user.id);
    return {
      success: true,
      message: 'Enrollments fetched successfully',
      data,
    };
  }
}