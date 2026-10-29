import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DbModule } from './db.module.js';
import { ExpensesModule } from './expenses.module.js';

@Module({
  imports: [DbModule, ExpensesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
