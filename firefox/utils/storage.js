

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

  canUseDirectSyncStorage() {
    try {
      return typeof browser !== 'undefined' &&
        browser?.storage?.sync &&
        typeof browser.storage.sync.get === 'function' &&
        typeof browser.storage.sync.set === 'function';
    } catch (error) {
      console.debug('StorageManager: Direct storage availability check failed:', error);
      return false;
    }
  }

  async getSettings(retryCount = 3, delay = 100) {
    if (this.canUseDirectSyncStorage()) {
      try {
        const directSettings = await browser.storage.sync.get(null);
        return { ...this.defaultSettings, ...directSettings };
      } catch (error) {
        console.warn('StorageManager: Direct storage fetch failed, falling back to messaging.', error);
      }
    }

    for (let i = 0; i < retryCount; i++) {
      try {
        if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.sendMessage) {
          console.warn('StorageManager: browser.runtime.sendMessage not available. Returning default settings.');
          return this.defaultSettings;
        }

        const response = await browser.runtime.sendMessage({ action: 'getSettings' });

        if (response && response.success === false) {
          console.error('StorageManager: Failed to get settings from background script:', response.error);
          return this.defaultSettings;
        }


        return { ...this.defaultSettings, ...response };

      } catch (error) {
        const isInvalidated = error.message && (error.message.includes('receiving end does not exist') || error.message.includes('Could not establish connection'));

        if (isInvalidated && i < retryCount - 1) {
          console.debug(`StorageManager: Messaging attempt ${i + 1}/${retryCount} failed (${error.message}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error('StorageManager: Error sending message to get settings:', error);
        if (isInvalidated && typeof browser !== 'undefined' && browser.storage && browser.storage.sync && typeof browser.storage.sync.get === 'function') {
          try {
            const directSettings = await browser.storage.sync.get(null);
            console.warn('StorageManager: Falling back to direct storage access after messaging failure.');
            return { ...this.defaultSettings, ...directSettings };
          } catch (directError) {
            console.warn('StorageManager: Direct storage fallback failed:', directError);
          }
        }
        if (isInvalidated) {
          console.warn('StorageManager: Connection to background script failed after retries. Using default settings.');
        }
        return this.defaultSettings;
      }
    }
    return this.defaultSettings;
  }

  async setSetting(key, value) {
    try {
      if (this.canUseDirectSyncStorage()) {
        await browser.storage.sync.set({ [key]: value });
        return true;
      }

      if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.sendMessage) {
        console.warn('StorageManager: browser.runtime.sendMessage not available. Cannot save setting.');
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync && typeof browser.storage.sync.set === 'function') {
          await browser.storage.sync.set({ [key]: value });
          return true;
        }
        return false;
      }

      const response = await browser.runtime.sendMessage({ action: 'setSetting', key, value });
      if (response && response.success) {
        return true;
      }
      console.error('StorageManager: Failed to set setting:', response?.error);
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync && typeof browser.storage.sync.set === 'function') {
        try {
          await browser.storage.sync.set({ [key]: value });
          console.warn('StorageManager: Saved setting directly after messaging failure.');
          return true;
        } catch (directError) {
          console.error('StorageManager: Direct storage fallback failed:', directError);
        }
      }
      return false;
    } catch (error) {
      console.error('StorageManager: Error sending message to set setting:', error);
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync && typeof browser.storage.sync.set === 'function') {
        try {
          await browser.storage.sync.set({ [key]: value });
          console.warn('StorageManager: Saved setting directly after error.');
          return true;
        } catch (directError) {
          console.error('StorageManager: Direct storage fallback failed:', directError);
        }
      }
      return false;
    }
  }

  async setSettings(settings) {
    try {
      if (this.canUseDirectSyncStorage()) {
        await browser.storage.sync.set(settings);
        return true;
      }

      if (typeof browser === 'undefined' || !browser.runtime || !browser.runtime.sendMessage) {
        console.warn('StorageManager: browser.runtime.sendMessage not available. Cannot save settings.');
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync && typeof browser.storage.sync.set === 'function') {
          await browser.storage.sync.set(settings);
          return true;
        }
        return false;
      }

      const response = await browser.runtime.sendMessage({ action: 'setSettings', settings });
      if (response && response.success) {
        return true;
      }
      console.error('StorageManager: Failed to set multiple settings:', response?.error);
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync && typeof browser.storage.sync.set === 'function') {
        try {
          await browser.storage.sync.set(settings);
          console.warn('StorageManager: Saved settings directly after messaging failure.');
          return true;
        } catch (directError) {
          console.error('StorageManager: Direct storage fallback failed:', directError);
        }
      }
      return false;
    } catch (error) {
      console.error('StorageManager: Error sending message to set settings:', error);
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync && typeof browser.storage.sync.set === 'function') {
        try {
          await browser.storage.sync.set(settings);
          console.warn('StorageManager: Saved settings directly after error.');
          return true;
        } catch (directError) {
          console.error('StorageManager: Direct storage fallback failed:', directError);
        }
      }
      return false;
    }
  }


  async isCurrentSiteEnabled() {
    const settings = await this.getSettings();
    const hostname = window.location.hostname;
    const isDirectMatch = settings.enabledSites.some(site => hostname.includes(site));
    if (isDirectMatch) {
      return true;
    }

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
