import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VideoService } from './video.service';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('transcript')
  async submitTranscript(@Request() req: any, @Body() body: { transcript: string }) {
    return this.videoService.processTranscript(req.user.id, body.transcript);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: { durationSeconds?: string; filename?: string; transcript?: string },
  ) {
    const duration = body?.durationSeconds ? parseInt(body.durationSeconds, 10) : undefined;
    return this.videoService.processVideoUpload(req.user.id, file, {
      durationSeconds: duration,
      filename: body?.filename,
      transcript: body?.transcript,
    });
  }

  @Get('latest')
  async getLatestVideo(@Request() req: any) {
    return this.videoService.getLatestVideoIntro(req.user.id);
  }
}
