import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { LoanStatus } from '../generated/prisma/enums';

export interface LoanStatusUpdate {
  applicationId: string;
  userId: string;
  status: LoanStatus;
  updatedAt: string;
}

@Injectable()
export class LoanStatusGateway {
  private readonly updates = new Subject<LoanStatusUpdate>();

  publish(update: LoanStatusUpdate) {
    this.updates.next(update);
  }

  streamForUser(userId: string): Observable<MessageEvent> {
    return this.updates.asObservable().pipe(
      filter((update) => update.userId === userId),
      map((update) => ({
        type: 'loan-status',
        data: {
          applicationId: update.applicationId,
          status: update.status,
          updatedAt: update.updatedAt,
        },
      })),
    );
  }

  streamForAdmin(): Observable<MessageEvent> {
    return this.updates.asObservable().pipe(
      map((update) => ({
        type: 'loan-status',
        data: {
          applicationId: update.applicationId,
          status: update.status,
          updatedAt: update.updatedAt,
        },
      })),
    );
  }
}