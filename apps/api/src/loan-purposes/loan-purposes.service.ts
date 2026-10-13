import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const EXTERNAL_PURPOSES = [
  { code: 'HOME_RENOVATION', name: 'Home Renovation' },
  { code: 'EDUCATION', name: 'Education' },
  { code: 'MEDICAL', name: 'Medical Expenses' },
  { code: 'VEHICLE', name: 'Vehicle Purchase' },
  { code: 'DEBT_CONSOLIDATION', name: 'Debt Consolidation' },
  { code: 'TRAVEL', name: 'Travel' },
  { code: 'WEDDING', name: 'Wedding' },
  { code: 'BUSINESS', name: 'Business Expenses' },
  { code: 'EMERGENCY', name: 'Emergency Expenses' },
  { code: 'OTHER', name: 'Other' },
] as const;

@Injectable()
export class LoanPurposesService {
  private readonly logger = new Logger(LoanPurposesService.name);

  private cachedPurposes:
    | Array<{ id: number; code: string; name: string }>
    | null = null;

  private cacheExpiresAt = 0;

  private refreshPromise:
    | Promise<Array<{ id: number; code: string; name: string }>>
    | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    if (this.cachedPurposes && Date.now() < this.cacheExpiresAt) {
      return this.cachedPurposes;
    }

    // Share an in-flight refresh if multiple requests arrive together.
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshFromCoreBanking();
    }

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refreshFromCoreBanking() {
    this.logger.log('Fetching loan purposes from simulated core banking...');

    // Simulate the slow external core-banking API.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    for (const purpose of EXTERNAL_PURPOSES) {
      await this.prisma.loanPurpose.upsert({
        where: { code: purpose.code },
        update: { name: purpose.name },
        create: purpose,
      });
    }

    const purposes = await this.prisma.loanPurpose.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });

    this.cachedPurposes = purposes;
    this.cacheExpiresAt = Date.now() + CACHE_TTL_MS;

    this.logger.log(`Cached ${purposes.length} loan purposes.`);

    return purposes;
  }
}