import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoanStatus } from '../generated/prisma/enums';
import { LoanStatusGateway } from './loan-status.gateway';

@Injectable()
export class CreditCheckService implements OnModuleDestroy {
  private readonly logger = new Logger(CreditCheckService.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly statusGateway: LoanStatusGateway,
  ) {}

  schedule(applicationId: string) {
    // Between 10 seconds and 5 minutes, inclusive.
    const delayMs = 10_000 + Math.floor(Math.random() * 290_001);

    const timer = setTimeout(() => {
      this.timers.delete(applicationId);
      void this.runCreditCheck(applicationId);
    }, delayMs);

    this.timers.set(applicationId, timer);

    this.logger.log(
      `Credit check scheduled for ${applicationId} in ${Math.round(delayMs / 1000)} seconds`,
    );
  }

  private async runCreditCheck(applicationId: string) {
    try {
      const application = await this.prisma.loanApplication.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          userId: true,
          status: true,
          monthlyIncome: true,
          loanAmount: true,
          tenureMonths: true,
        },
      });

      if (!application || application.status !== LoanStatus.PENDING) {
        return;
      }

      // Assessment simulation, not a real credit decision.
      const approved = Math.random() < 0.7;
      const status = approved ? LoanStatus.APPROVED : LoanStatus.REJECTED;

      const updated = await this.prisma.loanApplication.updateMany({
        where: {
          id: applicationId,
          status: LoanStatus.PENDING,
        },
        data: {
          status,
          creditCheckedAt: new Date(),
          rejectionReason: approved
            ? null
            : 'The simulated credit assessment did not meet the approval criteria.',
        },
      });

      // Prevent duplicate notifications if another process already updated it.
      if (updated.count === 0) {
        return;
      }

      const finalApplication = await this.prisma.loanApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, userId: true, status: true, updatedAt: true },
      });

      if (!finalApplication) {
        return;
      }

      this.statusGateway.publish({
        applicationId: finalApplication.id,
        userId: finalApplication.userId,
        status: finalApplication.status,
        updatedAt: finalApplication.updatedAt.toISOString(),
      });

      this.logger.log(
        `Credit check completed for ${applicationId}: ${finalApplication.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Credit check failed for ${applicationId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  onModuleDestroy() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
  }
}