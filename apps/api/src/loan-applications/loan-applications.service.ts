import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { CreditCheckService } from './credit-check.service';

@Injectable()
export class LoanApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditCheck: CreditCheckService,
  ) {}

  async create(userId: string, dto: CreateLoanApplicationDto) {
    const purpose = await this.prisma.loanPurpose.findUnique({
      where: { id: dto.purposeId },
      select: { id: true },
    });

    if (!purpose) {
      throw new BadRequestException('Invalid loan purpose');
    }

    const application = await this.prisma.loanApplication.create({
      data: {
        userId,
        fullName: dto.fullName.trim(),
        nric: dto.nric.trim(),
        phoneNumber: dto.phoneNumber.trim(),
        email: dto.email.trim().toLowerCase(),
        monthlyIncome: dto.monthlyIncome,
        loanAmount: dto.loanAmount,
        tenureMonths: dto.tenureMonths,
        purposeId: dto.purposeId,
        status: LoanStatus.PENDING,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        monthlyIncome: true,
        loanAmount: true,
        tenureMonths: true,
        purposeId: true,
        status: true,
        createdAt: true,
      },
    });

    this.creditCheck.schedule(application.id);

    return application;
  }

  async findMine(userId: string) {
    return this.prisma.loanApplication.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        purpose: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async findMineById(userId: string, applicationId: string) {
    const application = await this.prisma.loanApplication.findFirst({
      where: { id: applicationId, userId },
      include: {
        purpose: { select: { id: true, code: true, name: true } },
      },
    });

    if (!application) {
      // Avoid revealing whether another customer's application exists.
      throw new NotFoundException('Loan application not found');
    }

    return application;
  }

  async findAll(status?: LoanStatus, page = 1, pageSize = 25) {
    const where = status ? { status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.loanApplication.findMany({
        where,
        include: {
          purpose: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.loanApplication.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findAllById(applicationId: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id: applicationId },
      include: {
        purpose: { select: { id: true, code: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Loan application not found');
    }

    return application;
  }
}