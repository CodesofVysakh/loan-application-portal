import { Module } from '@nestjs/common';
import { LoanPurposesController } from './loan-purposes.controller';
import { LoanPurposesService } from './loan-purposes.service';

@Module({
  controllers: [LoanPurposesController],
  providers: [LoanPurposesService],
  exports: [LoanPurposesService],
})
export class LoanPurposesModule {}