import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getStaffNotifications(orgId: string, userId: string, role: string) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('User not authorised.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exists.");
    }

    const staffExists = await this.databaseService.staff.findUnique({
      where: {
        userId,
      },
    });

    if (!staffExists) {
      throw new NotFoundException("Staff doesn't exists.");
    }

    const notifications = await this.databaseService.notification.findMany({
      where: { staffId: staffExists.id },
      orderBy: { createdAt: 'desc' },
      include: {
        visit: {
          include: {
            staff: {
              include: {
                department: true,
              },
            },
            reasonOfVisit: true,
          },
        },
      },
    });

    return {
      success: true,
      notifications,
    };
  }

  async getUnreadNotifications(orgId: string, userId: string, role: string) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('User not authorised.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    if (!organizationExists) {
      throw new NotFoundException("Organization doesn't exists.");
    }

    const staffExists = await this.databaseService.staff.findUnique({
      where: {
        userId,
      },
    });

    if (!staffExists) {
      throw new NotFoundException("Staff doesn't exists.");
    }

    const unreadNotifications =
      await this.databaseService.notification.findMany({
        where: { staffId: staffExists.id, isRead: false },
        orderBy: { createdAt: 'desc' },
        include: {
          visit: {
            include: {
              staff: {
                include: {
                  department: true,
                },
              },
              reasonOfVisit: true,
            },
          },
        },
      });
    return {
      success: true,
      unreadNotifications,
      count: unreadNotifications.length,
    };
  }

  async deleteNotification(
    userId: string,
    orgId: string,
    role: string,
    notificationId: string,
  ) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Invalid role.');
    }

    const staffExists = await this.databaseService.staff.findFirst({
      where: {
        userId,
        orgId,
      },
    });

    if (!staffExists) {
      throw new NotFoundException('Staff memeber do not exists.');
    }

    await this.databaseService.$transaction(async (tx) => {
      const notificationExists = await tx.notification.findFirst({
        where: {
          id: notificationId,
          staffId: staffExists.id,
          orgId,
          isRead: true,
        },
      });
      if (!notificationExists || notificationExists.action === 'PENDING') {
        throw new NotFoundException('Notification not found.');
      }
      await tx.notification.delete({
        where: {
          id: notificationId,
        },
      });
    });

    return {
      success: true,
      message: 'Notification deleted successfully.',
    };
  }
}
