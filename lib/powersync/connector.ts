import {
  PowerSyncBackendConnector,
  AbstractPowerSyncDatabase,
  UpdateType,
} from '@powersync/react-native';
import Constants from 'expo-constants';
import { getDeviceId } from '../device-id';

function getBackendUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:3000`;
    }
    return 'http://localhost:3000';
  }
  return 'https://quiz-yourself-admin.ohapps.com';
}

function getPowerSyncUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:8090`;
    }
    return 'http://localhost:8090';
  }
  return 'https://powersync.ohapps.com';
}

export class Connector implements PowerSyncBackendConnector {
  private backendUrl = getBackendUrl();
  private powersyncUrl = getPowerSyncUrl();

  async fetchCredentials() {
    const userId = await getDeviceId();
    const response = await fetch(
      `${this.backendUrl}/api/auth/token?user_id=${encodeURIComponent(userId)}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.status}`);
    }
    const { token } = await response.json();
    return {
      endpoint: this.powersyncUrl,
      token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    for (const op of transaction.crud) {
      const record = { ...op.opData, id: op.id };
      const table = op.table;

      switch (op.op) {
        case UpdateType.PUT:
          await fetch(`${this.backendUrl}/api/sync/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record),
          });
          break;
        case UpdateType.PATCH:
          await fetch(`${this.backendUrl}/api/sync/${table}/${op.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.opData),
          });
          break;
        case UpdateType.DELETE:
          await fetch(`${this.backendUrl}/api/sync/${table}/${op.id}`, {
            method: 'DELETE',
          });
          break;
      }
    }

    await transaction.complete();
  }
}
