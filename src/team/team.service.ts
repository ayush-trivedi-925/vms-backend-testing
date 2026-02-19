import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { AddMembersDto } from '../dto/add-members.dto';
import { SetReportingDto } from '../dto/set-reporting.dto';
import { RemoveReportingDto } from '../dto/remove-reporting.dto';
import { EditTeamDto } from '../dto/edit-team.dto';
import { BulkSetReportingDto } from '../dto/bulk-set-reporting';

@Injectable()
export class TeamService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addTeam(orgId, userId, role, createTeamDto: CreateTeamDto) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only superadmin is allowed to add team.',
      );
    }
    const { name, masterManagerId } = createTeamDto;
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    const userExists = await this.databaseService.userCredential.findFirst({
      where: {
        id: userId,
        orgId,
      },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    // Validate master manager is from the same org
    const masterManager = await this.databaseService.staff.findFirst({
      where: {
        id: createTeamDto.masterManagerId,
        orgId,
      },
    });
    if (!masterManager) {
      throw new BadRequestException('Master manager not in organization.');
    }

    const team = await this.databaseService.team.create({
      data: {
        name,
        masterManagerId,
        orgId,
      },
    });

    // Add master manager as a team member automatically
    await this.databaseService.teamMember.create({
      data: {
        teamId: team.id,
        staffId: createTeamDto.masterManagerId,
      },
    });

    return {
      success: true,
      teamDetails: team,
    };
  }

  async editTeam(
    orgId: string,
    userId: string,
    role: string,
    teamId: string,
    editTeamDto: EditTeamDto,
  ) {
    if (role !== 'SuperAdmin') {
      throw new UnauthorizedException('Only superadmin can update team.');
    }

    const { name, masterManagerId } = editTeamDto;

    const [organization, user, team] = await Promise.all([
      this.databaseService.organization.findUnique({
        where: { id: orgId },
      }),
      this.databaseService.userCredential.findFirst({
        where: { id: userId, orgId },
      }),
      this.databaseService.team.findUnique({
        where: { id: teamId },
      }),
    ]);

    if (!organization || !user) {
      throw new BadRequestException('Invalid credentials.');
    }

    if (!team || team.orgId !== orgId) {
      throw new NotFoundException('Team not found.');
    }

    await this.databaseService.$transaction(async (tx) => {
      /**
       * Validate & clean up NEW master manager
       */
      if (masterManagerId) {
        const newManager = await tx.staff.findFirst({
          where: { id: masterManagerId, orgId },
        });

        if (!newManager) {
          throw new BadRequestException('Master manager not in organization.');
        }

        const newManagerInTeam = await tx.teamMember.findFirst({
          where: { staffId: masterManagerId, teamId },
        });

        if (!newManagerInTeam) {
          throw new BadRequestException(
            'Selected master manager is not a team member.',
          );
        }

        // Remove any existing reporting for new manager
        await tx.teamReporting.deleteMany({
          where: {
            teamId,
            OR: [
              { staffId: newManagerInTeam.staffId },
              { managerId: newManagerInTeam.staffId },
              { teamMemberId: newManagerInTeam.id },
            ],
          },
        });
      }

      /**
       * Clean up OLD master manager (only if changed)
       */
      if (team.masterManagerId && team.masterManagerId !== masterManagerId) {
        const oldManager = await tx.teamMember.findFirst({
          where: {
            staffId: team.masterManagerId,
            teamId,
          },
        });

        if (oldManager) {
          await tx.teamReporting.deleteMany({
            where: {
              teamId,
              OR: [
                { staffId: oldManager.staffId },
                { managerId: oldManager.staffId },
                { teamMemberId: oldManager.id },
              ],
            },
          });
        }
      }

      /**
       * Update team
       */
      await tx.team.update({
        where: { id: teamId },
        data: {
          ...(name && { name }),
          ...(masterManagerId && { masterManagerId }),
        },
      });
    });

    return {
      success: true,
      message: 'Team updated successfully.',
    };
  }

  async addMembers(orgId, userId, role, teamId: string, dto: AddMembersDto) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only superadmin is allowed to add team.',
      );
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    const userExists = await this.databaseService.userCredential.findFirst({
      where: {
        id: userId,
        orgId,
      },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    const { staffIds } = dto;

    const team = await this.databaseService.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    // Validate staff belong to the same organization
    const validStaff = await this.databaseService.staff.findMany({
      where: {
        id: { in: staffIds },
        orgId,
      },
      select: { id: true },
    });

    const validIds = validStaff.map((s) => s.id);

    if (validIds.length === 0) {
      throw new BadRequestException('No valid staff provided.');
    }

    // Prevent adding master manager manually (optional, since we auto-add them)
    const filteredIds = validIds.filter((id) => id !== team.masterManagerId);

    const existingMembers = await this.databaseService.teamMember.findMany({
      where: { teamId, staffId: { in: filteredIds } },
      select: { staffId: true },
    });

    const duplicates = existingMembers.map((m) => m.staffId);
    const newStaffIds = filteredIds.filter((id) => !duplicates.includes(id));

    await this.databaseService.teamMember.createMany({
      data: newStaffIds.map((id) => ({ teamId, staffId: id })),
      skipDuplicates: true,
    });

    return {
      success: true,
      teamId,
      added: newStaffIds.length,
      duplicates,
      skippedMasterManager: validIds.length - filteredIds.length,
      skippedInvalidStaff: dto.staffIds.length - validIds.length,
    };
  }

  async removeMember(orgId, userId, role, teamId, memberId) {
    const allowedRoles = ['SuperAdmin'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException(
        'Only superadmin is allowed to add team.',
      );
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: {
          id: orgId,
        },
      });

    const userExists = await this.databaseService.userCredential.findFirst({
      where: {
        id: userId,
        orgId,
      },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    const memberExistsInTeam = await this.databaseService.teamMember.findFirst({
      where: {
        id: memberId,
        teamId,
      },
    });
    if (!memberExistsInTeam) {
      throw new NotFoundException('Member does not exists.');
    }

    await this.databaseService.teamMember.delete({
      where: {
        id: memberId,
        teamId,
      },
    });

    await this.databaseService.teamReporting.deleteMany({
      where: {
        teamId,
        OR: [
          { staffId: memberExistsInTeam.staffId },
          { managerId: memberExistsInTeam.staffId },
          { teamMemberId: memberExistsInTeam.id },
        ],
      },
    });

    return {
      success: true,
      message: 'Member deleted successfully.',
    };
  }

  async setReporting(
    orgId: string,
    userId: string,
    role: string,
    teamId: string,
    dto: SetReportingDto,
  ) {
    if (role !== 'SuperAdmin') {
      throw new UnauthorizedException(
        'Only superadmin is allowed to assign reporting.',
      );
    }

    const [organization, user, team] = await Promise.all([
      this.databaseService.organization.findUnique({
        where: { id: orgId },
      }),
      this.databaseService.userCredential.findFirst({
        where: { id: userId, orgId },
      }),
      this.databaseService.team.findUnique({
        where: { id: teamId },
      }),
    ]);

    if (!organization || !user) {
      throw new BadRequestException('Invalid credentials.');
    }

    if (!team || team.orgId !== orgId) {
      throw new NotFoundException("Team doesn't exist.");
    }

    const { staffId, managerIds } = dto;

    // Validate staff belongs to team
    const staffTeamMember = await this.databaseService.teamMember.findFirst({
      where: { staffId, teamId },
    });

    if (!staffTeamMember) {
      throw new BadRequestException('Staff is not a member of the team.');
    }

    // Prevent self reporting
    if (managerIds.includes(staffId)) {
      throw new BadRequestException(
        'A staff member cannot report to themselves.',
      );
    }

    // Master manager restriction
    if (team.masterManagerId === staffId) {
      throw new BadRequestException(
        'Master manager cannot report to other managers.',
      );
    }

    // Validate managers are in team
    const validManagers = await this.databaseService.teamMember.findMany({
      where: {
        teamId,
        staffId: { in: managerIds },
      },
      select: { staffId: true },
    });

    const validManagerIds = validManagers.map((m) => m.staffId);

    if (validManagerIds.length !== managerIds.length) {
      throw new BadRequestException(
        'One or more managers are not members of the team.',
      );
    }

    // Check already assigned
    const existing = await this.databaseService.teamReporting.findMany({
      where: {
        teamId,
        staffId,
        managerId: { in: validManagerIds },
      },
      select: { managerId: true },
    });

    const alreadyAssigned = existing.map((r) => r.managerId);

    const newManagerIds = validManagerIds.filter(
      (id) => !alreadyAssigned.includes(id),
    );

    // No-op (NOT an error)
    if (newManagerIds.length === 0) {
      return {
        success: true,
        assigned: 0,
        skipped: alreadyAssigned.length,
      };
    }

    // Prevent reverse reporting
    const reverseReporting = await this.databaseService.teamReporting.findMany({
      where: {
        teamId,
        staffId: { in: newManagerIds },
        managerId: staffId,
      },
      select: { staffId: true },
    });

    if (reverseReporting.length > 0) {
      throw new BadRequestException('Reverse reporting relationship detected.');
    }

    // Create reporting
    await this.databaseService.teamReporting.createMany({
      data: newManagerIds.map((managerId) => ({
        teamId,
        staffId,
        managerId,
        teamMemberId: staffTeamMember.id,
      })),
      skipDuplicates: true,
    });

    return {
      success: true,
      assigned: newManagerIds.length,
      skipped: 0,
    };
  }

  // ======================================================
  // BULK STAFF REPORTING
  // ======================================================
  async setReportingBulk(
    orgId: string,
    userId: string,
    role: string,
    teamId: string,
    dto: BulkSetReportingDto,
  ) {
    const summary = {
      success: true,
      assigned: 0,
      skipped: 0,
      failed: [] as { staffId: string; reason: string }[],
    };

    for (const staffId of dto.staffIds) {
      try {
        const result = await this.setReporting(orgId, userId, role, teamId, {
          staffId,
          managerIds: dto.managerIds,
        });

        if (result.assigned === 0) {
          summary.skipped++;
        } else {
          summary.assigned += result.assigned;
        }
      } catch (error: any) {
        summary.failed.push({
          staffId,
          reason: error?.message || 'Failed to assign reporting',
        });
      }
    }

    return summary;
  }

  async removeReporting(
    orgId: string,
    userId: string,
    role: string,
    teamId: string,
    dto: RemoveReportingDto,
  ) {
    if (role !== 'SuperAdmin') {
      throw new UnauthorizedException('Only SuperAdmin can remove reporting.');
    }

    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: orgId },
      });
    const userExists = await this.databaseService.userCredential.findFirst({
      where: { id: userId, orgId },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    const team = await this.databaseService.team.findUnique({
      where: { id: teamId },
    });
    if (!team || team.orgId !== orgId) {
      throw new NotFoundException('Team not found in organization.');
    }

    const { staffId, managerId } = dto;

    // Validate staff in team
    const staffMember = await this.databaseService.teamMember.findFirst({
      where: { teamId, staffId },
    });
    if (!staffMember) {
      throw new BadRequestException('Staff is not a member of this team.');
    }

    const checkTeamMembers = await this.databaseService.teamMember.findMany({
      where: { teamId },
    });

    // Validate manager in team
    const managerMember = await this.databaseService.teamMember.findFirst({
      where: { teamId, staffId: managerId },
    });
    if (!managerMember) {
      throw new BadRequestException('Manager is not a member of this team.');
    }

    // Check if relationship exists
    const relationExists = await this.databaseService.teamReporting.findFirst({
      where: { teamId, staffId, managerId },
    });

    if (!relationExists) {
      throw new BadRequestException('Reporting relationship does not exist.');
    }

    // Delete the reporting link
    await this.databaseService.teamReporting.deleteMany({
      where: { teamId, staffId, managerId },
    });

    return {
      success: true,
      message: 'Reporting relationship removed successfully.',
      removed: { staffId, managerId },
    };
  }

  async getTeam(orgId, userId, role, teamId) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Role not allowed.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: orgId },
      });
    const userExists = await this.databaseService.userCredential.findFirst({
      where: { id: userId, orgId },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    const team = await this.databaseService.team.findUnique({
      where: { id: teamId },
      include: {
        masterManager: true, // or rename later to teamLead
        _count: {
          select: {
            members: true,
          },
        },
        members: {
          include: {
            staff: {
              select: {
                employeeCode: true,
                name: true,
                email: true,
                designation: true,
                department: true,
                role: true,
              },
            },
          },
        },
        reporting: true,
      },
    });

    if (!team || team.orgId !== orgId) {
      throw new NotFoundException('Team not found in organization.');
    }

    const departmentId = team.masterManager.departmentId;

    if (!departmentId) {
      // departmentId is null or undefined → no department assigned
      return {
        ...team,
        masterManagerDepartment: null,
      };
    }

    const masterManagerDept = await this.databaseService.department.findUnique({
      where: { id: departmentId },
    });

    return {
      success: true,
      teamDetails: { ...team, mangerDepartment: masterManagerDept?.name },
    };
  }

  async getAllTeam(orgId, userId, role) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Role not allowed.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: orgId },
      });
    const userExists = await this.databaseService.userCredential.findFirst({
      where: { id: userId, orgId },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }
    // FILTER BY ORG
    const teams = await this.databaseService.team.findMany({
      where: { orgId },
      include: {
        masterManager: {
          include: {
            department: true,
          },
        }, // or rename later to teamLead
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (teams.length === 0) {
      return {
        success: true,
        message: 'No teams found in this organization.',
        teams: [],
      };
    }

    return {
      success: true,
      teamsDetails: teams,
    };
  }

  async getTeamForStaff(orgId, userId, role, staffId) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Role not allowed.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: orgId },
      });
    const userExists = await this.databaseService.userCredential.findFirst({
      where: { id: userId, orgId },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    const teams = await this.databaseService.teamMember.findMany({
      where: { staffId },
      include: {
        team: true,
      },
    });
    if (!teams) {
      throw new NotFoundException('Team not found in organization.');
    }
    if (teams.length === 0) {
      return {
        success: true,
        message: 'No team found for this staff in this organization.',
        teamDetails: [],
      };
    }

    // Clean and structured response
    const teamList = teams.map((t: any) => ({
      teamId: t.team.id,
      teamName: t.team.name,
    }));

    return {
      success: true,
      staffId,
      teams: teamList,
    };
  }

  async deleteTeam(orgId, userId, role, teamId) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Role not allowed.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: orgId },
      });
    const userExists = await this.databaseService.userCredential.findFirst({
      where: { id: userId, orgId },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    const team = await this.databaseService.team.delete({
      where: { id: teamId },
    });

    return {
      success: true,
    };
  }

  async getMemberDetails(orgId, userId, role, teamId, memberId) {
    const allowedRoles = ['SuperAdmin', 'Admin', 'Root', 'Staff'];
    if (!allowedRoles.includes(role)) {
      throw new UnauthorizedException('Role not allowed.');
    }
    const organizationExists =
      await this.databaseService.organization.findUnique({
        where: { id: orgId },
      });
    const userExists = await this.databaseService.userCredential.findFirst({
      where: { id: userId, orgId },
    });

    if (!organizationExists || !userExists) {
      throw new BadRequestException('Invalid credentials.');
    }

    const memberExists = await this.databaseService.teamMember.findFirst({
      where: {
        id: memberId,
        teamId,
      },
      include: {
        staff: true,
      },
    });

    const memberDetails = await this.databaseService.staff.findUnique({
      where: {
        id: memberExists?.staff.id,
      },
      include: {
        department: true,
      },
    });

    const teamReportings = await this.databaseService.teamReporting.findMany({
      where: {
        staffId: memberExists?.staff.id,
        teamId,
      },
      include: {
        manager: true,
      },
    });

    if (!memberExists || !memberDetails) {
      throw new NotFoundException('Member does not exists.');
    }

    return {
      success: true,
      memberDetails,
      teamReportings,
    };
  }
}
