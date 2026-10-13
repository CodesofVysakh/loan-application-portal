import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { LoanStatus } from '../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, AppRole } from '../auth/roles.decorator';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { LoanApplicationsService } from './loan-applications.service';
import { LoanStatusGateway } from './loan-status.gateway';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: AppRole;
  };
}

@Controller('loan-applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoanApplicationsController {
  constructor(
    private readonly applications: LoanApplicationsService,
    private readonly statusGateway: LoanStatusGateway,
  ) {}

  @Post()
  @Roles('CUSTOMER')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateLoanApplicationDto) {
    return this.applications.create(req.user.userId, dto);
  }

  @Get('mine')
  @Roles('CUSTOMER')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.applications.findMine(req.user.userId);
  }

  @Get('mine/:id')
  @Roles('CUSTOMER')
  findMineById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.applications.findMineById(req.user.userId, id);
  }

  @Sse('events')
  streamStatus(@Req() req: AuthenticatedRequest) {
    return req.user.role === 'ADMIN'
      ? this.statusGateway.streamForAdmin()
      : this.statusGateway.streamForUser(req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('status') status?: LoanStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedPage = Number(page ?? 1);
    const parsedPageSize = Number(pageSize ?? 25);

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new BadRequestException('page must be a positive integer');
    }

    if (
      !Number.isInteger(parsedPageSize) ||
      parsedPageSize < 1 ||
      parsedPageSize > 100
    ) {
      throw new BadRequestException('pageSize must be between 1 and 100');
    }

    const validStatuses: LoanStatus[] = [
      'PENDING',
      'APPROVED',
      'REJECTED',
    ];

    if (status && !validStatuses.includes(status)) {
      throw new BadRequestException('Invalid application status');
    }

    return this.applications.findAll(
      status,
      parsedPage,
      parsedPageSize,
    );
  }

  @Get(':id')
  @Roles('ADMIN')
  findAllById(@Param('id') id: string) {
    return this.applications.findAllById(id);
  }
}