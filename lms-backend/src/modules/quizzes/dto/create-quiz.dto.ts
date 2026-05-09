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
import { ApiProperty } from '@nestjs/swagger';

export class CreateOptionDto {

  @ApiProperty({
    example: 'JavaScript is a programming language...',
    description: 'Text of the option',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiProperty({
    example: false,
    description: 'Whether the option is correct',
  })
  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({
    example: 'What is JavaScript?',
    description: 'Text of the question',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiProperty({
    example: 10,
    description: 'Points for correct answer',
  })
  @IsNumber()
  @Min(1)
  points!: number;

  @ApiProperty({
    example: 1,
    description: 'Order of the question within the quiz',
  })
  @IsNumber()
  @Min(1)
  order!: number;

  @ApiProperty({
    example: [
      {
        text: 'JavaScript is a programming language...',
        isCorrect: false
      }
    ],
    description: 'Options for the question'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options!: CreateOptionDto[];
}

export class CreateQuizDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the lesson this quiz belongs to',
  })
  @IsUUID()
  @IsNotEmpty()
  lessonId!: string;

  @ApiProperty({
    example: 300,
    description: 'Time limit for the quiz in seconds',
  })
  @IsNumber()
  @Min(60)
  timeLimit!: number; // dalam detik, minimal 60 detik

  @ApiProperty({
    example: 70,
    description: 'Passing score for the quiz in percentage',
  })
  @IsNumber()
  @Min(1)
  passingScore!: number; // persentase 1-100

  @ApiProperty({
    example: false,
    description: 'Whether the quiz is a final exam',
  })
  @IsBoolean()
  @IsOptional()
  isFinalExam?: boolean;

  @ApiProperty({
    example: [
      {
        text: 'What is JavaScript?',
        points: 10,
        order: 1,
        options: [
          {
            text: 'A programming language',
            isCorrect: true
          }
        ]
      }
    ],
    description: 'Questions for the quiz'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}