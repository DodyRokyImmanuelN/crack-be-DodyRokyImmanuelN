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
import { AiModule } from './modules/ai/ai.module';
import { UsersModule } from './modules/users/users.module';
import { ThrottlerGuard,ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';


@Module({
  imports: [ ConfigModule.forRoot({
    isGlobal: true,
  }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl:60000,
        limit:100,
      },
      {
        name: 'strict',
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
    PrismaModule,
    LearningPathsModule, 
    ModulesModule, 
    LessonsModule, 
    QuizzesModule, 
    PaymentsModule, 
    ProgressModule, 
    CertificatesModule, 
    EnrollmentsModule, 
    AiModule, 
    UsersModule,],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
