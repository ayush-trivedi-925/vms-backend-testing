import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeetingModule } from './meeting/meeting.module';
import { DatabaseModule } from './database/database.module';
import { OrganizationModule } from './organization/organization.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
  imports: [MeetingModule, DatabaseModule, OrganizationModule, EmployeeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
