import { PowerSyncDatabase } from '@powersync/react-native';
import { SQLJSOpenFactory } from '@powersync/adapter-sql-js';
import { AppSchema } from './schema';
import { Connector } from './connector';

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: new SQLJSOpenFactory({ dbFilename: 'powersync-quiz.db' }),
});

export async function setupPowerSync() {
  const connector = new Connector();
  await powersync.connect(connector);
}
