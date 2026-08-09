import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from '../prisma.service';
import { R2Service } from '../storage/r2.service';

@Injectable()
export class PhotosService {
  constructor(private readonly prisma: PrismaService, private readonly r2: R2Service) {}

  async upload(eventId: string, ip: string, imageBase64: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, include: { photos: { orderBy: { createdAt: 'asc' } } } });
    if (!event) throw new BadRequestException('Event not found');

    const now = new Date();
    const liveStart = new Date(`${event.eventDate.toISOString().slice(0, 10)}T${event.startTime}:00.000Z`);
    const liveEnd = new Date(event.endsAt.getTime() + 48 * 60 * 60 * 1000);
    if (now < liveStart || now > liveEnd) throw new ForbiddenException('Live photo feed is closed');

    const ipHash = createHash('sha256').update(ip).digest('hex');
    const recentUpload = await this.prisma.uploadRateLimit.findFirst({
      where: { eventId, ipHash, createdAt: { gt: new Date(now.getTime() - 5 * 60 * 1000) } }
    });
    if (recentUpload) throw new ForbiddenException('One upload per five minutes per IP');

    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const compressed = await sharp(buffer).rotate().resize({ width: 1200, height: 1200, fit: 'inside' }).jpeg({ quality: 72 }).toBuffer();
    if (compressed.byteLength > 500_000) throw new BadRequestException('Compressed image must be under 500kb');

    await this.assertNotBlank(compressed);

    if (event.photos.length >= 200) {
      const oldest = event.photos[0];
      await this.r2.deleteObject(oldest.objectKey);
      await this.prisma.livePhoto.delete({ where: { id: oldest.id } });
    }

    const objectKey = `events/${eventId}/live/${randomUUID()}.jpg`;
    await this.r2.putObject(objectKey, compressed, 'image/jpeg');
    await this.prisma.uploadRateLimit.create({ data: { eventId, ipHash } });

    return this.prisma.livePhoto.create({ data: { eventId, ipHash, objectKey, moderationStatus: 'PENDING' } });
  }

  private async assertNotBlank(buffer: Buffer) {
    const { data, info } = await sharp(buffer).resize(50, 50, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    let totalBrightness = 0;
    let variance = 0;
    const pixels = info.width * info.height;

    for (let index = 0; index < data.length; index += info.channels) {
      totalBrightness += (data[index] + data[index + 1] + data[index + 2]) / 3;
    }

    const average = totalBrightness / pixels;
    for (let index = 0; index < data.length; index += info.channels) {
      const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
      variance += (brightness - average) ** 2;
    }

    if (average < 8 || average > 247 || variance / pixels < 25) {
      throw new BadRequestException('Image appears blank, all-black, or all-white');
    }
  }
}