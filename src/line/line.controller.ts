import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

@Controller('webhook')
export class LineController {
  /**
   * Phase 1 stub — real LINE webhook + signature verify is Phase 2+.
   * Returns 501 so callers know the handler is not implemented yet.
   */
  @Post()
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  handleWebhook(): { message: string } {
    return { message: 'LINE webhook not implemented (Phase 2+)' };
  }
}
