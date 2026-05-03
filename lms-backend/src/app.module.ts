import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './database/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { LearningPathsModule } from './modules/learning-paths/learning-paths.module';
import { ModulesModule } from './modules/modules/modules.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProgressModule } from './modules/progress/progress.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';

@Module({
  imports: [ ConfigModule.forRoot({
    isGlobal: true,
  }),  AuthModule, PrismaModule, LearningPathsModule, ModulesModule, LessonsModule, QuizzesModule, PaymentsModule, ProgressModule, CertificatesModule, EnrollmentsModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
