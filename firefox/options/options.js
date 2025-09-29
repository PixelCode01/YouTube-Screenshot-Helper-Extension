

console.log('YouTube Screenshot Helper: Options page loaded');

class OptionsManager {
  constructor() {
    this.settings = {};
  this.isConnecting = false;
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
  cloudFolderSelections: {},
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
      silentDownloads: false,
      overrideSiteShortcuts: false,
      disablePreviewByDefault: false
    };
    this.darkThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }

  async init() {
    console.log('[Options] Starting initialization sequence');
    await this.loadSettings();
    console.log('[Options] Settings ready with keys:', Object.keys(this.settings));
    this.setupEventListeners();
    console.log('[Options] Event listeners bound');
    this.updateUI();
    console.log('[Options] UI synchronized with settings');
    this.initializeTheme();
    this.updateTitlePreview();
    this.disableFolderOrganizationForEdge();
    console.log('[Options] Core UI setup complete');

    if (this.settings.uploadToCloud) {
      console.log('[Options] Attempting auto-connect for cloud service:', this.settings.cloudService);
      this.tryAutoConnectToCloud(this.settings.cloudService);
    }
    console.log('[Options] Initialization sequence finished');
  }

  disableFolderOrganizationForEdge() {
    console.log('[Options] Disabling folder organization (Edge limitation guard)');

    const organizeFoldersSelect = document.getElementById('organizeFolders');
    const customFolderPatternContainer = document.getElementById('customFolderPatternContainer');
    const folderPreview = document.getElementById('folderPreview');
    
    if (organizeFoldersSelect) {
      organizeFoldersSelect.disabled = true;
      organizeFoldersSelect.value = 'none';
      organizeFoldersSelect.title = 'Folder organization is not supported in Microsoft Edge';
    }
    
    if (customFolderPatternContainer) {
      customFolderPatternContainer.style.display = 'none';
    }
    
    if (folderPreview) {
      folderPreview.style.display = 'none';
    }
    

    this.updateSetting('organizeFolders', 'none');
  }

  async loadSettings() {
    try {
      const result = await browser.storage.sync.get(null);
      this.settings = { ...this.defaults, ...result };
      console.log('[Options] Loaded settings from storage:', {
        storedKeys: Object.keys(result),
        enabledSitesCount: Array.isArray(this.settings.enabledSites) ? this.settings.enabledSites.length : 0,
        uploadToCloud: this.settings.uploadToCloud
      });
      if (!this.settings.cloudFolderSelections || typeof this.settings.cloudFolderSelections !== 'object') {
        this.settings.cloudFolderSelections = {};
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...this.defaults };
      console.log('[Options] Falling back to defaults after load failure');
    }
  }

  setupEventListeners() {

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


    this.setupToggle('uploadToCloud', () => {
      const serviceKey = this.settings.uploadToCloud
        ? this.ensureDefaultCloudService()
        : 'none';

      this.updateCloudServiceVisibility();

      if (this.settings.uploadToCloud) {
        this.tryAutoConnectToCloud(serviceKey);
      }
    });
    this.setupToggle('debugMode');
    this.setupToggle('fullscreenOnly');
    this.setupToggle('autoHideControls');
    this.setupToggle('annotationMode');
    this.setupToggle('preventDefault');
    this.setupToggle('showFullscreenPopup');
    this.setupToggle('useCustomPath', () => {
      console.log('OPTIONS: useCustomPath toggled to:', this.settings.useCustomPath);
      this.updateCustomPathVisibility();
    });
    this.setupToggle('silentDownloads');
    this.setupToggle('overrideSiteShortcuts');
    this.setupToggle('disablePreviewByDefault');


    this.setupControl('cloudService', 'change', (e) => {
      this.updateSetting('cloudService', e.target.value);
      this.updateCloudStatus();
    });

    this.setupButton('connectCloudBtn', () => {
      this.connectToCloud();
    });

    this.setupButton('chooseCloudFolderBtn', () => {
      this.chooseCloudFolder();
    });

    this.setupButton('disconnectCloudBtn', () => {
      this.disconnectCloud();
    });


    this.setupToggle('includeYoutube', () => this.updateTitlePreview());
    this.setupToggle('includeVideoTitle', () => this.updateTitlePreview());
    this.setupToggle('includeChannelName', () => this.updateTitlePreview());
    this.setupToggle('includePlaylistName', () => this.updateTitlePreview());
    this.setupToggle('includeChapter', () => this.updateTitlePreview());
    this.setupToggle('includeTimestamp', () => this.updateTitlePreview());
    this.setupToggle('includeDate', () => this.updateTitlePreview());
    this.setupToggle('includeTime', () => this.updateTitlePreview());


    this.setupControl('titleSeparator', 'input', (e) => {
      this.updateSetting('titleSeparator', e.target.value);
      this.updateTitlePreview();
    });


    this.setupControl('filenameTemplate', 'input', (e) => {
      this.updateSetting('filenameTemplate', e.target.value);
      this.updateTitlePreview();
    });


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
  console.log('OPTIONS: customDownloadPath changed to:', JSON.stringify(inputValue));
      

      const isAbsolute = inputValue.startsWith('/') || inputValue.match(/^[a-zA-Z]:\\/);
      
      if (isAbsolute && inputValue.length > 0) {

  console.warn('Absolute paths not allowed, converting to relative path');
        

        const pathParts = inputValue.split(/[/\\]/).filter(part => part.length > 0);
        const folderName = pathParts[pathParts.length - 1] || '';
        

        e.target.value = folderName;
        

        this.showToast(`Absolute paths are not supported. Using "${folderName}" instead. Files will save to Downloads/${folderName}/`, 'warning');
        

        this.updateSetting('customDownloadPath', folderName);
      } else {

        this.updateSetting('customDownloadPath', inputValue);
      }
    });

    this.setupControl('cloudService', 'change', (e) => {
      this.updateSetting('cloudService', e.target.value);
      this.updateCloudServiceVisibility();
    });


    this.setupControl('organizeFolders', 'change', (e) => {
      console.log('OPTIONS: organizeFolders changed to:', e.target.value);
      this.updateSetting('organizeFolders', e.target.value);
      this.updateFolderOrganizationVisibility();
      this.updateFolderPreview();
    });

    this.setupControl('customFolderPattern', 'input', (e) => {
      console.log('OPTIONS: customFolderPattern changed to:', e.target.value);
      this.updateSetting('customFolderPattern', e.target.value);
      this.updateFolderPreview();
    });


    this.setupPatternBuilderEvents();
    

    this.setupSitesTab();


    this.setupButton('openShortcutsBtn', () => {
      browser.tabs.create({ url: 'edge://extensions/shortcuts' });
    });

    this.setupButton('browsePathBtn', () => {
      this.browsePath();
    });

    this.setupButton('refreshPreview', () => {
      this.updateFolderPreview();
    });

    this.setupButton('addSiteBtn', () => {
      this.addSite();
    });


    this.setupButton('resetTitleTemplateBtn', () => {
      this.resetTitleTemplate();
    });


    this.setupButton('copyTitlePreviewBtn', () => {
      this.copyTitlePreview();
    });


    this.setupButton('themeToggle', () => {
      this.toggleTheme();
    });


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

    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });


    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });


    const targetTab = document.getElementById(tabName);
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
  }

  async updateSetting(key, value) {
  console.log(`OPTIONS: updateSetting called with key="${key}", value=${JSON.stringify(value)}`);
    

    if (key === 'useCustomPath' || key === 'customDownloadPath') {
  console.log('Save path setting update:');
  console.log(`  - Key: ${key}`);
  console.log(`  - Value: ${JSON.stringify(value)}`);
  console.log(`  - Value type: ${typeof value}`);
  console.log('  - Current settings before update:', this.settings);
    }
    
    this.settings[key] = value;
    
    try {
      await browser.storage.sync.set({ [key]: value });
  console.log(`Setting updated successfully: ${key} = ${JSON.stringify(value)}`);
      

      if (key === 'useCustomPath' || key === 'customDownloadPath') {
        setTimeout(async () => {
          const verification = await browser.storage.sync.get([key]);
          console.log(`Save path verification: ${key} saved as:`, verification[key]);
          if (verification[key] !== value) {
            console.error(`Save path verification failed: expected ${JSON.stringify(value)}, received ${JSON.stringify(verification[key])}`);
          } else {
            console.log(`Save path verification passed: ${key} correctly saved`);
          }
        }, 100);
      }
      
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  }

  updateUI() {

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

    console.log('[Options] Applied settings to DOM elements');


    this.updateCustomPathVisibility();
    this.updateCloudServiceVisibility();
    this.updateFolderOrganizationVisibility();
    this.updateFolderPreview();
    this.populateSitesList();
    console.log('[Options] Ancillary UI components refreshed');
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


  initializeTheme() {
    const savedTheme = this.settings.themePreference || 'auto';
    this.applyTheme(savedTheme);
  }

  applyTheme(theme) {
    const body = document.body;
    const themeSelect = document.getElementById('themePreference');
    

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
    

    this.updateThemeToggleButton();
  }

  updateThemeToggleButton() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    

    if (isDark) {
      themeToggle.textContent = 'Light Mode';
      themeToggle.title = 'Switch to Light Mode';
    } else {
      themeToggle.textContent = 'Dark Mode';
      themeToggle.title = 'Switch to Dark Mode';
    }
  }

  toggleTheme() {
    const currentTheme = this.settings.themePreference || 'auto';
    let nextTheme;
    

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


  async browsePath() {
    try {

      const currentPath = this.settings.customDownloadPath || '';
  const message = `Enter a relative folder path (within Downloads folder):\n\nExamples:\n- Screenshots\n- YouTube/Captures\n- Media/2025\n\nFiles will be saved to Downloads/[your-path]/`;
      
      const path = prompt(message, currentPath);
      if (path !== null) {

        const isAbsolute = path.startsWith('/') || path.match(/^[a-zA-Z]:\\/);
        
        let finalPath = path;
        if (isAbsolute && path.length > 0) {

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
  showToast(message, type = 'info') {

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

    const customTemplate = (this.settings.filenameTemplate || '').trim();
    if (customTemplate) {
      const sampleValues = {
        site: 'YouTube',
        title: 'Amazing Video',
        channel: 'TechChannel',
        playlist: 'Tutorial Series',
        chapter: 'Chapter 1',
        timestamp: '12m34s',
        date: '2024-06-20',
        time: '14-30'
      };

      let resolved = customTemplate;
      Object.entries(sampleValues).forEach(([token, value]) => {
        const regex = new RegExp(`\\{${token}\\}`, 'gi');
        resolved = resolved.replace(regex, value);
      });

      const finalPreview = resolved.trim() || 'youtube-screenshot';
      previewElement.textContent = finalPreview + '.png';
      return;
    }

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


  async resetTitleTemplate() {
    const templateKeys = [
      'includeYoutube',
      'includeVideoTitle',
      'includeChannelName',
      'includePlaylistName',
      'includeChapter',
      'includeTimestamp',
      'includeDate',
      'includeTime',
      'titleSeparator',
      'filenameTemplate'
    ];

    const updates = {};

    templateKeys.forEach((key) => {
      const defaultValue = this.defaults[key];
      updates[key] = defaultValue;
      this.settings[key] = defaultValue;

      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = Boolean(defaultValue);
        } else {
          element.value = defaultValue ?? '';
        }
      }
    });

    try {
      await browser.storage.sync.set(updates);
      this.updateTitlePreview();
      this.showToast('Screenshot title template reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset title template:', error);
      this.showToast('Failed to reset title template', 'error');
    }
  }


  async copyTitlePreview() {
    const previewElement = document.getElementById('titlePreview');
    if (!previewElement) {
      this.showToast('Preview element not found', 'error');
      return;
    }

    const previewText = (previewElement.textContent || '').trim();
    if (!previewText) {
      this.showToast('Nothing to copy yet', 'warning');
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(previewText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = previewText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      this.showToast('Preview copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy preview:', error);
      this.showToast('Failed to copy preview to clipboard', 'error');
    }
  }


  setupPatternBuilderEvents() {

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

          patternInput.setSelectionRange(cursorPos + variable.length, cursorPos + variable.length);

          patternInput.dispatchEvent(new Event('input'));
        }
      });
    });


    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const pattern = btn.dataset.pattern;
        const patternInput = document.getElementById('customFolderPattern');
        if (patternInput && pattern) {
          patternInput.value = pattern;
          patternInput.focus();

          patternInput.dispatchEvent(new Event('input'));
        }
      });
    });
  }

  updateFolderOrganizationVisibility() {
    const customPatternContainer = document.getElementById('customFolderPatternContainer');
    const folderPreview = document.getElementById('folderPreview');
    const organizeFolders = this.settings.organizeFolders || 'none';
    

    if (customPatternContainer) {
      customPatternContainer.style.display = organizeFolders === 'custom' ? 'block' : 'none';
    }
    

    if (folderPreview) {
      folderPreview.style.display = organizeFolders !== 'none' ? 'block' : 'none';
    }
  }

  updateFolderPreview() {
    const previewPath = document.getElementById('folderPreviewPath');
    if (!previewPath) return;

    const organizeFolders = this.settings.organizeFolders || 'none';
    

    const mockData = {
      channel: 'TechChannel',
      playlist: 'Tutorial Series',
      title: 'Amazing Video Tutorial',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5).replace(':', '-'),
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


    if (folderPath) {

      folderPath = folderPath
        .replace(/[<>:"|?*\\]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
      previewPath.textContent = `Downloads/${folderPath}/screenshot.png`;
    } else {
      previewPath.textContent = 'Downloads/screenshot.png';
    }
  }


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

  normalizeCloudServiceKey(service) {
    switch (service) {
      case 'google-drive':
      case 'gdrive':
        return 'google-drive';
      case 'one-drive':
      case 'onedrive':
      case 'ms-onedrive':
        return 'one-drive';
      default:
        return service || 'none';
    }
  }

  getCloudProviderName(service) {
    const key = this.normalizeCloudServiceKey(service);
    switch (key) {
      case 'google-drive':
        return 'Google Drive';
      case 'one-drive':
        return 'Microsoft OneDrive';
      default:
        return 'Cloud Storage';
    }
  }

  getCloudRootLabel(service) {
    const key = this.normalizeCloudServiceKey(service);
    switch (key) {
      case 'google-drive':
        return 'My Drive';
      case 'one-drive':
        return 'OneDrive';
      default:
        return 'Root';
    }
  }

  getCloudFolderSelections() {
    if (!this.settings.cloudFolderSelections || typeof this.settings.cloudFolderSelections !== 'object') {
      this.settings.cloudFolderSelections = {};
    }
    return this.settings.cloudFolderSelections;
  }

  ensureDefaultCloudService() {
    const current = this.normalizeCloudServiceKey(this.settings.cloudService);

    if (!this.settings.uploadToCloud) {
      return current;
    }

    if (!current || current === 'none') {
      const defaultService = 'google-drive';
      this.settings.cloudService = defaultService;

      const select = document.getElementById('cloudService');
      if (select) {
        select.value = defaultService;
      }

      browser.storage.sync.set({ cloudService: defaultService }).catch(error => {
        console.error('Failed to persist default cloud service:', error);
      });

      return defaultService;
    }

    return current;
  }

  async persistCloudFolderSelection(serviceKey, selection) {
    const selections = { ...this.getCloudFolderSelections() };

    if (selection) {
      selections[serviceKey] = selection;
    } else {
      delete selections[serviceKey];
    }

    this.settings.cloudFolderSelections = selections;
    await browser.storage.sync.set({ cloudFolderSelections: selections });
    return selection || null;
  }

  async ensureDefaultFolderSelection(serviceKey, { interactive = false } = {}) {
    const key = this.normalizeCloudServiceKey(serviceKey);
    if (!key || key === 'none') {
      return null;
    }

    await this.ensureCloudScriptsLoaded();

    if (!window.cloudStorageManager?.ensureDefaultFolder) {
      return null;
    }

    try {
      const selection = await window.cloudStorageManager.ensureDefaultFolder(key, { interactive });
      if (selection?.id) {
        await this.persistCloudFolderSelection(key, selection);
      }
      return selection || null;
    } catch (error) {
      console.warn('Failed to ensure default folder selection:', error);
      return null;
    }
  }

  async tryAutoConnectToCloud(serviceKey = null) {
    if (!this.settings.uploadToCloud || this.isConnecting) {
      return;
    }

    const key = this.normalizeCloudServiceKey(serviceKey || this.settings.cloudService);
    if (!key || key === 'none') {
      return;
    }

    await this.ensureCloudScriptsLoaded();

    if (!this.validateCloudConfiguration(key)) {
      return;
    }

    if (window.cloudStorageManager?.isAuthenticated(key)) {
      await this.ensureDefaultFolderSelection(key, { interactive: false });
      this.updateCloudStatus();
      return;
    }

    this.connectToCloud();
  }


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
      const defaultService = this.ensureDefaultCloudService();
      const select = document.getElementById('cloudService');
      if (select && this.normalizeCloudServiceKey(select.value) !== defaultService) {
        select.value = defaultService;
      }
    }

    this.updateCloudStatus();
  }

  async updateCloudStatus() {
    const serviceKey = this.normalizeCloudServiceKey(this.settings.cloudService);
    const statusContainer = document.getElementById('cloudStatus');
    if (!statusContainer) return;

    const statusIndicator = statusContainer.querySelector('.status-indicator');
    const statusText = statusContainer.querySelector('.status-text');
    const connectBtn = document.getElementById('connectCloudBtn');
    const chooseBtn = document.getElementById('chooseCloudFolderBtn');
    const disconnectBtn = document.getElementById('disconnectCloudBtn');

    if (!this.settings.uploadToCloud || serviceKey === 'none') {
  if (statusIndicator) statusIndicator.textContent = 'info';
      if (statusText) statusText.textContent = 'Cloud upload disabled';
      statusContainer.className = 'cloud-status';
      if (connectBtn) connectBtn.style.display = 'none';
      if (chooseBtn) chooseBtn.style.display = 'none';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
      this.updateCloudFolderSummary();
      return;
    }

    await this.ensureCloudScriptsLoaded();
    const providerName = this.getCloudProviderName(serviceKey);

    if (!this.validateCloudConfiguration(serviceKey)) {
  if (statusIndicator) statusIndicator.textContent = 'warn';
      if (statusText) statusText.textContent = `${providerName} needs configuration`;
      statusContainer.className = 'cloud-status warning';
      if (connectBtn) {
        connectBtn.style.display = 'inline-flex';
        connectBtn.textContent = `Configure ${providerName}`;
        connectBtn.disabled = false;
      }
      if (chooseBtn) chooseBtn.style.display = 'none';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
      this.updateCloudFolderSummary();
      return;
    }

    const isConnected = window.cloudStorageManager?.isAuthenticated(serviceKey);

    if (isConnected) {
      await this.ensureDefaultFolderSelection(serviceKey, { interactive: false });

  if (statusIndicator) statusIndicator.textContent = 'ok';
      if (statusText) statusText.textContent = `${providerName} connected`;
      statusContainer.className = 'cloud-status connected';
      if (connectBtn) {
        connectBtn.style.display = 'inline-flex';
        connectBtn.textContent = `Reconnect ${providerName}`;
        connectBtn.disabled = false;
      }
      if (chooseBtn) {
        chooseBtn.style.display = 'inline-flex';
        chooseBtn.disabled = false;
      }
      if (disconnectBtn) {
        disconnectBtn.style.display = 'inline-flex';
        disconnectBtn.disabled = false;
      }
      this.updateCloudFolderSummary();
    } else {
  if (statusIndicator) statusIndicator.textContent = 'error';
      if (statusText) statusText.textContent = `${providerName} not connected`;
      statusContainer.className = 'cloud-status error';
      if (connectBtn) {
        connectBtn.style.display = 'inline-flex';
        connectBtn.textContent = `Sign in to ${providerName}`;
        connectBtn.disabled = false;
      }
      if (chooseBtn) {
        chooseBtn.style.display = 'inline-flex';
        chooseBtn.disabled = true;
      }
      if (disconnectBtn) {
        disconnectBtn.style.display = 'none';
      }
      this.updateCloudFolderSummary();
    }
  }

  updateCloudFolderSummary() {
    const summary = document.getElementById('cloudFolderSummary');
    const summaryValue = document.getElementById('cloudFolderSummaryValue');
    if (!summary || !summaryValue) return;

    const serviceKey = this.normalizeCloudServiceKey(this.settings.cloudService);
    if (!this.settings.uploadToCloud || serviceKey === 'none') {
      summary.style.display = 'none';
      return;
    }

    const isConnected = window.cloudStorageManager?.isAuthenticated?.(serviceKey);
    if (!isConnected) {
      summary.style.display = 'none';
      return;
    }

    const selections = this.getCloudFolderSelections();
    const selection = selections[serviceKey];
    const rootLabel = this.getCloudRootLabel(serviceKey);

    if (selection && (selection.path || selection.name)) {
      summaryValue.textContent = selection.path || selection.name;
    } else {
      summaryValue.textContent = `${rootLabel} (root)`;
    }

    summary.style.display = 'block';
  }

  async connectToCloud() {
    const serviceKey = this.normalizeCloudServiceKey(this.settings.cloudService);
    const providerName = this.getCloudProviderName(serviceKey);
    const statusContainer = document.getElementById('cloudStatus');
    const statusIndicator = statusContainer?.querySelector('.status-indicator');
    const statusText = statusContainer?.querySelector('.status-text');

    if (!this.settings.uploadToCloud || serviceKey === 'none') {
      this.showToast('Enable cloud upload and pick a service first.', 'warning');
      return;
    }

    if (!statusContainer) {
      return;
    }

    if (this.isConnecting) {
      this.showToast('Connection already in progress, please wait...', 'warning');
      return;
    }

    this.isConnecting = true;

    try {
      await this.ensureCloudScriptsLoaded();

      if (!this.validateCloudConfiguration(serviceKey)) {
        const docsUrl = serviceKey === 'google-drive'
          ? 'https://developers.google.com/drive/api/quickstart/js'
          : 'https://learn.microsoft.com/azure/active-directory/develop/quickstart-register-app?tabs=azure-portal';
        this.showToast(`${providerName} client ID not configured. Opening setup instructions...`, 'warning');
        browser.tabs.create({ url: docsUrl });

  if (statusIndicator) statusIndicator.textContent = 'warn';
        if (statusText) statusText.textContent = 'Requires configuration';
        statusContainer.className = 'cloud-status warning';
        return;
      }

  if (statusIndicator) statusIndicator.textContent = 'busy';
      if (statusText) statusText.textContent = `Connecting to ${providerName}...`;
      statusContainer.className = 'cloud-status connecting';

      const token = await this.authenticateWithTimeout(serviceKey, 30000);
      if (token) {
        await this.ensureDefaultFolderSelection(serviceKey, { interactive: true });
        this.showToast(`${providerName} connected successfully!`, 'success');
      } else {
        throw new Error('Authentication failed - no token received');
      }
    } catch (error) {
      console.error(`${providerName} connection failed:`, error);
      let errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('timed out')) {
        errorMessage = 'Connection timed out. Please try again.';
      } else if (errorMessage.includes('cancelled')) {
        errorMessage = 'Authentication was cancelled.';
      }

  if (statusIndicator) statusIndicator.textContent = 'error';
      if (statusText) statusText.textContent = 'Connection failed';
      statusContainer.className = 'cloud-status error';
      this.showToast(`${providerName} connection failed: ${errorMessage}`, 'error');
    } finally {
      this.isConnecting = false;
      this.updateCloudStatus();
    }
  }

  async chooseCloudFolder() {
    const serviceKey = this.normalizeCloudServiceKey(this.settings.cloudService);
    const providerName = this.getCloudProviderName(serviceKey);

    if (!this.settings.uploadToCloud || serviceKey === 'none') {
      this.showToast('Enable cloud upload before choosing a folder.', 'warning');
      return;
    }

    await this.ensureCloudScriptsLoaded();

    if (!window.cloudStorageManager?.isAuthenticated(serviceKey)) {
      this.showToast(`Sign in to ${providerName} first.`, 'warning');
      return;
    }

    try {
      const selection = await this.openFolderPicker(serviceKey);
      if (!selection) {
        return;
      }

  await window.cloudStorageManager.setSelectedFolder(serviceKey, selection);
  await this.persistCloudFolderSelection(serviceKey, selection);

      this.updateCloudFolderSummary();
      this.showToast(`Uploads will go to ${selection.path || selection.name} on ${providerName}.`, 'success');
    } catch (error) {
      console.error('Failed to choose folder:', error);
      this.showToast(`Failed to choose folder: ${error.message}`, 'error');
    }
  }

  async disconnectCloud() {
    const serviceKey = this.normalizeCloudServiceKey(this.settings.cloudService);
    const providerName = this.getCloudProviderName(serviceKey);

    if (!this.settings.uploadToCloud || serviceKey === 'none') {
      return;
    }

    await this.ensureCloudScriptsLoaded();

    try {
      await window.cloudStorageManager.clearAuthentication(serviceKey);
      await window.cloudStorageManager.setSelectedFolder(serviceKey, null);

  await this.persistCloudFolderSelection(serviceKey, null);

      this.showToast(`${providerName} disconnected`, 'success');
    } catch (error) {
      console.error('Failed to disconnect service:', error);
      this.showToast(`Failed to disconnect: ${error.message}`, 'error');
    }

    this.updateCloudStatus();
  }

  validateFolderName(name, serviceKey) {
    if (!name || !name.trim()) {
      this.showToast('Folder name cannot be empty.', 'error');
      return false;
    }

    const trimmed = name.trim();
    if (/[<>:"/\\|?*]/.test(trimmed)) {
      this.showToast('Folder name cannot contain <>:"/\\|?* characters.', 'error');
      return false;
    }

    if (serviceKey === 'one-drive' && /[. ]$/.test(trimmed)) {
      this.showToast('OneDrive folders cannot end with a period or space.', 'error');
      return false;
    }

    return true;
  }

  async openFolderPicker(serviceKey) {
    const providerName = this.getCloudProviderName(serviceKey);
    const rootLabel = this.getCloudRootLabel(serviceKey);

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'cloud-folder-picker-overlay';
      const picker = document.createElement('div');
      picker.className = 'cloud-folder-picker';

      const header = document.createElement('div');
      header.className = 'picker-header';

      const title = document.createElement('h3');
      title.textContent = `Select folder for ${providerName}`;

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'picker-close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.textContent = '\u00d7';

      header.appendChild(title);
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.className = 'picker-body';

      const pathEl = document.createElement('div');
      pathEl.className = 'picker-path';
      pathEl.id = 'pickerPath';

      const listEl = document.createElement('div');
      listEl.className = 'picker-list';
      listEl.id = 'pickerList';

      body.appendChild(pathEl);
      body.appendChild(listEl);

      const footer = document.createElement('div');
      footer.className = 'picker-footer';

      const actionGroupLeft = document.createElement('div');
      actionGroupLeft.className = 'picker-action-group';

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'btn btn-outline';
      backBtn.id = 'pickerBackBtn';
      backBtn.textContent = 'Back';

      const newFolderBtn = document.createElement('button');
      newFolderBtn.type = 'button';
      newFolderBtn.className = 'btn btn-outline';
      newFolderBtn.id = 'pickerNewFolderBtn';
      newFolderBtn.textContent = 'New Folder';

      actionGroupLeft.appendChild(backBtn);
      actionGroupLeft.appendChild(newFolderBtn);

      const actionGroupRight = document.createElement('div');
      actionGroupRight.className = 'picker-action-group right';

      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'btn btn-secondary';
      selectBtn.id = 'pickerSelectBtn';
      selectBtn.textContent = 'Use this folder';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.id = 'pickerCancelBtn';
      cancelBtn.textContent = 'Cancel';

      actionGroupRight.appendChild(selectBtn);
      actionGroupRight.appendChild(cancelBtn);

      footer.appendChild(actionGroupLeft);
      footer.appendChild(actionGroupRight);

      picker.appendChild(header);
      picker.appendChild(body);
      picker.appendChild(footer);

      overlay.appendChild(picker);
      document.body.appendChild(overlay);

      const stack = [{ id: 'root', name: rootLabel }];
      let active = true;
      let renderToken = 0;

      const cleanup = () => {
        if (!active) return;
        active = false;
        overlay.remove();
      };

      const renderStatus = (className, text) => {
        const message = document.createElement('div');
        message.className = className;
        message.textContent = text;
        listEl.replaceChildren(message);
      };

      const render = async () => {
        const token = ++renderToken;
        const current = stack[stack.length - 1];
        pathEl.textContent = stack.map(item => item.name).join(' / ');
        backBtn.disabled = stack.length <= 1;
        renderStatus('picker-loading', 'Loading folders...');

        try {
          const { folders } = await window.cloudStorageManager.listFolders(serviceKey, current.id);
          if (token !== renderToken || !active) {
            return;
          }

          if (!folders || folders.length === 0) {
            renderStatus('picker-empty', 'No subfolders here yet.');
            return;
          }

          listEl.replaceChildren();
          folders.forEach(folder => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'picker-item';
            const icon = document.createElement('span');
            icon.className = 'picker-item-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = '>';

            const name = document.createElement('span');
            name.className = 'picker-item-name';
            name.textContent = folder.name || 'Unnamed Folder';

            item.appendChild(icon);
            item.appendChild(name);
            item.addEventListener('click', () => {
              stack.push({ id: folder.id, name: folder.name || 'Unnamed Folder' });
              render();
            });
            listEl.appendChild(item);
          });
        } catch (error) {
          console.error('Failed to list folders:', error);
          renderStatus('picker-empty error', error.message);
        }
      };

      const finish = (result) => {
        cleanup();
        resolve(result || null);
      };

      backBtn.addEventListener('click', () => {
        if (stack.length > 1) {
          stack.pop();
          render();
        }
      });

      newFolderBtn.addEventListener('click', async () => {
        const current = stack[stack.length - 1];
        const input = prompt(`Create a new folder inside ${current.name}`, 'New Folder');
        if (input === null) {
          return;
        }

        const trimmed = input.trim();
        if (!this.validateFolderName(trimmed, serviceKey)) {
          return;
        }

        try {
          newFolderBtn.disabled = true;
          const created = await window.cloudStorageManager.createFolder(serviceKey, current.id, trimmed);
          this.showToast(`Created folder "${trimmed}"`, 'success');
          if (created?.id) {
            stack.push({ id: created.id, name: created.name || trimmed });
          }
          await render();
        } catch (error) {
          console.error('Failed to create folder:', error);
          this.showToast(`Failed to create folder: ${error.message}`, 'error');
        } finally {
          newFolderBtn.disabled = false;
        }
      });

      selectBtn.addEventListener('click', () => {
        const current = stack[stack.length - 1];
        const path = stack.map(item => item.name).join(' / ');
        finish({
          id: current.id,
          name: current.name,
          path
        });
      });

      cancelBtn.addEventListener('click', () => finish(null));
      closeBtn.addEventListener('click', () => finish(null));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          finish(null);
        }
      });

      render();
    });
  }
  
  async ensureCloudScriptsLoaded() {

    if (!window.CLOUD_CONFIG) {
      await this.loadScript('../utils/cloudConfig.js');
    }
    

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

    const key = this.normalizeCloudServiceKey(service);
    switch (key) {
      case 'google-drive':
        return typeof window.CLOUD_CONFIG.isConfigured === 'function'
          ? window.CLOUD_CONFIG.isConfigured('google')
          : window.CLOUD_CONFIG.GOOGLE_DRIVE_CLIENT_ID !== 'YOUR_GOOGLE_DRIVE_CLIENT_ID_HERE';
      case 'one-drive':
        return typeof window.CLOUD_CONFIG.isConfigured === 'function'
          ? window.CLOUD_CONFIG.isConfigured('onedrive')
          : window.CLOUD_CONFIG.ONEDRIVE_CLIENT_ID !== 'YOUR_ONEDRIVE_CLIENT_ID_HERE';
      default:
        return false;
    }
  }
  
  async authenticateWithTimeout(service, timeoutMs = 30000) {
    return new Promise(async (resolve, reject) => {

      const timeoutId = setTimeout(() => {
        console.error(`Authentication timeout for ${service}`);
        reject(new Error(`Authentication timed out after ${timeoutMs/1000} seconds`));
      }, timeoutMs);
      
      try {
        let token;
        const key = this.normalizeCloudServiceKey(service);
        if (key === 'google-drive') {
          token = await window.cloudStorageManager.authenticateGoogleDrive();
        } else if (key === 'one-drive') {
          token = await window.cloudStorageManager.authenticateOneDrive();
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


  setupSitesTab() {

    

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

    sitesList.replaceChildren();

    enabledSites.forEach(site => {
      const siteItem = document.createElement('div');
      siteItem.className = 'site-item';
      
      const isDefault = defaultSites.includes(site);
      if (isDefault) {
        siteItem.classList.add('default');
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'site-name';
      nameSpan.textContent = site;

      const controls = document.createElement('div');
      controls.className = 'site-controls';

      const statusSpan = document.createElement('span');
      statusSpan.className = 'site-status';
      statusSpan.textContent = isDefault ? 'Built-in support' : 'Custom site';
      controls.appendChild(statusSpan);

      if (!isDefault) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-sm remove-site-btn';
        removeBtn.dataset.site = site;
        removeBtn.title = 'Remove site';
        removeBtn.textContent = 'Remove';
        controls.appendChild(removeBtn);
      }

      siteItem.appendChild(nameSpan);
      siteItem.appendChild(controls);

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


    const updatedSites = [...currentSites, newSite];
    this.updateSetting('enabledSites', updatedSites);
    

    newSiteInput.value = '';
    this.populateSitesList();
    
    this.showToast(`Added ${newSite} to enabled sites`, 'success');
  }

  removeSite(site) {
    const currentSites = this.settings.enabledSites || [];
    const defaultSites = ['youtube.com', 'vimeo.com', 'twitch.tv'];
    

    if (defaultSites.includes(site)) {
      this.showToast('Cannot remove built-in sites', 'error');
      return;
    }

    const updatedSites = currentSites.filter(s => s !== site);
    this.updateSetting('enabledSites', updatedSites);
    
    this.populateSitesList();
    this.showToast(`Removed ${site} from enabled sites`, 'success');
  }


  exportSettings() {
    try {

      const settingsToExport = { ...this.settings };
      

      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: settingsToExport
      };
      

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `youtube-screenshot-helper-settings-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      

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
          

          if (!importData.settings) {
            this.showToast('Invalid settings file format', 'error');
            return;
          }
          

          const importedSettings = { ...this.defaults, ...importData.settings };
          

          Object.keys(importedSettings).forEach(key => {
            this.settings[key] = importedSettings[key];
          });
          

          browser.storage.sync.set(this.settings).then(() => {

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
      

      fileInput.value = '';
    };
    

    fileInput.click();
  }

  resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      try {

        this.settings = { ...this.defaults };
        

        browser.storage.sync.clear().then(() => {
          return browser.storage.sync.set(this.settings);
        }).then(() => {

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


}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.optionsManager = new OptionsManager();
    window.optionsManager.init();
  });
} else {
  window.optionsManager = new OptionsManager();
  window.optionsManager.init();
}