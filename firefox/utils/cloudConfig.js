

const CLOUD_CONFIG = {

  GOOGLE_DRIVE_CLIENT_ID: 'YOUR_GOOGLE_DRIVE_CLIENT_ID_HERE',
  

  ONEDRIVE_CLIENT_ID: 'YOUR_ONEDRIVE_CLIENT_ID_HERE',
  

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
  

  isConfigured(service) {
    switch (service) {
      case 'google':
        return this.GOOGLE_DRIVE_CLIENT_ID !== 'YOUR_GOOGLE_DRIVE_CLIENT_ID_HERE';
      case 'onedrive':
        return this.ONEDRIVE_CLIENT_ID !== 'YOUR_ONEDRIVE_CLIENT_ID_HERE';
      default:
        return false;
    }
  },
  

  getConfigurationMessage(service) {
    if (this.isConfigured(service)) {
      return `${service.charAt(0).toUpperCase() + service.slice(1)} is configured and ready to use.`;
    } else {
      return `${service.charAt(0).toUpperCase() + service.slice(1)} requires configuration. Please see utils/cloudConfig.js for setup instructions.`;
    }
  }
};


if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLOUD_CONFIG;
} else if (typeof window !== 'undefined') {
  window.CLOUD_CONFIG = CLOUD_CONFIG;
}
