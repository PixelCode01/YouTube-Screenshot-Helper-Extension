/**
 * Note: browser-polyfill.js is loaded via manifest.json
 *
 * Cloud Storage Integration for YouTube Screenshot Helper
 * Supports Google Drive uploads
 */

class CloudStorageManager {
  constructor() {
    this.authTokens = {};
    this.initializeCloudStorage();
  }

  async initializeCloudStorage() {
    // Load stored authentication tokens
    try {
      const result = await browser.storage.local.get(['cloudAuthTokens']);
      this.authTokens = result.cloudAuthTokens || {};
    } catch (error) {
      console.error('Failed to load cloud auth tokens:', error);
      this.authTokens = {};
    }
  }

  /**
   * Authenticate with Google Drive
   */
  async authenticateGoogleDrive() {
    try {
      // Check if configuration is available
      if (!window.CLOUD_CONFIG || !window.CLOUD_CONFIG.GOOGLE_DRIVE_CLIENT_ID || 
          window.CLOUD_CONFIG.GOOGLE_DRIVE_CLIENT_ID === 'YOUR_GOOGLE_DRIVE_CLIENT_ID_HERE') {
        throw new Error('Google Drive client ID not configured. Please check cloudConfig.js');
      }

      console.log('🔄 Starting Google Drive authentication...');
      
      const redirectURL = browser.identity.getRedirectURL();
      const clientId = window.CLOUD_CONFIG.GOOGLE_DRIVE_CLIENT_ID;
      const scopes = window.CLOUD_CONFIG.GOOGLE_DRIVE.scopes;
      const authURL = `${window.CLOUD_CONFIG.GOOGLE_DRIVE.authUrl}` +
        `?client_id=${clientId}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectURL)}` +
        `&scope=${encodeURIComponent(scopes.join(' '))}`;

      console.log('🔗 Auth URL:', authURL);
      console.log('🔄 Launching Chrome identity auth flow...');

      const responseUrl = await browser.identity.launchWebAuthFlow({
        url: authURL,
        interactive: true
      });

      console.log('✅ Auth flow completed, response URL received');

      // Extract access token from response URL
      const token = this.extractTokenFromUrl(responseUrl);
      if (token) {
        console.log('✅ Access token extracted successfully');
        this.authTokens.googleDrive = token;
        await this.saveAuthTokens();
        return token;
      }
      throw new Error('Failed to extract access token from response');
    } catch (error) {
      console.error('❌ Google Drive authentication failed:', error);
      
      // Handle specific Chrome identity errors
      if (error.message && error.message.includes('Authorization page')) {
        throw new Error('Authentication cancelled by user');
      } else if (error.message && error.message.includes('network')) {
        throw new Error('Network error during authentication. Please check your connection.');
      } else if (error.message && error.message.includes('client ID')) {
        throw new Error('Google Drive client ID not configured. Please check cloudConfig.js');
      }
      
      throw error;
    }
  }

  /**
   * Extract access token from OAuth redirect URL
   */
  extractTokenFromUrl(url) {
    const urlParams = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
    return urlParams.get('access_token');
  }

  /**
   * Save authentication tokens to storage
   */
  async saveAuthTokens() {
    try {
      await browser.storage.local.set({ cloudAuthTokens: this.authTokens });
    } catch (error) {
      console.error('Failed to save auth tokens:', error);
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadToGoogleDrive(dataUrl, filename, folderId = null) {
    try {
      let token = this.authTokens.googleDrive;
      if (!token) {
        token = await this.authenticateGoogleDrive();
      }

      // Convert data URL to blob
      const blob = this.dataUrlToBlob(dataUrl);
      
      // Create metadata
      const metadata = {
        name: filename,
        parents: folderId ? [folderId] : undefined
      };

      // Upload using multipart request
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      let body = delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) + delimiter +
        'Content-Type: image/png\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        dataUrl.split(',')[1] +
        close_delim;

      const response = await fetch(`${window.CLOUD_CONFIG.GOOGLE_DRIVE.uploadUrl}?uploadType=multipart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: body
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, re-authenticate
          delete this.authTokens.googleDrive;
          await this.saveAuthTokens();
          return await this.uploadToGoogleDrive(dataUrl, filename, folderId);
        }
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Google Drive upload failed:', error);
      throw error;
    }
  }

  /**
   * Convert data URL to Blob
   */
  dataUrlToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Upload to the specified cloud service
   */
  async uploadToCloud(dataUrl, filename, service) {
    switch (service) {
      case 'gdrive':
        return await this.uploadToGoogleDrive(dataUrl, filename);
      default:
        throw new Error(`Unsupported cloud service: ${service}. Only Google Drive is supported.`);
    }
  }

  /**
   * Check if authenticated for a service
   */
  isAuthenticated(service) {
    switch (service) {
      case 'gdrive':
        return !!this.authTokens.googleDrive;
      default:
        return false;
    }
  }

  /**
   * Clear authentication for a service
   */
  async clearAuthentication(service) {
    switch (service) {
      case 'gdrive':
        delete this.authTokens.googleDrive;
        break;
    }
    await this.saveAuthTokens();
  }
}

// Create global instance
window.cloudStorageManager = new CloudStorageManager();
