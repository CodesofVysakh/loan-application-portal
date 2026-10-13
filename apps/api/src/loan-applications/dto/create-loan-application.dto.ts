import {
  IsEmail,
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLoanApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(20)
  nric!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phoneNumber!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100000000)
  monthlyIncome!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100)
  @Max(100000000)
  loanAmount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  tenureMonths!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  purposeId!: number;
}