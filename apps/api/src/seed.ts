import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const seedService = app.get(SeedService);

  console.log('--- Seeding Educaro Demo Persona: Rahul Sharma ---');
  const result = await seedService.seedRahulPersona();
  console.log('Result:', result.message);
  console.log('User ID:', result.userId);

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
