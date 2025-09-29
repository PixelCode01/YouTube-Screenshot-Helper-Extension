console.log('YouTube Screenshot Helper: Popup loaded');

// Debug popup visibility
if (typeof browser === 'undefined') {
  console.error('[Popup JS] CRITICAL: browser API not available in popup context');
} else {
  console.log('[Popup JS] browser API confirmed available');
}

// Lifecycle instrumentation to confirm popup load sequence
try {
  const runtimeApi = typeof browser !== 'undefined' ? browser.runtime : undefined;
  if (runtimeApi && typeof runtimeApi.sendMessage === 'function') {
    runtimeApi.sendMessage({
      action: 'popup:lifecycle-event',
      stage: 'script-evaluated',
      timestamp: Date.now(),
      href: window.location.href
    }).then(() => {
      console.log('[Popup JS] Lifecycle ping dispatched to background (script-evaluated)');
    }).catch((pingError) => {
      console.warn('[Popup JS] Failed to dispatch lifecycle ping:', pingError);
    });
  } else {
    console.warn('[Popup JS] runtime.sendMessage unavailable during lifecycle instrumentation');
  }
} catch (pingInitError) {
  console.warn('[Popup JS] Lifecycle instrumentation setup failed:', pingInitError);
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup JS] DOMContentLoaded fired for popup document');
  try {
    const root = document.querySelector('.popup-container');
    const rootStyle = root ? getComputedStyle(root) : null;
    console.log('[Popup JS] Layout snapshot after DOMContentLoaded', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      bodyClientRect: {
        width: document.body.getBoundingClientRect().width,
        height: document.body.getBoundingClientRect().height
      },
      rootExists: !!root,
      rootDisplay: rootStyle?.display,
      rootVisibility: rootStyle?.visibility,
      rootOpacity: rootStyle?.opacity
    });
  } catch (layoutError) {
    console.warn('[Popup JS] Failed to capture layout snapshot:', layoutError);
  }
  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    browser.runtime.sendMessage({
      action: 'popup:lifecycle-event',
      stage: 'dom-ready',
      timestamp: Date.now(),
      href: window.location.href
    }).catch((domPingError) => {
      console.warn('[Popup JS] Failed to dispatch dom-ready lifecycle ping:', domPingError);
    });
  }
});

window.addEventListener('load', () => {
  console.log('[Popup JS] window.load event fired');
  try {
    console.log('[Popup JS] Layout snapshot after window.load', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      scrollHeight: document.body.scrollHeight,
      scrollWidth: document.body.scrollWidth
    });
  } catch (postLoadLayoutError) {
    console.warn('[Popup JS] Failed to capture load layout snapshot:', postLoadLayoutError);
  }
  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    browser.runtime.sendMessage({
      action: 'popup:lifecycle-event',
      stage: 'window-load',
      timestamp: Date.now(),
      href: window.location.href
    }).catch((loadPingError) => {
      console.warn('[Popup JS] Failed to dispatch window-load lifecycle ping:', loadPingError);
    });
  }
});

window.addEventListener('error', (event) => {
  console.error('[Popup JS] window error captured', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Popup JS] unhandled promise rejection captured', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

// Check if we're in a proper extension popup context
try {
  const isPopupContext = window.location.protocol === 'moz-extension:';
  console.log('[Popup JS] Extension context check:', {
    protocol: window.location.protocol,
    href: window.location.href,
    isPopupContext
  });
} catch (error) {
  console.error('[Popup JS] Failed to check extension context:', error);
}

class PopupErrorHandler {
  constructor() {
    this.context = 'popup';
  }

  handleError(error, operation) {
    const errorInfo = {
      message: error.message || 'Unknown error',
      context: this.context,
      operation,
      timestamp: new Date().toISOString()
    };

    console.error(`=== ERROR in ${this.context} (${operation}) ===`);
    console.error(`Message: ${errorInfo.message}`);
    console.error(`Stack: ${error.stack}`);

    return errorInfo;
  }

  async handleAsyncOperation(asyncFn, operation) {
    try {
      return await asyncFn();
    } catch (error) {
      const errorInfo = this.handleError(error, operation);
      return { success: false, error: errorInfo };
    }
  }
}

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.settings = {};
    this.errorHandler = new PopupErrorHandler();
    this.init();
  }

  async init() {
    console.log('[Popup] Starting initialization sequence');
    const result = await this.errorHandler.handleAsyncOperation(async () => {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      console.log('[Popup] Active tab resolved:', this.currentTab ? {
        id: this.currentTab.id,
        url: this.currentTab.url
      } : 'none');

      await this.loadSettings();
      console.log('[Popup] Settings initialized with', {
        fullscreenOnly: this.settings.fullscreenOnly,
        autoHideControls: this.settings.autoHideControls,
        enabledSitesCount: Array.isArray(this.settings.enabledSites) ? this.settings.enabledSites.length : 0
      });

      this.setupEventListeners();
      this.updateUI();
      console.log('[Popup] UI updated to reflect latest settings');

      await this.checkExtensionStatus();
      console.log('[Popup] Extension status check completed');
      
      return { success: true };
    }, 'popup initialization');

    if (!result.success) {
      this.showNotification('Failed to initialize popup', 'error');
    } else {
      console.log('[Popup] Initialization sequence finished successfully');
    }
  }

  async loadSettings() {
    const result = await this.errorHandler.handleAsyncOperation(async () => {
      const storageResult = await browser.storage.sync.get();
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
        ...storageResult
      };
      console.log('[Popup] Storage payload retrieved with keys:', Object.keys(storageResult));
      return { success: true };
    }, 'load settings');

    if (!result.success) {
      console.warn('Using default settings due to load failure');
    }
  }

  setupEventListeners() {
    document.getElementById('captureBtn').addEventListener('click', () => {
      this.captureScreenshot();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openOptionsPage();
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
      browser.tabs.create({ url: 'https://github.com/your-repo/youtube-screenshot-helper#readme' });
    });

    document.getElementById('feedbackBtn').addEventListener('click', () => {
      browser.tabs.create({ url: 'https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension/issues' });
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
      console.log('[Popup] Requesting status from content script on tab', this.currentTab.id);
      const response = await browser.tabs.sendMessage(this.currentTab.id, {
        action: 'getStatus'
      });

      console.log('[Popup] Received status response:', {
        initialized: response?.initialized,
        videoFound: response?.videoFound,
        fullscreen: response?.fullscreen,
        enabledSite: response?.enabledSite
      });

      this.updateStatusIndicator(response);
      this.updatePageInfo(response);
      
    } catch (error) {
      console.log('[Popup] Content script not loaded or tab not supported:', error?.message || error);
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
      const response = await browser.tabs.sendMessage(this.currentTab.id, {
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
      await browser.storage.sync.set({ [key]: value });
      
      if (this.currentTab) {
        browser.tabs.sendMessage(this.currentTab.id, {
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

  async openOptionsPage() {
    console.log('[Popup] Settings button clicked – opening options page');

    try {
      if (browser?.runtime?.openOptionsPage) {
        await browser.runtime.openOptionsPage();
        console.log('[Popup] Options page opened via browser.runtime.openOptionsPage');
      } else {
        throw new Error('browser.runtime.openOptionsPage is unavailable');
      }

      window.close();
      return;
    } catch (error) {
      console.error('[Popup] Failed to open options page via runtime API:', error);
    }

    try {
      const fallbackUrl = browser.runtime.getURL('options/options.html');
      console.log('[Popup] Falling back to direct options tab at', fallbackUrl);
      await browser.tabs.create({ url: fallbackUrl });
      window.close();
    } catch (fallbackError) {
      console.error('[Popup] Fallback options tab creation failed:', fallbackError);
      this.showNotification('Unable to open settings page. See console for details.', 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Popup JS] DOMContentLoaded fired - creating PopupManager');
  try {
    const popupManager = new PopupManager();
    console.log('[Popup JS] PopupManager created successfully');
    window.popupManager = popupManager; // For debugging
  } catch (error) {
    console.error('[Popup JS] CRITICAL: Failed to create PopupManager:', error);
    // Show fallback UI
    const fallback = document.createElement('div');
    fallback.style.padding = '20px';
    fallback.style.color = 'red';
    fallback.style.fontFamily = 'sans-serif';

    const heading = document.createElement('h3');
    heading.textContent = 'Extension Error';

    const description = document.createElement('p');
    description.textContent = 'Failed to initialize popup: ' + error.message;

    const details = document.createElement('p');
    details.textContent = 'Check the browser console for details.';

    fallback.appendChild(heading);
    fallback.appendChild(description);
    fallback.appendChild(details);

    document.body.replaceChildren(fallback);
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'popupUpdate') {
    console.log('Popup update received:', message);
  }
});
