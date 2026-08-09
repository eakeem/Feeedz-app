import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { AuthGuard } from '../auth/supabase-jwt.guard';
import { AdminService } from './admin.service';

class ModerateEventDto {
  @IsIn(['approve', 'reject']) action!: 'approve' | 'reject';
}

class BanUserDto {
  @IsString() promoterId!: string;
}

class BanIpDto {
  @IsString() ipHash!: string;
  @IsString() reason!: string;
}

@UseGuards(AuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('events')
  events() {
    return this.admin.events();
  }

  @Patch('events/:id/moderate')
  moderateEvent(@Param('id') id: string, @Body() dto: ModerateEventDto) {
    return this.admin.moderateEvent(id, dto.action);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.admin.deleteEvent(id);
  }

  @Get('payments')
  payments() {
    return this.admin.payments();
  }

  @Post('payments/:id/refund')
  refund(@Param('id') id: string) {
    return this.admin.refund(id);
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  @Post('users/ban')
  banUser(@Body() dto: BanUserDto) {
    return this.admin.banUser(dto.promoterId);
  }

  @Post('users/unban')
  unbanUser(@Body() dto: BanUserDto) {
    return this.admin.unbanUser(dto.promoterId);
  }

  @Post('ips/ban')
  banIp(@Body() dto: BanIpDto) {
    return this.admin.banIp(dto.ipHash, dto.reason);
  }

  @Delete('ips/:ipHash')
  unbanIp(@Param('ipHash') ipHash: string) {
    return this.admin.unbanIp(ipHash);
  }

  @Get('photos/reported')
  reportedPhotos() {
    return this.admin.reportedPhotos();
  }

  @Patch('photos/:id/moderate')
  moderatePhoto(@Param('id') id: string, @Body() dto: ModerateEventDto) {
    return this.admin.moderatePhoto(id, dto.action);
  }
}
