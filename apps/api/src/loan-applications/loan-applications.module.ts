import { Module } from '@nestjs/common';
import { CreditCheckService } from './credit-check.service';
import { LoanApplicationsController } from './loan-applications.controller';
import { LoanApplicationsService } from './loan-applications.service';
import { LoanStatusGateway } from './loan-status.gateway';

@Module({
  controllers: [LoanApplicationsController],
  providers: [
    LoanApplicationsService,
    CreditCheckService,
    LoanStatusGateway,
  ],
})
export class LoanApplicationsModule {}