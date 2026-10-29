import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ExpensesService, ExpenseFilter } from './expenses.service.js';
import {
  CATEGORIES,
  currentMonth,
  isCategory,
  monthRange,
  validateExpense,
} from './expense.validation.js';

function parseMonth(month: string): { start: string; end: string } {
  const range = monthRange(month);
  if (!range) throw new BadRequestException('month must be in YYYY-MM format');
  return range;
}

function parseBody(body: unknown) {
  const result = validateExpense(body);
  if (!result.ok) throw new BadRequestException(result.errors);
  return result.value;
}

@Controller()
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('expenses')
  list(@Query('month') month?: string, @Query('category') category?: string) {
    const filter: ExpenseFilter = {};
    if (month) filter.month = parseMonth(month);
    if (category) {
      if (!isCategory(category)) {
        throw new BadRequestException(`category must be one of ${CATEGORIES.join(', ')}`);
      }
      filter.category = category;
    }
    return this.expenses.list(filter);
  }

  @Post('expenses')
  create(@Body() body: unknown) {
    return this.expenses.create(parseBody(body));
  }

  @Put('expenses/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.expenses.update(id, parseBody(body));
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expenses.remove(id);
  }

  @Get('stats')
  stats(@Query('month') month?: string) {
    const value = month || currentMonth();
    parseMonth(value);
    return this.expenses.stats(value);
  }
}
