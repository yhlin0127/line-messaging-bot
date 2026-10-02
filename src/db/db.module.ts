import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './db.constants';

/** Owns the pg Pool and closes it on Nest shutdown / app.close(). */
@Injectable()
export class PgPoolService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('database.url') ?? '';
    this.pool = new Pool({
      connectionString,
      max: 5,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    PgPoolService,
    {
      provide: PG_POOL,
      inject: [PgPoolService],
      useFactory: (svc: PgPoolService) => svc.pool,
    },
  ],
  exports: [PG_POOL],
})
export class DbModule {}
