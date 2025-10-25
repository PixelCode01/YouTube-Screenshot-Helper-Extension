

class StorageManager {
  constructor() {
    this.defaultSettings = {
      enabledSites: ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'],
      fullscreenShortcut: 'shift+enter',
      fullscreenOnly: false,
      autoHideControls: true,
      uploadToCloud: false,
      annotationMode: false,
      cloudService: 'none',
      cloudFolderSelections: {},
      screenshotQuality: 0.9,
      filenameTemplate: '',
      debugMode: false,
      showNotifications: true,
      captureDelay: 100,
      preventDefault: true,
      themePreference: 'auto',
      includeYoutube: true,
      includeVideoTitle: true,
      includeChannelName: false,
      includePlaylistName: false,
      includeChapter: false,
      includeTimestamp: true,
      includeDate: true,
      includeTime: false,
      titleSeparator: ' - ',
      showFullscreenPopup: false,
      fullscreenPopupDuration: 3000,
      useCustomPath: false,
      customDownloadPath: '',
      silentDownloads: false,
      organizeFolders: 'none',
      customFolderPattern: '{channel}/{date}',
      disablePreviewByDefault: false
    };
  }

  async getSettings() {
    try {
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, using default settings');
        return this.defaultSettings;
      }
      const settings = await chrome.storage.sync.get(this.defaultSettings);
      const mergedSettings = { ...this.defaultSettings, ...settings };
      return mergedSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
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
      if (!chrome || !chrome.runtime) return false;
      if (chrome.runtime.id === undefined) return false;
      if (!chrome.storage || !chrome.storage.sync) return false;
      return true;
    } catch (error) {
      console.error('Extension context validation failed:', error);
      return false;
    }
  }

  async setSetting(key, value) {
    try {
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, cannot save setting');
        return false;
      }
      await chrome.storage.sync.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Error setting:', key, error);
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, cannot save setting');
        return false;
      }
      return false;
    }
  }

  async setSettings(settings) {
    try {
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, cannot save settings');
        return false;
      }
      await chrome.storage.sync.set(settings);
      return true;
    } catch (error) {
      console.error('Error setting multiple settings:', error);
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, cannot save settings');
        return false;
      }
      return false;
    }
  }


  async isCurrentSiteEnabled() {
    const settings = await this.getSettings();
    const hostname = window.location.hostname;
    const isDirectMatch = settings.enabledSites.some(site => hostname.includes(site));
    if (isDirectMatch) return true;
    if (hostname.includes('youtube-nocookie.com')) {
      return settings.enabledSites.some(site => site.includes('youtube.com'));
    }
    return false;
  }


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

    filename = filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/[-_\s]+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      + '.png';

    return filename;
  }
}


if (typeof window !== 'undefined') {
  window.storageManager = new StorageManager();
}
