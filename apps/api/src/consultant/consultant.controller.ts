import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsultantService } from './consultant.service';
import { CreateBookingDto, LogCallDto, RescheduleBookingDto } from './consultant.dto';

@Controller('consultant')
export class ConsultantController {
  constructor(private readonly consultantService: ConsultantService) {}

  /**
   * GET /api/consultant/info
   * Public-ish: returns consultant name & phone from config.
   * Frontend reads phone from here — never hardcoded in a component.
   */
  @UseGuards(JwtAuthGuard)
  @Get('info')
  getInfo() {
    return this.consultantService.getInfo();
  }

  /**
   * GET /api/consultant/slots
   * Returns dynamic available booking slots and 14-day date picker options.
   */
  @UseGuards(JwtAuthGuard)
  @Get('slots')
  getSlots(@Query('date') date?: string) {
    return this.consultantService.getSlots(date);
  }

  /**
   * POST /api/consultant/bookings
   * Create a booking for a given slot.
   * Throws 403 if user is not Premium; throws 409 if slot is already booked.
   */
  @UseGuards(JwtAuthGuard)
  @Post('bookings')
  createBooking(
    @Req() req: Request & { user: any },
    @Body() dto: CreateBookingDto,
  ) {
    return this.consultantService.createBooking(req.user.id, dto);
  }

  /**
   * PATCH /api/consultant/bookings/:id/reschedule
   * Reschedule an existing booking to a new slot.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('bookings/:id/reschedule')
  rescheduleBooking(
    @Req() req: Request & { user: any },
    @Param('id') bookingId: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.consultantService.rescheduleBooking(req.user.id, bookingId, dto.newScheduledAt);
  }

  /**
   * GET /api/consultant/bookings
   * Returns all bookings for the authenticated applicant.
   */
  @UseGuards(JwtAuthGuard)
  @Get('bookings')
  getMyBookings(@Req() req: Request & { user: any }) {
    return this.consultantService.getMyBookings(req.user.id);
  }

  /**
   * DELETE /api/consultant/bookings/:id
   * Cancel a booking.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('bookings/:id')
  cancelBooking(
    @Req() req: Request & { user: any },
    @Param('id') bookingId: string,
  ) {
    return this.consultantService.cancelBooking(req.user.id, bookingId);
  }

  /**
   * POST /api/consultant/call-log
   * Logs a "Call Now" tap. Call this immediately when user taps the tel: link.
   * Returns the consultant phone number from config for display.
   */
  @UseGuards(JwtAuthGuard)
  @Post('call-log')
  logCall(
    @Req() req: Request & { user: any },
    @Body() dto: LogCallDto,
  ) {
    return this.consultantService.logCall(req.user.id, dto);
  }

  /**
   * GET /api/consultant/call-log
   * Returns all call log entries for the authenticated applicant.
   */
  @UseGuards(JwtAuthGuard)
  @Get('call-log')
  getMyCallLog(@Req() req: Request & { user: any }) {
    return this.consultantService.getMyCallLog(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async handleChat(
    @Req() req: Request & { user: any },
    @Body() body: { message: string, history: any[] }
  ) {
    return this.consultantService.handleChat(req.user.id, body.message, body.history);
  }
}
