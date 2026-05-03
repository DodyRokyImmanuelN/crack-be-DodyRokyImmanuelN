import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOptionDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsNumber()
  @Min(1)
  points!: number;

  @IsNumber()
  @Min(1)
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options!: CreateOptionDto[];
}

export class CreateQuizDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId!: string;

  @IsNumber()
  @Min(60)
  timeLimit!: number; // dalam detik, minimal 60 detik

  @IsNumber()
  @Min(1)
  passingScore!: number; // persentase 1-100

  @IsBoolean()
  @IsOptional()
  isFinalExam?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}