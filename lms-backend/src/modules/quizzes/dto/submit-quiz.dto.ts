import {
  IsArray,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerDto {
  @IsUUID()
  @IsNotEmpty()
  questionId!: string;

  @IsUUID()
  @IsNotEmpty()
  optionId!: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}