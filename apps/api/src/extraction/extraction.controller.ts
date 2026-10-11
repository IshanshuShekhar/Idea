import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtractionService, DocumentUploadDto } from './extraction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('extraction')
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Req() req: Request & { user: any },
    @Body() body: Omit<DocumentUploadDto, 'userId'>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }
    return this.extractionService.processDocumentExtraction({
      userId: req.user.id,
      ...body,
    }, file);
  }

  @Post('demo-upload')
  async demoUploadDocument(@Body() dto: DocumentUploadDto) {
    throw new BadRequestException('Demo upload is deprecated. Use real file upload.');
  }

  @UseGuards(JwtAuthGuard)
  @Get('documents')
  async getDocuments(@Req() req: Request & { user: any }) {
    return this.extractionService.getDocuments(req.user.id);
  }

  @Get('demo-documents')
  async getDemoDocuments(@Req() req: Request) {
    const userId = (req.query.userId as string) || 'demo-user';
    return this.extractionService.getDocuments(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-field')
  async confirmField(
    @Req() req: Request & { user: any },
    @Body() body: { docId: string; fieldKey: string; confirmedValue?: string },
  ) {
    return this.extractionService.confirmExtractedField(
      req.user.id,
      body.docId,
      body.fieldKey,
      body.confirmedValue,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('documents/:docId')
  async deleteDocument(@Req() req: Request & { user: any }, @Param('docId') docId: string) {
    return this.extractionService.deleteDocument(req.user.id, docId);
  }
}
