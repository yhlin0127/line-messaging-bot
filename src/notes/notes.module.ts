import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { NotesService } from './notes.service';
import { PgNotesRepository } from './notes.repository';
import { NOTES_REPOSITORY } from './notes.types';

@Module({
  imports: [DbModule],
  providers: [
    NotesService,
    {
      provide: NOTES_REPOSITORY,
      useClass: PgNotesRepository,
    },
  ],
  exports: [NotesService],
})
export class NotesModule {}
