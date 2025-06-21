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

  async getSettings() {
    try {
      console.log('=== STORAGE MANAGER: GET SETTINGS DEBUG ===');
      
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, using default settings');
        return this.defaultSettings;
      }
      
      console.log('Fetching settings from chrome.storage.sync...');
      const settings = await chrome.storage.sync.get(this.defaultSettings);
      
      console.log('Raw settings from storage:', settings);
      console.log('Folder organization specific settings:');
      console.log('- organizeFolders:', settings.organizeFolders);
      console.log('- customFolderPattern:', settings.customFolderPattern);
      console.log('- useCustomPath:', settings.useCustomPath);
      console.log('- customDownloadPath:', settings.customDownloadPath);
      
      const mergedSettings = { ...this.defaultSettings, ...settings };
      console.log('Final merged settings (folder org):', {
        organizeFolders: mergedSettings.organizeFolders,
        customFolderPattern: mergedSettings.customFolderPattern,
        useCustomPath: mergedSettings.useCustomPath,
        customDownloadPath: mergedSettings.customDownloadPath
      });
      console.log('=== STORAGE MANAGER: GET SETTINGS END ===');
      
      return mergedSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      
      // If extension context is invalidated, return defaults
      if (error.message && (
          error.message.includes('Extension context invalidated') ||
          error.message.includes('receiving end does not exist') ||
          error.message.includes('Could not establish connection')
        )) {
        console.warn('Extension context invalidated, using default settings');
        return this.defaultSettings;
      }
      
      return this.defaultSettings;
    }
  }

  isExtensionContextValid() {
    try {
      // Check if chrome API is available
      if (!chrome || !chrome.runtime) {
        return false;
      }
      
      // Check if extension runtime is still connected
      if (chrome.runtime.id === undefined) {
        return false;
      }
      
      // Try to access chrome.storage to see if it's available
      if (!chrome.storage || !chrome.storage.sync) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Extension context validation failed:', error);
      return false;
    }
  }

  async setSetting(key, value) {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, cannot save setting');
        return false;
      }
      
      await chrome.storage.sync.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Error setting:', key, error);
      
      // If extension context is invalidated, return false
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, cannot save setting');
        return false;
      }
      
      return false;
    }
  }

  async setSettings(settings) {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, cannot save settings');
        return false;
      }
      
      await chrome.storage.sync.set(settings);
      return true;
    } catch (error) {
      console.error('Error setting multiple settings:', error);
      
      // If extension context is invalidated, return false
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, cannot save settings');
        return false;
      }
      
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
