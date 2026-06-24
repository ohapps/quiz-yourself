import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { getDeviceId } from '../device-id';
import { getAuthUserId, refreshAccessToken } from '../auth';
import { getBackendUrl, getPowerSyncUrl } from '../config';

export class Connector implements PowerSyncBackendConnector {
  private backendUrl = getBackendUrl();
  private powersyncUrl = getPowerSyncUrl();

  async fetchCredentials() {
    // Try Auth0 first
    const auth0UserId = await getAuthUserId();
    if (auth0UserId) {
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        const response = await fetch(
          `${this.backendUrl}/api/auth/token`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (response.ok) {
          const { token } = await response.json();
          return { endpoint: this.powersyncUrl, token };
        }
      }
      // Auth0 user exists but can't get a valid token right now.
      // Request a PowerSync token using the stored Auth0 user ID directly.
      // This keeps identity consistent — sync will resume when connectivity returns.
      const response = await fetch(
        `${this.backendUrl}/api/auth/token?user_id=${encodeURIComponent(auth0UserId)}`
      );
      if (response.ok) {
        const { token } = await response.json();
        return { endpoint: this.powersyncUrl, token };
      }
      // Fully offline — throw so PowerSync retries later
      throw new Error('Unable to obtain credentials — will retry when online');
    }

    // No Auth0 user — use device ID
    const userId = await getDeviceId();
    const response = await fetch(
      `${this.backendUrl}/api/auth/token?user_id=${encodeURIComponent(userId)}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.status}`);
    }
    const { token } = await response.json();
    return { endpoint: this.powersyncUrl, token };
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
