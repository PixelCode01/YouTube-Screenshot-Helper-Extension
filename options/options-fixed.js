// Options page script for YouTube Screenshot Helper
console.log('YouTube Screenshot Helper: Options page loaded');

class OptionsManager {
  constructor() {
    this.settings = {};
    this.defaults = {
      enableOnYoutube: true,
      enableOnOtherSites: false,
      additionalSites: [],
      hideControls: true,
      hideTitle: true,
      hideComments: false,
      hideSidebar: false,
      hideHeader: false,
      autoHide: true,
      hideDelay: 1000,
      showNotification: true,
      notificationDuration: 3000,
      shortcutKey: 'KeyS',
      fullscreenShortcut: 'shift+enter',
      shortcutModifiers: ['ctrlKey'],
      enableKeyboard: true,
      enableMouse: true,
      quality: 0.9,
      format: 'png',
      includeYoutube: true,
      includeVideoTitle: true,
      includeChannelName: false,
      includePlaylistName: false,
      includeChapter: false,
      includeTimestamp: true,
      includeDate: true,
      includeTime: false,
      titleSeparator: ' - ',
      filenameTemplate: '',
      organizeFolders: 'none',
      customFolderPattern: '{channel}/{date}',
      uploadToCloud: false,
      cloudService: 'gdrive',
      themePreference: 'auto',
      debugMode: false,
      fullscreenOnly: false,
      autoHideControls: true,
      screenshotQuality: 0.9,
      annotationMode: false,
      preventDefault: true,
      captureDelay: 100,
      showFullscreenPopup: false,
      fullscreenPopupDuration: 3,
      useCustomPath: false,
      customDownloadPath: '',
      overrideSiteShortcuts: false
    };
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.initializeTheme();
    this.updateTitlePreview();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(null);
      this.settings = { ...this.defaults, ...result };
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaults };
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('Tab clicked:', e.target.dataset.tab);
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Toggle switches - with null checks
    this.setupToggle('enableOnYoutube');
    this.setupToggle('enableOnOtherSites', () => this.updateSitesList());
    this.setupToggle('hideControls');
    this.setupToggle('hideTitle');
    this.setupToggle('hideComments');
    this.setupToggle('hideSidebar');
    this.setupToggle('hideHeader');
    this.setupToggle('autoHide');
    this.setupToggle('showNotification');
    this.setupToggle('enableKeyboard');
    this.setupToggle('enableMouse');
    this.setupToggle('uploadToCloud', () => this.updateCloudServiceVisibility());
    this.setupToggle('debugMode');
    this.setupToggle('fullscreenOnly');
    this.setupToggle('autoHideControls');
    this.setupToggle('annotationMode');
    this.setupToggle('preventDefault');
    this.setupToggle('showFullscreenPopup');
    this.setupToggle('useCustomPath', () => this.updateCustomPathVisibility());
    this.setupToggle('overrideSiteShortcuts');

    // Title builder toggles
    this.setupToggle('includeYoutube', () => this.updateTitlePreview());
    this.setupToggle('includeVideoTitle', () => this.updateTitlePreview());
    this.setupToggle('includeChannelName', () => this.updateTitlePreview());
    this.setupToggle('includePlaylistName', () => this.updateTitlePreview());
    this.setupToggle('includeChapter', () => this.updateTitlePreview());
    this.setupToggle('includeTimestamp', () => this.updateTitlePreview());
    this.setupToggle('includeDate', () => this.updateTitlePreview());
    this.setupToggle('includeTime', () => this.updateTitlePreview());

    // Other controls with null checks
    this.setupControl('themePreference', 'change', (e) => {
      this.updateSetting('themePreference', e.target.value);
      this.applyTheme(e.target.value);
    });

    this.setupControl('fullscreenShortcut', 'change', (e) => {
      this.updateSetting('fullscreenShortcut', e.target.value);
    });

    this.setupControl('fullscreenPopupDuration', 'input', (e) => {
      this.updateSetting('fullscreenPopupDuration', parseInt(e.target.value));
    });

    this.setupControl('customDownloadPath', 'input', (e) => {
      this.updateSetting('customDownloadPath', e.target.value);
    });

    this.setupControl('cloudService', 'change', (e) => {
      this.updateSetting('cloudService', e.target.value);
      this.updateCloudServiceVisibility();
    });

    // Button event listeners
    this.setupButton('openShortcutsBtn', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    this.setupButton('browsePathBtn', () => {
      this.browsePath();
    });

    this.setupButton('setupCloudBtn', () => {
      this.setupCloudService();
    });

    // Theme toggle button
    this.setupButton('themeToggle', () => {
      this.toggleTheme();
    });
  }

  setupControl(id, event, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
    }
  }

  setupButton(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', handler);
    }
  }

  setupToggle(key, callback = null) {
    const element = document.getElementById(key);
    if (element) {
      element.addEventListener('change', (e) => {
        this.updateSetting(key, e.target.checked);
        if (callback) callback();
      });
    }
  }

  switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Show selected tab
    const targetTab = document.getElementById(tabName);
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    try {
      await chrome.storage.sync.set({ [key]: value });
      console.log(`Setting updated: ${key} = ${value}`);
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  }

  updateUI() {
    // Update all form controls with current settings
    Object.keys(this.settings).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = this.settings[key];
        } else {
          element.value = this.settings[key];
        }
      }
    });

    // Update conditional visibility
    this.updateCustomPathVisibility();
    this.updateCloudServiceVisibility();
    this.updateSitesList();
  }

  updateCustomPathVisibility() {
    const container = document.getElementById('customPathContainer');
    const browseBtn = document.getElementById('browsePathBtn');
    if (container) {
      container.style.display = this.settings.useCustomPath ? 'block' : 'none';
    }
    if (browseBtn) {
      browseBtn.style.display = this.settings.useCustomPath ? 'inline-block' : 'none';
    }
  }

  updateCloudServiceVisibility() {
    const container = document.getElementById('cloudServiceContainer');
    const setupBtn = document.getElementById('setupCloudBtn');
    if (container) {
      container.style.display = this.settings.uploadToCloud ? 'block' : 'none';
    }
    if (setupBtn) {
      setupBtn.style.display = this.settings.uploadToCloud ? 'inline-block' : 'none';
    }
  }

  updateSitesList() {
    const container = document.getElementById('additionalSitesContainer');
    if (container) {
      container.style.display = this.settings.enableOnOtherSites ? 'block' : 'none';
    }
  }

  // Theme management
  initializeTheme() {
    const savedTheme = this.settings.themePreference || 'auto';
    this.applyTheme(savedTheme);
    this.updateThemeToggleButton();
  }

  applyTheme(theme) {
    const body = document.body;
    const themeSelect = document.getElementById('themePreference');
    
    // Sync dropdown with current theme
    if (themeSelect) {
      themeSelect.value = theme;
    }
    
    // Apply theme to body
    if (theme === 'auto') {
      body.removeAttribute('data-theme');
    } else {
      body.setAttribute('data-theme', theme);
    }
    
    // Update theme toggle button
    this.updateThemeToggleButton();
  }

  updateThemeToggleButton() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const currentTheme = this.settings.themePreference || 'auto';
    const isDark = currentTheme === 'dark' || 
                   (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Update button text based on current theme
    if (isDark) {
      themeToggle.textContent = '☀️ Light Mode';
      themeToggle.title = 'Switch to Light Mode';
    } else {
      themeToggle.textContent = '🌙 Dark Mode';
      themeToggle.title = 'Switch to Dark Mode';
    }
  }

  toggleTheme() {
    const currentTheme = this.settings.themePreference || 'auto';
    let nextTheme;
    
    // Cycle through themes: auto → light → dark → auto
    switch (currentTheme) {
      case 'auto':
        nextTheme = 'light';
        break;
      case 'light':
        nextTheme = 'dark';
        break;
      case 'dark':
        nextTheme = 'auto';
        break;
      default:
        nextTheme = 'auto';
    }
    
    this.updateSetting('themePreference', nextTheme);
    this.applyTheme(nextTheme);
  }

  // File browsing
  async browsePath() {
    try {
      // Try to use the File System Access API if available
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker();
        const pathInput = document.getElementById('customDownloadPath');
        if (pathInput) {
          pathInput.value = dirHandle.name;
          this.updateSetting('customDownloadPath', dirHandle.name);
        }
      } else {
        // Fallback: show manual input prompt
        const path = prompt('Enter the folder path for downloads:', this.settings.customDownloadPath || '');
        if (path !== null) {
          const pathInput = document.getElementById('customDownloadPath');
          if (pathInput) {
            pathInput.value = path;
            this.updateSetting('customDownloadPath', path);
          }
        }
      }
    } catch (error) {
      console.error('Error browsing path:', error);
    }
  }

  // Cloud setup
  setupCloudService() {
    const service = this.settings.cloudService;
    let url = '';
    
    switch (service) {
      case 'gdrive':
        url = 'https://developers.google.com/drive/api/quickstart/js';
        break;
      case 'onedrive':
        url = 'https://docs.microsoft.com/en-us/onedrive/developer/';
        break;
      case 'dropbox':
        url = 'https://www.dropbox.com/developers/apps';
        break;
      default:
        url = 'https://developer.chrome.com/docs/extensions/reference/';
    }
    
    chrome.tabs.create({ url });
  }

  updateTitlePreview() {
    const previewElement = document.getElementById('titlePreview');
    if (!previewElement) return;

    const components = [];
    const separator = this.settings.titleSeparator || ' - ';
    
    if (this.settings.includeYoutube) {
      components.push('YouTube');
    }
    
    if (this.settings.includeChannelName) {
      components.push('Channel Name');
    }
    
    if (this.settings.includePlaylistName) {
      components.push('Playlist Name');
    }
    
    if (this.settings.includeVideoTitle) {
      components.push('Amazing Video Title');
    }
    
    if (this.settings.includeChapter) {
      components.push('Chapter 1');
    }
    
    if (this.settings.includeTimestamp) {
      components.push('12m34s');
    }
    
    if (this.settings.includeDate) {
      components.push('2024-06-20');
    }
    
    if (this.settings.includeTime) {
      components.push('14-30');
    }
    
    const filename = components.join(separator) || 'youtube-screenshot';
    previewElement.textContent = filename + '.png';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.optionsManager = new OptionsManager();
    window.optionsManager.init();
  });
} else {
  window.optionsManager = new OptionsManager();
  window.optionsManager.init();
}
