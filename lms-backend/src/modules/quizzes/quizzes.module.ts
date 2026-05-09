import { Module } from '@nestjs/common';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { EnrollmentGuard } from '../../common/guards/enrollment.guard';

@Module({
  controllers: [QuizzesController],
  providers: [QuizzesService, EnrollmentGuard]
})
export class QuizzesModule {}
