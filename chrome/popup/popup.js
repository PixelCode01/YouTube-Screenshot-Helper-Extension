console.log('YouTube Screenshot Helper: Popup loaded');

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.settings = {};
    this.init();
  }

  async init() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];

      await this.loadSettings();

      this.setupEventListeners();
      this.updateUI();

      await this.checkExtensionStatus();
      
    } catch (error) {
      console.error('Popup initialization failed:', error);
      this.showNotification('Failed to initialize popup', 'error');
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get();
      this.settings = {
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
        includeYoutube: true,
        includeVideoTitle: true,
        includeChannelName: false,
        includePlaylistName: false,
        includeChapter: false,
        includeTimestamp: true,
        includeDate: true,
        includeTime: false,
        titleSeparator: ' - ',
        organizeFolders: 'none',
        customFolderPattern: '{channel}/{date}',
        showFullscreenPopup: false,
        fullscreenPopupDuration: 3,
        useCustomPath: false,
        customDownloadPath: '',
        ...result
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  setupEventListeners() {
    document.getElementById('captureBtn').addEventListener('click', () => {
      this.captureScreenshot();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    document.getElementById('fullscreenOnlyToggle').addEventListener('change', (e) => {
      this.updateSetting('fullscreenOnly', e.target.checked);
    });

    document.getElementById('autoHideToggle').addEventListener('change', (e) => {
      this.updateSetting('autoHideControls', e.target.checked);
    });

    document.getElementById('annotationToggle').addEventListener('change', (e) => {
      this.updateSetting('annotationMode', e.target.checked);
    });

    document.getElementById('helpBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/your-repo/youtube-screenshot-helper#readme' });
    });

    document.getElementById('feedbackBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension/issues' });
    });

    document.querySelector('.notification-close').addEventListener('click', () => {
      this.hideNotification();
    });
  }

  updateUI() {
    document.getElementById('fullscreenOnlyToggle').checked = this.settings.fullscreenOnly;
    document.getElementById('autoHideToggle').checked = this.settings.autoHideControls;
    document.getElementById('annotationToggle').checked = this.settings.annotationMode;

    document.getElementById('currentShortcut').textContent = 'Ctrl+Shift+S';
    document.getElementById('alternativeShortcut').textContent = this.getKeyDisplayName(this.settings.fullscreenShortcut || 'shift+enter');

    if (this.currentTab && this.currentTab.url) {
      const url = new URL(this.currentTab.url);
      document.getElementById('currentSite').textContent = url.hostname;
      
      const isBuiltInSite = ['youtube.com', 'vimeo.com', 'twitch.tv'].some(site => 
        url.hostname.includes(site)
      );
      const isCustomSite = this.settings.enabledSites.some(site => 
        url.hostname.includes(site) && !['youtube.com', 'vimeo.com', 'twitch.tv'].includes(site)
      );
      const isSupported = isBuiltInSite || isCustomSite;
      
      const siteIndicator = document.querySelector('.site-indicator');
      const siteText = document.querySelector('.site-text');
      
      if (isBuiltInSite) {
        siteIndicator.classList.remove('unsupported');
        siteText.textContent = 'Built-in support';
      } else if (isCustomSite) {
        siteIndicator.classList.remove('unsupported');
        siteText.textContent = 'Custom site';
      } else {
        siteIndicator.classList.add('unsupported');
        siteText.textContent = 'Not supported';
      }
    }
  }

  getKeyDisplayName(keyCode) {
    const keyMap = {
      'space': 'Spacebar',
      'enter': 'Enter',
      'shift+enter': 'Shift + Enter',
      'shift+space': 'Shift + Spacebar',
      'shift+keys': 'Shift + S',
      'shift+keya': 'Shift + A',
      'shift+keyb': 'Shift + B',
      'shift+keyc': 'Shift + C',
      'shift+keyd': 'Shift + D',
      'shift+keye': 'Shift + E',
      'shift+keyf': 'Shift + F',
      'shift+keyg': 'Shift + G',
      'Shift+KeyH': 'Shift+H',
      'Shift+KeyI': 'Shift+I',
      'Shift+KeyJ': 'Shift+J',
      'Shift+KeyK': 'Shift+K',
      'Shift+KeyL': 'Shift+L',
      'Shift+KeyM': 'Shift+M',
      'Shift+KeyN': 'Shift+N',
      'Shift+KeyO': 'Shift+O',
      'Shift+KeyP': 'Shift+P',
      'Shift+KeyQ': 'Shift+Q',
      'Shift+KeyR': 'Shift+R',
      'Shift+KeyT': 'Shift+T',
      'Shift+KeyU': 'Shift+U',
      'Shift+KeyV': 'Shift+V',
      'Shift+KeyW': 'Shift+W',
      'Shift+KeyX': 'Shift+X',
      'Shift+KeyY': 'Shift+Y',
      'Shift+KeyZ': 'Shift+Z',
      'KeyS': 'S',
      'KeyA': 'A',
      'KeyB': 'B',
      'KeyC': 'C',
      'KeyD': 'D',
      'KeyE': 'E',
      'KeyF': 'F',
      'KeyG': 'G',
      'KeyH': 'H',
      'KeyI': 'I',
      'KeyJ': 'J',
      'KeyK': 'K',
      'KeyL': 'L',
      'KeyM': 'M',
      'KeyN': 'N',
      'KeyO': 'O',
      'KeyP': 'P',
      'KeyQ': 'Q',
      'KeyR': 'R',
      'KeyT': 'T',
      'KeyU': 'U',
      'KeyV': 'V',
      'KeyW': 'W',
      'KeyX': 'X',
      'KeyY': 'Y',
      'KeyZ': 'Z'
    };
    
    return keyMap[keyCode] || keyCode;
  }

  async checkExtensionStatus() {
    if (!this.currentTab) return;

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getStatus'
      });

      this.updateStatusIndicator(response);
      this.updatePageInfo(response);
      
    } catch (error) {
      console.log('Content script not loaded or tab not supported');
      this.updateStatusIndicator({ initialized: false });
      this.updatePageInfo({ 
        initialized: false, 
        videoFound: false, 
        fullscreen: false 
      });
    }
  }

  updateStatusIndicator(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (status && status.initialized) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Active';
    } else {
      statusDot.className = 'status-dot inactive';
      statusText.textContent = 'Inactive';
    }
  }

  updatePageInfo(status) {
    const videoStatus = document.getElementById('videoStatus');
    if (status && status.videoFound) {
      videoStatus.textContent = 'Found';
      videoStatus.style.color = '#4caf50';
    } else {
      videoStatus.textContent = 'Not found';
      videoStatus.style.color = '#f44336';
    }

    const fullscreenStatus = document.getElementById('fullscreenStatus');
    if (status && status.fullscreen) {
      fullscreenStatus.textContent = 'Yes';
      fullscreenStatus.style.color = '#4caf50';
    } else {
      fullscreenStatus.textContent = 'No';
      fullscreenStatus.style.color = '#666';
    }

    const captureBtn = document.getElementById('captureBtn');
    const canCapture = status && 
                      (status.videoFound || !this.settings.fullscreenOnly || status.fullscreen);
    
    if (status && status.enabledSite && !status.videoFound) {
      captureBtn.disabled = false;
      captureBtn.title = 'Try to capture (video not detected but site is enabled)';
    } else {
      captureBtn.disabled = !canCapture;
      captureBtn.title = canCapture ? 'Capture screenshot' : 'Video not found or conditions not met';
    }
  }

  async captureScreenshot() {
    if (!this.currentTab) {
      this.showNotification('No active tab found', 'error');
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'captureScreenshot'
      });

      if (response && response.success) {
        this.showNotification('Screenshot captured successfully!', 'success');
        window.close();
      } else {
        throw new Error(response?.error || 'Failed to capture screenshot');
      }
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      this.showNotification(error.message || 'Failed to capture screenshot', 'error');
    }
  }

  async updateSetting(key, value) {
    try {
      this.settings[key] = value;
      await chrome.storage.sync.set({ [key]: value });
      
      if (this.currentTab) {
        chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'updateSettings'
        }).catch(() => {
        });
      }
      
      this.showNotification('Setting updated', 'success');
      
    } catch (error) {
      console.error('Failed to update setting:', error);
      this.showNotification('Failed to update setting', 'error');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.querySelector('.notification-text');
    
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'flex';
    
    setTimeout(() => {
      this.hideNotification();
    }, 3000);
  }

  hideNotification() {
    const notification = document.getElementById('notification');
    notification.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'popupUpdate') {
    console.log('Popup update received:', message);
  }
});
