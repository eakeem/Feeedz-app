import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { IsString } from 'class-validator';
import { PhotosService } from './photos.service';

class UploadPhotoDto {
  @IsString() imageBase64!: string;
}

@Controller('events/:eventId/live-photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post()
  upload(@Param('eventId') eventId: string, @Body() dto: UploadPhotoDto, @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    const forwarded = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] ?? request.ip ?? 'unknown';
    return this.photos.upload(eventId, ip, dto.imageBase64);
  }
}