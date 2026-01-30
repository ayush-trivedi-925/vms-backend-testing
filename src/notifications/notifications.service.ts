import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

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
}
