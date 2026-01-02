import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { CreateTeamDto } from 'src/dto/create-team.dto';
import { AuthGuard } from 'src/guard/auth.guard';
import { AddMembersDto } from 'src/dto/add-members.dto';
import { SetReportingDto } from 'src/dto/set-reporting.dto';
import { RemoveReportingDto } from 'src/dto/remove-reporting.dto';
import { EditTeamDto } from 'src/dto/edit-team.dto';
import { BulkSetReportingDto } from 'src/dto/bulk-set-reporting';

@UseGuards(AuthGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}
  @Post('')
  createTeam(@Req() req, @Body() dto: CreateTeamDto) {
    return this.teamService.addTeam(req.orgId, req.userId, req.role, dto);
  }

  @Post(':teamId/members')
  addMembers(
    @Req() req,
    @Param('teamId') teamId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.teamService.addMembers(
      req.orgId,
      req.userId,
      req.role,
      teamId,
      dto,
    );
  }

  @Put(':teamId')
  editTeam(
    @Req() req,
    @Param('teamId') teamId: string,
    @Body() dto: EditTeamDto,
  ) {
    return this.teamService.editTeam(
      req.orgId,
      req.userId,
      req.role,
      teamId,
      dto,
    );
  }
  @Delete(':teamId/reporting/remove')
  removeReporting(
    @Req() req,
    @Param('teamId') teamId: string,
    @Body() dto: RemoveReportingDto,
  ) {
    return this.teamService.removeReporting(
      req.orgId,
      req.userId,
      req.role,
      teamId,
      dto,
    );
  }

  @Delete(':teamId/:memberId')
  deleteMember(
    @Req() req,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeMember(
      req.orgId,
      req.userId,
      req.role,
      teamId,
      memberId,
    );
  }

  @Post(':teamId/reporting/bulk')
  setReportingBulk(
    @Req() req,
    @Param('teamId') teamId: string,
    @Body() dto: BulkSetReportingDto,
  ) {
    return this.teamService.setReportingBulk(
      req.orgId,
      req.userId,
      req.role,
      teamId,
      dto,
    );
  }

  @Get('/all')
  getAllTeam(@Req() req) {
    return this.teamService.getAllTeam(req.orgId, req.userId, req.role);
  }

  @Get(':teamId')
  getTeam(@Req() req, @Param('teamId') teamId: string) {
    return this.teamService.getTeam(req.orgId, req.userId, req.role, teamId);
  }

  @Get('/staff/:staffId')
  getTeamsOfStaff(@Req() req, @Param('staffId') staffId: string) {
    return this.teamService.getTeamForStaff(
      req.orgId,
      req.userId,
      req.role,
      staffId,
    );
  }

  @Delete(':teamId')
  deleteTeam(@Req() req, @Param('teamId') teamId: string) {
    return this.teamService.deleteTeam(req.orgId, req.userId, req.role, teamId);
  }

  @Get('/:teamId/:memberId')
  getMemberDetails(
    @Req() req,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.getMemberDetails(
      req.orgId,
      req.userId,
      req.role,
      teamId,
      memberId,
    );
  }
}
