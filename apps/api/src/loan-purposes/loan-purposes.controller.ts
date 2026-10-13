import { Controller, Get } from '@nestjs/common';
import { LoanPurposesService } from './loan-purposes.service';

@Controller('loan-purposes')
export class LoanPurposesController {
  constructor(
    private readonly loanPurposesService: LoanPurposesService,
  ) {}

  @Get()
  findAll() {
    return this.loanPurposesService.findAll();
  }
}