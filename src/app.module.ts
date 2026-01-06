import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { VisitModule } from './visit/visit.module';
import { SystemModule } from './system/system.module';
import { StaffModule } from './staff/staff.module';
import { OrganizationModule } from './organization/organization.module';
import config from './config/config';
import { CloudinaryService } from './media/cloudinary.service';
import { DepartmentModule } from './department/department.module';
import { ReasonModule } from './reason/reason.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TeamController } from './team/team.controller';
import { TeamService } from './team/team.service';
import { TeamModule } from './team/team.module';
import { PlanModule } from './plan/plan.module';

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
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    VisitModule,
    SystemModule,
    StaffModule,
    OrganizationModule,
    DepartmentModule,
    ReasonModule,
    AttendanceModule,
    TeamModule,
    PlanModule,
  ],
  controllers: [AppController],
  providers: [AppService, CloudinaryService],
})
export class AppModule {}
