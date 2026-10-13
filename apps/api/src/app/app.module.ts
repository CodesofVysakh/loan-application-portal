import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LoanPurposesModule } from '../loan-purposes/loan-purposes.module';
import { LoanApplicationsModule } from '../loan-applications/loan-applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    LoanPurposesModule,
    LoanApplicationsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
