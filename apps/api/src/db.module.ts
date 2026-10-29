import { Module } from '@nestjs/common';
import { DbService } from './db.service.js';

// One DbService (one pg pool) shared by every feature module.
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
