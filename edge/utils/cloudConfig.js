/**
 * Note: browser-polyfill.js is loaded via manifest.json
 *
 * Cloud Service Configuration
 * 
 * SETUP INSTRUCTIONS:
 * To enable cloud storage features, you need to register with cloud providers:
 * 
 * FOR GOOGLE DRIVE:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Drive API
 * 4. Create OAuth 2.0 credentials
 * 5. Add your extension ID to authorized origins
 * 6. Replace 'YOUR_GOOGLE_CLIENT_ID' below with your actual client ID
 * 
 * FOR ONEDRIVE:
 * 1. Go to https://portal.azure.com/
 * 2. Register a new application
 * 3. Configure API permissions for Files.ReadWrite
 * 4. Get the Application (client) ID
 * 5. Replace 'YOUR_MICROSOFT_CLIENT_ID' below with your actual client ID
 * 
 * SECURITY NOTE: These are public client IDs, not secrets
 */

const CLOUD_CONFIG = {
  // Replace with your actual Google Drive client ID
  GOOGLE_DRIVE_CLIENT_ID: 'YOUR_GOOGLE_DRIVE_CLIENT_ID_HERE',
  
  // Replace with your actual OneDrive/Microsoft client ID  
  ONEDRIVE_CLIENT_ID: 'YOUR_ONEDRIVE_CLIENT_ID_HERE',
  
  // Google Drive API configuration
  GOOGLE_DRIVE: {
    authUrl: 'https://accounts.google.com/oauth2/authorize',
    apiUrl: 'https://www.googleapis.com/drive/v3',
    uploadUrl: 'https://www.googleapis.com/upload/drive/v3/files',
    scopes: ['https://www.googleapis.com/auth/drive.file']
  },
  
  // OneDrive API configuration
  ONEDRIVE: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    apiUrl: 'https://graph.microsoft.com/v1.0/me/drive',
    scopes: ['Files.ReadWrite']
  },
  
  // Helper function to check if cloud service is configured
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
  
  // Get configuration status message
  getConfigurationMessage(service) {
    if (this.isConfigured(service)) {
      return `${service.charAt(0).toUpperCase() + service.slice(1)} is configured and ready to use.`;
    } else {
      return `${service.charAt(0).toUpperCase() + service.slice(1)} requires configuration. Please see utils/cloudConfig.js for setup instructions.`;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLOUD_CONFIG;
} else if (typeof window !== 'undefined') {
  window.CLOUD_CONFIG = CLOUD_CONFIG;
}
