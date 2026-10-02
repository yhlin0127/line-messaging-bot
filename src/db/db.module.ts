import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './db.constants';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('database.url') ?? '';
        return new Pool({
          connectionString,
          max: 5,
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DbModule {}
