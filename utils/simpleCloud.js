/**
 * Simplified Cloud Storage Manager
 * Provides easy cloud integration without complex OAuth setup
 */

class SimpleCloudStorage {
  constructor() {
    this.services = {
      imgur: {
        name: 'Imgur',
        apiUrl: 'https://api.imgur.com/3/image',
        description: 'Free image hosting service',
        requiresAuth: false
      },
      cloudinary: {
        name: 'Cloudinary',
        apiUrl: 'https://api.cloudinary.com/v1_1',
        description: 'Professional cloud storage',
        requiresAuth: true
      }
    };
    
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      const result = await chrome.storage.local.get(['simpleCloudConfig']);
      this.config = result.simpleCloudConfig || {};
    } catch (error) {
      console.error('Failed to load cloud config:', error);
      this.config = {};
    }
  }

  /**
   * Upload to Imgur (no auth required)
   */
  async uploadToImgur(dataUrl) {
    try {
      // Convert data URL to base64
      const base64Data = dataUrl.split(',')[1];
      
      const response = await fetch(this.services.imgur.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7', // Public Imgur client ID
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          type: 'base64',
          title: `YouTube Screenshot - ${new Date().toISOString()}`,
          description: 'Screenshot captured with YouTube Screenshot Helper'
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          url: result.data.link,
          deleteUrl: `https://imgur.com/delete/${result.data.deletehash}`,
          service: 'imgur'
        };
      } else {
        throw new Error('Upload failed: Invalid response');
      }
    } catch (error) {
      console.error('Imgur upload failed:', error);
      return {
        success: false,
        error: error.message,
        service: 'imgur'
      };
    }
  }

  /**
   * Upload to user's preferred service
   */
  async uploadScreenshot(dataUrl, filename) {
    const service = this.config.preferredService || 'imgur';
    
    switch (service) {
      case 'imgur':
        return await this.uploadToImgur(dataUrl);
      default:
        return {
          success: false,
          error: 'Unsupported service',
          service: service
        };
    }
  }

  /**
   * Get available services
   */
  getAvailableServices() {
    return Object.keys(this.services).map(key => ({
      id: key,
      ...this.services[key]
    }));
  }

  /**
   * Set preferred service
   */
  async setPreferredService(serviceId) {
    this.config.preferredService = serviceId;
    await chrome.storage.local.set({ simpleCloudConfig: this.config });
  }

  /**
   * Check if service is configured
   */
  isServiceConfigured(serviceId) {
    if (serviceId === 'imgur') {
      return true; // No configuration needed
    }
    return false;
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceId) {
    if (serviceId === 'imgur') {
      return {
        connected: true,
        message: 'Ready to use (no authentication required)'
      };
    }
    
    return {
      connected: false,
      message: 'Service not available'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimpleCloudStorage;
} else if (typeof window !== 'undefined') {
  window.SimpleCloudStorage = SimpleCloudStorage;
}
