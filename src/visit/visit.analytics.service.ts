import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class VisitAnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private getDateRange(period: 'day' | 'week' | 'month' | 'year' | 'all') {
    const now = new Date();
    let from: Date | undefined;

    switch (period) {
      case 'day':
        from = new Date(now);
        from.setDate(now.getDate() - 1);
        break;
      case 'week':
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from = new Date(now);
        from.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        from = new Date(now);
        from.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        from = undefined;
        break;
    }

    return { from, to: now };
  }

  async getVisitStats(
    orgId: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all',
  ) {
    const { from, to } = this.getDateRange(period);
    const whereClause: any = { orgId };
    if (from) whereClause.startTime = { gte: from, lte: to };

    const total = await this.databaseService.visit.count({
      where: whereClause,
    });
    const completed = await this.databaseService.visit.count({
      where: { ...whereClause, status: 'COMPLETED' },
    });
    const ongoing = await this.databaseService.visit.count({
      where: { ...whereClause, status: 'ONGOING' },
    });

    return [{ total, completed, ongoing }];
  }

  async getTopEmployees(
    orgId: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all',
  ) {
    const { from, to } = this.getDateRange(period);
    const whereClause: any = { orgId };
    if (from) whereClause.startTime = { gte: from, lte: to };

    const visits = await this.databaseService.visit.findMany({
      where: whereClause,
      include: { staff: true },
    });

    const counts: Record<string, { name: string; count: number }> = {};
    for (const v of visits) {
      if (!v.staff) continue;
      const name = v.staff.name || 'Unknown';
      counts[v.staff.id] = {
        name,
        count: (counts[v.staff.id]?.count || 0) + 1,
      };
    }

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getTopVisitors(
    orgId: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all',
  ) {
    const { from, to } = this.getDateRange(period);
    const whereClause: any = { orgId };
    if (from) whereClause.startTime = { gte: from, lte: to };

    const visits = await this.databaseService.visit.findMany({
      where: whereClause,
      select: { fullName: true, email: true },
    });

    const counts: Record<
      string,
      { name: string; email: string; count: number }
    > = {};
    for (const v of visits) {
      const key = v.email.toLowerCase();
      counts[key] = {
        name: v.fullName,
        email: v.email,
        count: (counts[key]?.count || 0) + 1,
      };
    }

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getTopDepartments(
    orgId: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all',
  ) {
    const { from, to } = this.getDateRange(period);
    const whereClause: any = { orgId };
    if (from) whereClause.startTime = { gte: from, lte: to };

    const visits = await this.databaseService.visit.findMany({
      where: whereClause,
      include: { staff: { include: { department: true } } },
    });

    const counts: Record<string, number> = {};
    for (const v of visits) {
      const dept = v.staff?.department?.name || 'No Department';
      counts[dept] = (counts[dept] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getTopReasons(
    orgId: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all',
  ) {
    const { from, to } = this.getDateRange(period);
    const whereClause: any = { orgId };
    if (from) whereClause.startTime = { gte: from, lte: to };

    const visits = await this.databaseService.visit.findMany({
      where: whereClause,
      include: { reasonOfVisit: true },
    });

    const counts: Record<string, number> = {};
    for (const v of visits) {
      const reason = v.reasonOfVisit?.name || 'No Reason';
      counts[reason] = (counts[reason] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
