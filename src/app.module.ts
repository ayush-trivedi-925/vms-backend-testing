import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeetingModule } from './meeting/meeting.module';
import { DatabaseModule } from './database/database.module';
import { OrganizationModule } from './organization/organization.module';
import { EmployeeModule } from './employee/employee.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { StaffMemberModule } from './staff-member/staff-member.module';
import { VisitModule } from './visit/visit.module';
import { SystemModule } from './system/system.module';
import { ServiceController } from './service/service.controller';
import config from './config/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      global: true,
      useFactory: async (config) => ({
        secret: config.get('jwt.secret'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
      inject: [ConfigService],
    }),
    MeetingModule,
    DatabaseModule,
    OrganizationModule,
    EmployeeModule,
    AuthModule,
    StaffMemberModule,
    VisitModule,
    SystemModule,
  ],
  controllers: [AppController, ServiceController],
  providers: [AppService, AuthService],
})
export class AppModule {}
