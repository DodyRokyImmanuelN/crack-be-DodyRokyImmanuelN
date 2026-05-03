import { IsUUID, IsNotEmpty } from 'class-validator';

export class CompleteLessonDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId!: string;
}