export type AppEnvName = 'local' | 'sit' | 'stg' | 'prod';

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appEnv: (process.env.APP_ENV ?? 'local') as AppEnvName,
  port: parseInt(process.env.PORT ?? '3000', 10),
  line: {
    channelSecret: process.env.LINE_CHANNEL_SECRET ?? '',
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
});
