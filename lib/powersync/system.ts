import { PowerSyncDatabase } from '@powersync/react-native';
import { SQLJSOpenFactory } from '@powersync/adapter-sql-js';
import Constants from 'expo-constants';
import { AppSchema } from './schema';
import { Connector } from './connector';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: isExpoGo
    ? new SQLJSOpenFactory({ dbFilename: 'powersync-quiz.db' })
    : { dbFilename: 'powersync-quiz.db' },
});

export async function setupPowerSync() {
  const connector = new Connector();
  await powersync.connect(connector);
}
