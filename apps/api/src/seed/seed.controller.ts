import { Controller, Post, Get } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('rahul')
  async seedRahul() {
    return this.seedService.seedRahulPersona();
  }

  @Get('status')
  async seedStatus() {
    return {
      availablePersona: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      details: 'B.Tech CS (2021), 3 years experience, German B1, Planted start date vs graduation conflict',
    };
  }
}
