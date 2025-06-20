// Options page script for YouTube Screenshot Helper
console.log('YouTube Screenshot Helper: Options page loaded');

class OptionsManager {
  constructor() {
    this.settings = {};
    this.defaults = {
      enabledSites: ['youtube.com', 'vimeo.com', 'twitch.tv'],
      fullscreenShortcut: 'shift+enter',
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
    this.darkThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
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

    this.darkThemeMediaQuery.addEventListener('change', (e) => {
        if (this.settings.themePreference === 'auto') {
            this.applyTheme('auto');
        }
    });

    // Toggle switches - with null checks
    this.setupToggle('uploadToCloud', () => this.updateCloudServiceVisibility());
    this.setupToggle('debugMode');
    this.setupToggle('fullscreenOnly');
    this.setupToggle('autoHideControls');
    this.setupToggle('annotationMode');
    this.setupToggle('preventDefault');
    this.setupToggle('showFullscreenPopup');
    this.setupToggle('useCustomPath', () => this.updateCustomPathVisibility());
    this.setupToggle('overrideSiteShortcuts');

    // Cloud storage controls
    this.setupControl('cloudService', 'change', (e) => {
      this.updateSetting('cloudService', e.target.value);
      this.updateCloudStatus();
    });

    // Cloud connect button
    const connectBtn = document.getElementById('connectCloudBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connectToCloud());
    }

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
    } else {
      console.warn(`Element with id '${id}' not found`);
    }
  }

  setupButton(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', handler);
    } else {
      console.warn(`Button with id '${id}' not found`);
    }
  }

  setupToggle(key, callback = null) {
    const element = document.getElementById(key);
    if (element) {
      element.addEventListener('change', (e) => {
        this.updateSetting(key, e.target.checked);
        if (callback) callback();
      });
    } else {
      console.warn(`Toggle with id '${key}' not found`);
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

  // Theme management
  initializeTheme() {
    const savedTheme = this.settings.themePreference || 'auto';
    this.applyTheme(savedTheme);
  }

  applyTheme(theme) {
    const body = document.body;
    const themeSelect = document.getElementById('themePreference');
    
    // Sync dropdown with current theme
    if (themeSelect) {
      themeSelect.value = theme;
    }
    
    let effectiveTheme = theme;
    if (theme === 'auto') {
      effectiveTheme = this.darkThemeMediaQuery.matches ? 'dark' : 'light';
    }
    
    if (effectiveTheme === 'dark') {
      body.setAttribute('data-theme', 'dark');
    } else {
      body.removeAttribute('data-theme');
    }
    
    // Update theme toggle button
    this.updateThemeToggleButton();
  }

  updateThemeToggleButton() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    
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
  async setupCloudService() {
    const service = this.settings.cloudService;
    
    try {
      // Load cloud configuration if available
      if (!window.CLOUD_CONFIG) {
        const configScript = document.createElement('script');
        configScript.src = '../utils/cloudConfig.js';
        document.head.appendChild(configScript);
        await new Promise(resolve => {
          configScript.onload = resolve;
          configScript.onerror = () => resolve();
        });
      }
      
      // Check if cloud service is configured
      if (window.CLOUD_CONFIG) {
        const isConfigured = service === 'google-drive' ? 
          window.CLOUD_CONFIG.isConfigured('google') : 
          window.CLOUD_CONFIG.isConfigured('onedrive');
          
        if (!isConfigured) {
          const message = service === 'google-drive' ? 
            window.CLOUD_CONFIG.getConfigurationMessage('google') :
            window.CLOUD_CONFIG.getConfigurationMessage('onedrive');
          this.showToast(message, 'warning');
          
          // Open setup documentation
          const setupUrl = service === 'google-drive' ? 
            'https://developers.google.com/drive/api/quickstart/js' :
            'https://docs.microsoft.com/en-us/onedrive/developer/';
          chrome.tabs.create({ url: setupUrl });
          return;
        }
      }
      
      switch (service) {
        case 'google-drive':
          await this.setupGoogleDrive();
          break;
        case 'onedrive':
          await this.setupOneDrive();
          break;
        case 'none':
          this.showToast('Cloud storage is disabled. Enable "Auto-Upload to Cloud" to configure.', 'info');
          break;
        default:
          this.showToast('Please select a cloud service first', 'error');
      }
    } catch (error) {
      console.error('Cloud setup failed:', error);
      this.showToast(`Cloud setup failed: ${error.message}`, 'error');
    }
  }

  async setupGoogleDrive() {
    try {
      // Load cloud storage manager if not available
      if (!window.cloudStorageManager) {
        const configScript = document.createElement('script');
        configScript.src = '../utils/cloudConfig.js';
        document.head.appendChild(configScript);
        await new Promise(resolve => configScript.onload = resolve);
        
        const script = document.createElement('script');
        script.src = '../utils/cloudStorage.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      this.showToast('Connecting to Google Drive...', 'info');
      const token = await window.cloudStorageManager.authenticateGoogleDrive();
      
      if (token) {
        this.showToast('Google Drive connected successfully!', 'success');
        this.updateCloudConnectionStatus('google-drive', true);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Google Drive setup failed:', error);
      this.showToast('Google Drive setup failed. Please try again.', 'error');
    }
  }

  async setupOneDrive() {
    try {
      // Load cloud storage manager if not available
      if (!window.cloudStorageManager) {
        const configScript = document.createElement('script');
        configScript.src = '../utils/cloudConfig.js';
        document.head.appendChild(configScript);
        await new Promise(resolve => configScript.onload = resolve);
        
        const script = document.createElement('script');
        script.src = '../utils/cloudStorage.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      this.showToast('Connecting to OneDrive...', 'info');
      const token = await window.cloudStorageManager.authenticateOneDrive();
      
      if (token) {
        this.showToast('OneDrive connected successfully!', 'success');
        this.updateCloudConnectionStatus('onedrive', true);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('OneDrive setup failed:', error);
      this.showToast('OneDrive setup failed. Please try again.', 'error');
    }
  }

  updateCloudConnectionStatus(service, connected) {
    const button = document.getElementById('setupCloudBtn');
    if (button) {
      button.textContent = connected ? 
        `${service === 'google-drive' ? 'Google Drive' : 'OneDrive'} Connected` : 
        'Setup Cloud Service';
      button.disabled = connected;
    }
  }

  extractTokenFromUrl(url) {
    const params = new URLSearchParams(url.split('#')[1]);
    return params.get('access_token');
  }

  showToast(message, type = 'info') {
    // Create or update toast notification
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
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

  // Cloud Storage Methods
  updateCloudServiceVisibility() {
    const cloudServiceContainer = document.getElementById('cloudServiceContainer');
    const cloudStatusContainer = document.getElementById('cloudStatusContainer');
    const isEnabled = this.settings.uploadToCloud;
    
    if (cloudServiceContainer) {
      cloudServiceContainer.style.display = isEnabled ? 'flex' : 'none';
    }
    if (cloudStatusContainer) {
      cloudStatusContainer.style.display = isEnabled ? 'flex' : 'none';
    }
    
    if (isEnabled) {
      this.updateCloudStatus();
    }
  }

  updateCloudStatus() {
    const service = this.settings.cloudService || 'none';
    const statusContainer = document.getElementById('cloudStatus');
    const statusIndicator = statusContainer?.querySelector('.status-indicator');
    const statusText = statusContainer?.querySelector('.status-text');
    const connectBtn = document.getElementById('connectCloudBtn');
    
    if (!statusContainer) return;
    
    // For now, use simple service (Imgur) which doesn't need authentication
    if (service === 'imgur' || service === 'none') {
      if (statusIndicator) statusIndicator.textContent = '✅';
      if (statusText) statusText.textContent = 'Ready to use';
      if (connectBtn) {
        connectBtn.style.display = 'none';
      }
      statusContainer.className = 'cloud-status connected';
    } else {
      if (statusIndicator) statusIndicator.textContent = '❌';
      if (statusText) statusText.textContent = 'Not configured';
      if (connectBtn) {
        connectBtn.style.display = 'inline-block';
        connectBtn.textContent = 'Configure';
      }
      statusContainer.className = 'cloud-status error';
    }
  }

  async connectToCloud() {
    const service = this.settings.cloudService;
    const statusContainer = document.getElementById('cloudStatus');
    const statusIndicator = statusContainer?.querySelector('.status-indicator');
    const statusText = statusContainer?.querySelector('.status-text');
    
    if (!statusContainer) return;
    
    // Update UI to show connecting state
    if (statusIndicator) statusIndicator.textContent = '🔄';
    if (statusText) statusText.textContent = 'Connecting...';
    statusContainer.className = 'cloud-status connecting';
    
    try {
      // For simplified implementation, just show configuration info
      if (service === 'google' || service === 'onedrive') {
        this.showToast('Cloud storage requires manual configuration. Please see the documentation for setup instructions.', 'info');
        
        // Reset status
        if (statusIndicator) statusIndicator.textContent = '❌';
        if (statusText) statusText.textContent = 'Requires configuration';
        statusContainer.className = 'cloud-status error';
      }
    } catch (error) {
      console.error('Cloud connection failed:', error);
      this.showToast('Failed to connect to cloud service', 'error');
      
      if (statusIndicator) statusIndicator.textContent = '❌';
      if (statusText) statusText.textContent = 'Connection failed';
      statusContainer.className = 'cloud-status error';
    }
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