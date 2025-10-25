const DEFAULT_GOOGLE_CLIENT_ID = '';
const DEFAULT_ONEDRIVE_CLIENT_ID = '';
const CLOUD_CREDENTIALS_KEY = 'cloudCredentials';

const credentialsState = {
  googleDriveClientId: DEFAULT_GOOGLE_CLIENT_ID,
  oneDriveClientId: DEFAULT_ONEDRIVE_CLIENT_ID,
  oneDriveTenant: 'common'
};

const CLOUD_CONFIG = {
  GOOGLE_DRIVE_CLIENT_ID: DEFAULT_GOOGLE_CLIENT_ID,
  ONEDRIVE_CLIENT_ID: DEFAULT_ONEDRIVE_CLIENT_ID,
  GOOGLE_DRIVE: {
    authUrl: 'https://accounts.google.com/oauth2/authorize',
    apiUrl: 'https://www.googleapis.com/drive/v3',
    uploadUrl: 'https://www.googleapis.com/upload/drive/v3/files',
    scopes: ['https://www.googleapis.com/auth/drive.file']
  },
  ONEDRIVE: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    apiUrl: 'https://graph.microsoft.com/v1.0/me/drive',
    scopes: ['Files.ReadWrite']
  },
  ready: Promise.resolve(),
  isConfigured(service) {
    switch (service) {
      case 'google':
        return this.GOOGLE_DRIVE_CLIENT_ID && this.GOOGLE_DRIVE_CLIENT_ID.length > 0;
      case 'onedrive':
        return this.ONEDRIVE_CLIENT_ID && this.ONEDRIVE_CLIENT_ID.length > 0;
      default:
        return false;
    }
  },
  getConfigurationMessage(service) {
    if (this.isConfigured(service)) {
      return `${service.charAt(0).toUpperCase() + service.slice(1)} is configured and ready to use.`;
    }
    return `${service.charAt(0).toUpperCase() + service.slice(1)} needs a client ID. Add it from the settings page under Cloud Provider Setup.`;
  },
  getClientId(service) {
    switch (service) {
      case 'google':
      case 'google-drive':
        return this.GOOGLE_DRIVE_CLIENT_ID;
      case 'onedrive':
      case 'one-drive':
        return this.ONEDRIVE_CLIENT_ID;
      default:
        return '';
    }
  },
  getCredentials() {
    return { ...credentialsState };
  },
  async reload() {
    const storage = (typeof chrome !== 'undefined' && chrome.storage?.sync) || (typeof browser !== 'undefined' && browser.storage?.sync);
    if (!storage || typeof storage.get !== 'function') {
      return this.getCredentials();
    }

    try {
      const result = await storage.get(CLOUD_CREDENTIALS_KEY);
      const stored = result?.[CLOUD_CREDENTIALS_KEY] || {};
      this.setCredentials(stored, { persist: false });
    } catch (error) {
      console.warn('Failed to load credentials from storage', error);
    }

    return this.getCredentials();
  },
  async setCredentials(newCredentials = {}, { persist = true } = {}) {
    const {
      googleDriveClientId = credentialsState.googleDriveClientId,
      oneDriveClientId = credentialsState.oneDriveClientId,
      oneDriveTenant = credentialsState.oneDriveTenant || 'common'
    } = newCredentials || {};

    credentialsState.googleDriveClientId = googleDriveClientId || DEFAULT_GOOGLE_CLIENT_ID;
    credentialsState.oneDriveClientId = oneDriveClientId || DEFAULT_ONEDRIVE_CLIENT_ID;
    credentialsState.oneDriveTenant = oneDriveTenant || 'common';

    this.GOOGLE_DRIVE_CLIENT_ID = credentialsState.googleDriveClientId || DEFAULT_GOOGLE_CLIENT_ID;
    this.ONEDRIVE_CLIENT_ID = credentialsState.oneDriveClientId || DEFAULT_ONEDRIVE_CLIENT_ID;

    if (persist) {
      const storage = (typeof chrome !== 'undefined' && chrome.storage?.sync) || (typeof browser !== 'undefined' && browser.storage?.sync);
      if (storage && typeof storage.set === 'function') {
        try {
          await storage.set({
            [CLOUD_CREDENTIALS_KEY]: {
              googleDriveClientId: credentialsState.googleDriveClientId,
              oneDriveClientId: credentialsState.oneDriveClientId,
              oneDriveTenant: credentialsState.oneDriveTenant
            }
          });
        } catch (error) {
          console.warn('Failed to persist credentials', error);
        }
      }
    }

    return this.getCredentials();
  }
};

const initializeCredentials = () => {
  const storage = (typeof chrome !== 'undefined' && chrome.storage?.sync) || (typeof browser !== 'undefined' && browser.storage?.sync);
  if (!storage || typeof storage.get !== 'function') {
    return Promise.resolve(CLOUD_CONFIG.getCredentials());
  }

  return storage
    .get(CLOUD_CREDENTIALS_KEY)
    .then((result) => {
      const stored = result?.[CLOUD_CREDENTIALS_KEY] || {};
      CLOUD_CONFIG.setCredentials(stored, { persist: false });
      return CLOUD_CONFIG.getCredentials();
    })
    .catch((error) => {
      console.warn('Unable to load stored credentials', error);
      return CLOUD_CONFIG.getCredentials();
    });
};

CLOUD_CONFIG.ready = initializeCredentials();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLOUD_CONFIG;
} else if (typeof window !== 'undefined') {
  window.CLOUD_CONFIG = CLOUD_CONFIG;
}
