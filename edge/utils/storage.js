// Storage utility functions for YouTube Screenshot Helper

class StorageManager {
  constructor() {
    this.defaultSettings = {
      enabledSites: ['youtube.com', 'vimeo.com', 'twitch.tv'],
      fullscreenShortcut: 'shift+enter',
      fullscreenOnly: false,
      autoHideControls: true,
      uploadToCloud: false,
      annotationMode: false,
      cloudService: 'none',
      screenshotQuality: 0.9,
      filenameTemplate: '',
      debugMode: false,
      showNotifications: true,
      captureDelay: 100,
      preventDefault: true,
      themePreference: 'auto',
      // Title builder settings
      includeYoutube: true,
      includeVideoTitle: true,
      includeChannelName: false,
      includePlaylistName: false,
      includeChapter: false,
      includeTimestamp: true,
      includeDate: true,
      includeTime: false,
      titleSeparator: ' - ',
      // Fullscreen popup settings (disabled - functionality removed per user request)
      showFullscreenPopup: false,
      fullscreenPopupDuration: 3000,
      // Download path settings
      useCustomPath: false,
      customDownloadPath: '',
      // Folder organization settings
      organizeFolders: 'none',
      customFolderPattern: '{channel}/{date}',
      // Screenshot preview settings
      disablePreviewByDefault: false
    };
  }

  async getSettings(retryCount = 3, delay = 100) {
    for (let i = 0; i < retryCount; i++) {
      try {
        if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.sendMessage) {
          console.warn('StorageManager: browser.runtime.sendMessage not available. Returning default settings.');
          return this.defaultSettings;
        }

        const response = await browser.runtime.sendMessage({ action: 'getSettings' });

        if (response && response.success === false) {
          console.error('StorageManager: Failed to get settings from background script:', response.error);
          return this.defaultSettings; // Don't retry on logical failure
        }

        // On success, merge with defaults and return.
        return { ...this.defaultSettings, ...response };

      } catch (error) {
        const isInvalidated = error.message && (error.message.includes('receiving end does not exist') || error.message.includes('Could not establish connection'));

        if (isInvalidated && i < retryCount - 1) {
          console.warn(`StorageManager: Connection failed (attempt ${i + 1}/${retryCount}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry the loop
        }

        console.error('StorageManager: Error sending message to get settings:', error);
        if (isInvalidated) {
          console.warn('StorageManager: Connection to background script failed after retries. Using default settings.');
        }
        return this.defaultSettings; // Return defaults after last retry or for other errors
      }
    }
    return this.defaultSettings; // Fallback in case loop finishes unexpectedly
  }

  async setSetting(key, value) {
    try {
      if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.sendMessage) {
        console.warn('StorageManager: browser.runtime.sendMessage not available. Cannot save setting.');
        return false;
      }

      const response = await browser.runtime.sendMessage({ action: 'setSetting', key, value });
      if (response && response.success) {
        return true;
      }
      console.error('StorageManager: Failed to set setting:', response?.error);
      return false;
    } catch (error) {
      console.error('StorageManager: Error sending message to set setting:', error);
      return false;
    }
  }

  async setSettings(settings) {
    try {
      if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.sendMessage) {
        console.warn('StorageManager: browser.runtime.sendMessage not available. Cannot save settings.');
        return false;
      }

      const response = await browser.runtime.sendMessage({ action: 'setSettings', settings });
      if (response && response.success) {
        return true;
      }
      console.error('StorageManager: Failed to set multiple settings:', response?.error);
      return false;
    } catch (error) {
      console.error('StorageManager: Error sending message to set settings:', error);
      return false;
    }
  }

  // Check if current site is enabled
  async isCurrentSiteEnabled() {
    const settings = await this.getSettings();
    const hostname = window.location.hostname;
    return settings.enabledSites.some(site => hostname.includes(site));
  }

  // Generate filename based on template
  generateFilename(template, metadata) {
    const now = new Date();
    
    const replacements = {
      '{site}': metadata.site || window.location.hostname,
      '{title}': metadata.title || 'video',
      '{chapter}': metadata.chapter || '',
      '{timestamp}': metadata.currentTime || '',
      '{date}': now.toISOString().split('T')[0],
      '{time}': now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-'),
      '{datetime}': now.toISOString().replace('T', '_').replace(/[:.]/g, '-').split('.')[0],
      '{year}': now.getFullYear().toString(),
      '{month}': (now.getMonth() + 1).toString().padStart(2, '0'),
      '{day}': now.getDate().toString().padStart(2, '0'),
      '{hour}': now.getHours().toString().padStart(2, '0'),
      '{minute}': now.getMinutes().toString().padStart(2, '0'),
      '{second}': now.getSeconds().toString().padStart(2, '0')
    };

    let filename = template || '{site}-{title}-{timestamp}';
    Object.entries(replacements).forEach(([placeholder, value]) => {
      filename = filename.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
    });

    // Clean up filename
    filename = filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/[-_\s]+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      + '.png';

    return filename;
  }
}

// Create global instance only in browser environment
if (typeof window !== 'undefined') {
  window.storageManager = new StorageManager();
}
