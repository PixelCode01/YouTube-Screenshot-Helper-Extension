// Options page script for YouTube Screenshot Helper
console.log('YouTube Screenshot Helper: Options page loaded');

class OptionsManager {
  constructor() {
    this.settings = {};
    this.isConnecting = false; // Track cloud connection state
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
      cloudService: 'none',
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
      overrideSiteShortcuts: false,
      disablePreviewByDefault: false
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
    this.setupToggle('uploadToCloud', () => {
      this.updateCloudServiceVisibility();
    });
    this.setupToggle('debugMode');
    this.setupToggle('fullscreenOnly');
    this.setupToggle('autoHideControls');
    this.setupToggle('annotationMode');
    this.setupToggle('preventDefault');
    this.setupToggle('showFullscreenPopup');
    this.setupToggle('useCustomPath', () => {
      console.log('💾 OPTIONS: useCustomPath toggled to:', this.settings.useCustomPath);
      this.updateCustomPathVisibility();
    });
    this.setupToggle('overrideSiteShortcuts');
    this.setupToggle('disablePreviewByDefault');

    // Cloud storage controls
    this.setupControl('cloudService', 'change', (e) => {
      this.updateSetting('cloudService', e.target.value);
      this.updateCloudStatus();
    });

    this.setupButton('connectCloudBtn', () => {
      this.connectToCloud();
    });

    // Title builder toggles
    this.setupToggle('includeYoutube', () => this.updateTitlePreview());
    this.setupToggle('includeVideoTitle', () => this.updateTitlePreview());
    this.setupToggle('includeChannelName', () => this.updateTitlePreview());
    this.setupToggle('includePlaylistName', () => this.updateTitlePreview());
    this.setupToggle('includeChapter', () => this.updateTitlePreview());
    this.setupToggle('includeTimestamp', () => this.updateTitlePreview());
    this.setupToggle('includeDate', () => this.updateTitlePreview());
    this.setupToggle('includeTime', () => this.updateTitlePreview());

    // Title separator control
    this.setupControl('titleSeparator', 'input', (e) => {
      this.updateSetting('titleSeparator', e.target.value);
      this.updateTitlePreview();
    });

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
      const inputValue = e.target.value;
      console.log('💾 OPTIONS: customDownloadPath changed to:', JSON.stringify(inputValue));
      
      // Check if user entered an absolute path
      const isAbsolute = inputValue.startsWith('/') || inputValue.match(/^[a-zA-Z]:\\/);
      
      if (isAbsolute && inputValue.length > 0) {
        // Block absolute paths and show warning
        console.warn('❌ Absolute paths not allowed, converting to relative path');
        
        // Extract folder name from absolute path
        const pathParts = inputValue.split(/[/\\]/).filter(part => part.length > 0);
        const folderName = pathParts[pathParts.length - 1] || '';
        
        // Update input field with relative path
        e.target.value = folderName;
        
        // Show warning message
        this.showToast(`Absolute paths are not supported. Using "${folderName}" instead. Files will save to Downloads/${folderName}/`, 'warning');
        
        // Save the corrected relative path
        this.updateSetting('customDownloadPath', folderName);
      } else {
        // Allow relative paths
        this.updateSetting('customDownloadPath', inputValue);
      }
    });

    this.setupControl('cloudService', 'change', (e) => {
      this.updateSetting('cloudService', e.target.value);
      this.updateCloudServiceVisibility();
    });

    // Folder organization controls
    this.setupControl('organizeFolders', 'change', (e) => {
      console.log('💾 OPTIONS: organizeFolders changed to:', e.target.value);
      this.updateSetting('organizeFolders', e.target.value);
      this.updateFolderOrganizationVisibility();
      this.updateFolderPreview();
    });

    this.setupControl('customFolderPattern', 'input', (e) => {
      console.log('💾 OPTIONS: customFolderPattern changed to:', e.target.value);
      this.updateSetting('customFolderPattern', e.target.value);
      this.updateFolderPreview();
    });

    // Pattern builder helpers
    this.setupPatternBuilderEvents();
    
    // Sites management
    this.setupSitesTab();

    // Button event listeners
    this.setupButton('openShortcutsBtn', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    this.setupButton('browsePathBtn', () => {
      this.browsePath();
    });

    this.setupButton('refreshPreview', () => {
      this.updateFolderPreview();
    });

    this.setupButton('connectCloudBtn', () => {
      this.connectToCloud();
    });

    this.setupButton('addSiteBtn', () => {
      this.addSite();
    });

    // Theme toggle button
    this.setupButton('themeToggle', () => {
      this.toggleTheme();
    });

    // Data management buttons
    this.setupButton('exportBtn', () => {
      this.exportSettings();
    });

    this.setupButton('importBtn', () => {
      this.importSettings();
    });

    this.setupButton('resetBtn', () => {
      this.resetToDefaults();
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
    console.log(`💾 OPTIONS: updateSetting called with key="${key}", value=${JSON.stringify(value)}`);
    
    // Special logging for save path related settings
    if (key === 'useCustomPath' || key === 'customDownloadPath') {
      console.log(`🔍 SAVE PATH SETTING UPDATE:`);
      console.log(`  • Key: ${key}`);
      console.log(`  • Value: ${JSON.stringify(value)}`);
      console.log(`  • Value type: ${typeof value}`);
      console.log(`  • Current settings before update:`, this.settings);
    }
    
    this.settings[key] = value;
    
    try {
      await chrome.storage.sync.set({ [key]: value });
      console.log(`✅ Setting updated successfully: ${key} = ${JSON.stringify(value)}`);
      
      // Validate the setting was actually saved
      if (key === 'useCustomPath' || key === 'customDownloadPath') {
        setTimeout(async () => {
          const verification = await chrome.storage.sync.get([key]);
          console.log(`🔍 SAVE PATH VERIFICATION: ${key} saved as:`, verification[key]);
          if (verification[key] !== value) {
            console.error(`❌ SAVE PATH VERIFICATION FAILED: Expected ${JSON.stringify(value)}, got ${JSON.stringify(verification[key])}`);
          } else {
            console.log(`✅ SAVE PATH VERIFICATION PASSED: ${key} correctly saved`);
          }
        }, 100);
      }
      
    } catch (error) {
      console.error(`❌ Failed to save setting ${key}:`, error);
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
    this.updateFolderOrganizationVisibility();
    this.updateFolderPreview();
    this.populateSitesList();
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
    const connectBtn = document.getElementById('connectCloudBtn');
    if (container) {
      container.style.display = this.settings.uploadToCloud ? 'block' : 'none';
    }
    if (connectBtn) {
      connectBtn.style.display = this.settings.uploadToCloud ? 'inline-block' : 'none';
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
      // Show manual input prompt with guidance
      const currentPath = this.settings.customDownloadPath || '';
      const message = `Enter a relative folder path (within Downloads folder):\n\nExamples:\n• Screenshots\n• YouTube/Captures\n• Media/2025\n\nFiles will be saved to Downloads/[your-path]/`;
      
      const path = prompt(message, currentPath);
      if (path !== null) {
        // Check if user entered an absolute path
        const isAbsolute = path.startsWith('/') || path.match(/^[a-zA-Z]:\\/);
        
        let finalPath = path;
        if (isAbsolute && path.length > 0) {
          // Extract folder name from absolute path
          const pathParts = path.split(/[/\\]/).filter(part => part.length > 0);
          finalPath = pathParts[pathParts.length - 1] || '';
          
          this.showToast(`Converted absolute path to relative: "${finalPath}". Files will save to Downloads/${finalPath}/`, 'warning');
        }
        
        const pathInput = document.getElementById('customDownloadPath');
        if (pathInput) {
          pathInput.value = finalPath;
          this.updateSetting('customDownloadPath', finalPath);
        }
      }
    } catch (error) {
      console.error('Error browsing path:', error);
      this.showToast('Error selecting path. Please enter path manually.', 'error');
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
          false; // Only support Google Drive now
          
        if (!isConfigured && service === 'google-drive') {
          const message = window.CLOUD_CONFIG.getConfigurationMessage('google');
          this.showToast(message, 'warning');
          
          // Open setup documentation
          const setupUrl = 'https://developers.google.com/drive/api/quickstart/js';
          chrome.tabs.create({ url: setupUrl });
          return;
        }
      }
      
      switch (service) {
        case 'google-drive':
          await this.setupGoogleDrive();
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

  updateCloudConnectionStatus(service, connected) {
    const button = document.getElementById('setupCloudBtn');
    if (button) {
      button.textContent = connected ? 
        'Google Drive Connected' : 
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

  // Folder Organization Methods
  setupPatternBuilderEvents() {
    // Variable buttons - insert variable into custom pattern input
    document.querySelectorAll('.variable-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variable = btn.dataset.variable;
        const patternInput = document.getElementById('customFolderPattern');
        if (patternInput && variable) {
          const currentValue = patternInput.value || '';
          const cursorPos = patternInput.selectionStart || currentValue.length;
          const newValue = currentValue.slice(0, cursorPos) + variable + currentValue.slice(cursorPos);
          patternInput.value = newValue;
          patternInput.focus();
          // Move cursor after inserted variable
          patternInput.setSelectionRange(cursorPos + variable.length, cursorPos + variable.length);
          // Trigger input event to update preview
          patternInput.dispatchEvent(new Event('input'));
        }
      });
    });

    // Preset buttons - set entire pattern
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const pattern = btn.dataset.pattern;
        const patternInput = document.getElementById('customFolderPattern');
        if (patternInput && pattern) {
          patternInput.value = pattern;
          patternInput.focus();
          // Trigger input event to update preview
          patternInput.dispatchEvent(new Event('input'));
        }
      });
    });
  }

  updateFolderOrganizationVisibility() {
    const customPatternContainer = document.getElementById('customFolderPatternContainer');
    const folderPreview = document.getElementById('folderPreview');
    const organizeFolders = this.settings.organizeFolders || 'none';
    
    // Show/hide custom pattern input
    if (customPatternContainer) {
      customPatternContainer.style.display = organizeFolders === 'custom' ? 'block' : 'none';
    }
    
    // Show/hide folder preview based on organization setting
    if (folderPreview) {
      folderPreview.style.display = organizeFolders !== 'none' ? 'block' : 'none';
    }
  }

  updateFolderPreview() {
    const previewPath = document.getElementById('folderPreviewPath');
    if (!previewPath) return;

    const organizeFolders = this.settings.organizeFolders || 'none';
    
    // Mock metadata for preview
    const mockData = {
      channel: 'TechChannel',
      playlist: 'Tutorial Series',
      title: 'Amazing Video Tutorial',
      date: new Date().toISOString().split('T')[0], // Current date YYYY-MM-DD
      time: new Date().toTimeString().slice(0, 5).replace(':', '-'), // Current time HH-MM
      site: 'YouTube'
    };

    let folderPath = '';
    
    switch (organizeFolders) {
      case 'none':
        folderPath = '';
        break;
      case 'channel':
        folderPath = mockData.channel;
        break;
      case 'playlist':
        folderPath = mockData.playlist;
        break;
      case 'video':
        folderPath = mockData.title;
        break;
      case 'date':
        folderPath = mockData.date;
        break;
      case 'channel-date':
        folderPath = `${mockData.channel}/${mockData.date}`;
        break;
      case 'channel-video':
        folderPath = `${mockData.channel}/${mockData.title}`;
        break;
      case 'date-channel':
        folderPath = `${mockData.date}/${mockData.channel}`;
        break;
      case 'channel-playlist':
        folderPath = `${mockData.channel}/${mockData.playlist}`;
        break;
      case 'custom':
        const customPattern = this.settings.customFolderPattern || '{channel}/{date}';
        folderPath = this.applyTemplate(customPattern, mockData);
        break;
      default:
        folderPath = '';
    }

    // Clean and construct preview path
    if (folderPath) {
      // Clean folder path for display
      folderPath = folderPath
        .replace(/[<>:"|?*\\]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
      previewPath.textContent = `Downloads/${folderPath}/screenshot.png`;
    } else {
      previewPath.textContent = 'Downloads/screenshot.png';
    }
  }

  // Template helper method for custom patterns
  applyTemplate(template, data) {
    if (!template) return '';
    
    return template
      .replace(/\{channel\}/g, data.channel || 'Unknown Channel')
      .replace(/\{playlist\}/g, data.playlist || 'Playlist')
      .replace(/\{title\}/g, data.title || 'Video Title')
      .replace(/\{date\}/g, data.date || new Date().toISOString().split('T')[0])
      .replace(/\{time\}/g, data.time || new Date().toTimeString().slice(0, 5).replace(':', '-'))
      .replace(/\{site\}/g, data.site || 'Website');
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
    
    // Only 'none' doesn't need authentication now
    if (service === 'none') {
      if (statusIndicator) statusIndicator.textContent = '✅';
      if (statusText) statusText.textContent = 'Disabled';
      if (connectBtn) {
        connectBtn.style.display = 'none';
      }
      statusContainer.className = 'cloud-status connected';
    } else if (service === 'google-drive') {
      if (statusIndicator) statusIndicator.textContent = '❌';
      if (statusText) statusText.textContent = 'Not configured';
      if (connectBtn) {
        connectBtn.style.display = 'inline-block';
        connectBtn.textContent = 'Configure Google Drive';
      }
      statusContainer.className = 'cloud-status error';
    } else {
      if (statusIndicator) statusIndicator.textContent = '❌';
      if (statusText) statusText.textContent = 'Unknown service';
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
    
    console.log(`🔄 Connecting to cloud service: ${service}`);
    
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      this.showToast('Connection already in progress, please wait...', 'warning');
      return;
    }
    
    this.isConnecting = true;
    
    try {
      // Update UI to show connecting state
      if (statusIndicator) statusIndicator.textContent = '🔄';
      if (statusText) statusText.textContent = 'Connecting...';
      statusContainer.className = 'cloud-status connecting';
      
      // Load required scripts
      await this.ensureCloudScriptsLoaded();
      
      // Check configuration first
      if (!this.validateCloudConfiguration(service)) {
        if (service === 'google-drive') {
          const configUrl = 'https://developers.google.com/drive/api/quickstart/js';
          this.showToast(`${service} client ID not configured. Opening setup instructions...`, 'warning');
          chrome.tabs.create({ url: configUrl });
        }
        
        if (statusIndicator) statusIndicator.textContent = '⚠️';
        if (statusText) statusText.textContent = 'Requires configuration';
        statusContainer.className = 'cloud-status warning';
        return;
      }
      
      // Authenticate with timeout
      this.showToast(`Connecting to ${service}...`, 'info');
      const token = await this.authenticateWithTimeout(service, 30000);
      
      if (token) {
        console.log(`✅ ${service} connected successfully`);
        if (statusIndicator) statusIndicator.textContent = '✅';
        if (statusText) statusText.textContent = 'Connected';
        statusContainer.className = 'cloud-status connected';
        this.showToast(`${service} connected successfully!`, 'success');
        
        // Update connection status
        this.updateCloudConnectionStatus(service, true);
      } else {
        throw new Error('Authentication failed - no token received');
      }
      
    } catch (error) {
      console.error(`❌ ${service} connection failed:`, error);
      
      // Handle specific error types
      let errorMessage = error.message;
      if (error.message.includes('timeout')) {
        errorMessage = 'Connection timed out. Please try again.';
      } else if (error.message.includes('User cancelled')) {
        errorMessage = 'Authentication was cancelled.';
      } else if (error.message.includes('client ID')) {
        errorMessage = 'Service not configured. Please check setup instructions.';
      }
      
      if (statusIndicator) statusIndicator.textContent = '❌';
      if (statusText) statusText.textContent = 'Connection failed';
      statusContainer.className = 'cloud-status error';
      this.showToast(`${service} connection failed: ${errorMessage}`, 'error');
      
    } finally {
      this.isConnecting = false;
    }
  }
  
  async ensureCloudScriptsLoaded() {
    // Load cloud config if not available
    if (!window.CLOUD_CONFIG) {
      await this.loadScript('../utils/cloudConfig.js');
    }
    
    // Load cloud storage manager if not available  
    if (!window.cloudStorageManager) {
      await this.loadScript('../utils/cloudStorage.js');
    }
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }
  
  validateCloudConfiguration(service) {
    if (!window.CLOUD_CONFIG) {
      console.error('Cloud config not loaded');
      return false;
    }
    
    const isConfigured = service === 'google-drive' ? 
      window.CLOUD_CONFIG.isConfigured('google') : 
      false; // Only Google Drive is supported now
      
    console.log(`Configuration check for ${service}: ${isConfigured}`);
    return isConfigured;
  }
  
  async authenticateWithTimeout(service, timeoutMs = 30000) {
    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        console.error(`Authentication timeout for ${service}`);
        reject(new Error(`Authentication timed out after ${timeoutMs/1000} seconds`));
      }, timeoutMs);
      
      try {
        let token;
        if (service === 'google-drive') {
          token = await window.cloudStorageManager.authenticateGoogleDrive();
        } else {
          throw new Error(`Unsupported service: ${service}`);
        }
        
        clearTimeout(timeoutId);
        resolve(token);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // Sites Management Methods
  setupSitesTab() {
    // Add site button handler already set up in setupEventListeners
    
    // Remove site functionality
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-site-btn')) {
        const site = e.target.dataset.site;
        this.removeSite(site);
      }
    });
  }

  populateSitesList() {
    const sitesList = document.getElementById('sitesList');
    if (!sitesList) return;

    const enabledSites = this.settings.enabledSites || ['youtube.com', 'vimeo.com', 'twitch.tv'];
    const defaultSites = ['youtube.com', 'vimeo.com', 'twitch.tv'];

    sitesList.innerHTML = '';

    enabledSites.forEach(site => {
      const siteItem = document.createElement('div');
      siteItem.className = 'site-item';
      
      const isDefault = defaultSites.includes(site);
      if (isDefault) {
        siteItem.classList.add('default');
      }

      siteItem.innerHTML = `
        <span class="site-name">${site}</span>
        <div class="site-controls">
          <span class="site-status">${isDefault ? 'Built-in support' : 'Custom site'}</span>
          ${!isDefault ? `<button class="btn btn-danger btn-sm remove-site-btn" data-site="${site}" title="Remove site">Remove</button>` : ''}
        </div>
      `;

      sitesList.appendChild(siteItem);
    });
  }

  addSite() {
    const newSiteInput = document.getElementById('newSiteInput');
    if (!newSiteInput) return;

    const newSite = newSiteInput.value.trim().toLowerCase();
    
    if (!newSite) {
      this.showToast('Please enter a valid domain', 'error');
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(newSite)) {
      this.showToast('Please enter a valid domain format (e.g., example.com)', 'error');
      return;
    }

    const currentSites = this.settings.enabledSites || [];
    
    if (currentSites.includes(newSite)) {
      this.showToast('Site already exists in the list', 'warning');
      return;
    }

    // Add the new site
    const updatedSites = [...currentSites, newSite];
    this.updateSetting('enabledSites', updatedSites);
    
    // Clear input and refresh list
    newSiteInput.value = '';
    this.populateSitesList();
    
    this.showToast(`Added ${newSite} to enabled sites`, 'success');
  }

  removeSite(site) {
    const currentSites = this.settings.enabledSites || [];
    const defaultSites = ['youtube.com', 'vimeo.com', 'twitch.tv'];
    
    // Don't allow removing default sites
    if (defaultSites.includes(site)) {
      this.showToast('Cannot remove built-in sites', 'error');
      return;
    }

    const updatedSites = currentSites.filter(s => s !== site);
    this.updateSetting('enabledSites', updatedSites);
    
    this.populateSitesList();
    this.showToast(`Removed ${site} from enabled sites`, 'success');
  }

  // Data Management Methods
  exportSettings() {
    try {
      // Create a settings object with current settings
      const settingsToExport = { ...this.settings };
      
      // Add metadata
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: settingsToExport
      };
      
      // Create and download the file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `youtube-screenshot-helper-settings-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(link.href);
      
      this.showToast('Settings exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showToast('Failed to export settings', 'error');
    }
  }

  importSettings() {
    const fileInput = document.getElementById('importFile');
    if (!fileInput) {
      this.showToast('Import file input not found', 'error');
      return;
    }
    
    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          // Validate the import data structure
          if (!importData.settings) {
            this.showToast('Invalid settings file format', 'error');
            return;
          }
          
          // Merge imported settings with defaults to ensure all required keys exist
          const importedSettings = { ...this.defaults, ...importData.settings };
          
          // Update each setting
          Object.keys(importedSettings).forEach(key => {
            this.settings[key] = importedSettings[key];
          });
          
          // Save all settings to storage
          chrome.storage.sync.set(this.settings).then(() => {
            // Update UI to reflect imported settings
            this.updateUI();
            this.updateTitlePreview();
            this.showToast('Settings imported successfully', 'success');
          }).catch(error => {
            console.error('Failed to save imported settings:', error);
            this.showToast('Failed to save imported settings', 'error');
          });
          
        } catch (error) {
          console.error('Failed to parse settings file:', error);
          this.showToast('Invalid settings file', 'error');
        }
      };
      
      reader.readAsText(file);
      
      // Reset file input
      fileInput.value = '';
    };
    
    // Trigger file dialog
    fileInput.click();
  }

  resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      try {
        // Reset settings to defaults
        this.settings = { ...this.defaults };
        
        // Clear storage and set defaults
        chrome.storage.sync.clear().then(() => {
          return chrome.storage.sync.set(this.settings);
        }).then(() => {
          // Update UI to reflect reset settings
          this.updateUI();
          this.updateTitlePreview();
          this.showToast('Settings reset to defaults successfully', 'success');
        }).catch(error => {
          console.error('Failed to reset settings:', error);
          this.showToast('Failed to reset settings', 'error');
        });
        
      } catch (error) {
        console.error('Failed to reset settings:', error);
        this.showToast('Failed to reset settings', 'error');
      }
    }
  }

  // Cloud history functions removed - only Google Drive supported now
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