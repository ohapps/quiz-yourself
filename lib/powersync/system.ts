import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from './schema';
import { Connector } from './connector';

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: new OPSqliteOpenFactory({
    dbFilename: 'powersync-quiz.db',
  }),
});

export async function setupPowerSync() {
  await powersync.init();
  const connector = new Connector();
  await powersync.connect(connector);

  // Wait for the first sync so screens don't render against an empty DB.
  // Time out so the app still opens offline with whatever is already cached.
  await Promise.race([
    powersync.waitForFirstSync(),
    new Promise<void>((resolve) => setTimeout(resolve, 8000)),
  ]);
}
