import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guard/auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Get('')
  async getStaffNotifications(@Req() req) {
    return this.notificationsService.getStaffNotifications(
      req.orgId,
      req.userId,
      req.role,
    );
  }

  @Get('unread')
  async getUnreadNotifications(@Req() req) {
    return this.notificationsService.getUnreadNotifications(
      req.orgId,
      req.userId,
      req.role,
    );
  }

  @Delete(':notificationId')
  async deleteNotification(
    @Req() req,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(
      req.userId,
      req.orgId,
      req.role,
      notificationId,
    );
  }
}
