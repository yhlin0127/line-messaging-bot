import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { LineModule } from './line/line.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [AppConfigModule, DbModule, HealthModule, LineModule, NotesModule],
})
export class AppModule {}
