import { Module } from '@nestjs/common';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { EnrollmentGuard } from '../../common/guards/enrollment.guard';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LessonsController],
  providers: [LessonsService, EnrollmentGuard]
})
export class LessonsModule {}
