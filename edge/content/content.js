// Main content script for YouTube Screenshot Helper
// Note: browser-polyfill.js is loaded via manifest.json
console.log('YouTube Screenshot Helper: Content script loaded');

class ScreenshotExtension {
  constructor() {
        this.isInitialized = false;
    this.settings = null;
    this.videoMetadata = {};
    this.init();
  }

  async init() {
    try {
      // Wait for utilities to load
      await this.waitForUtilities();
      
      // Get initial settings
      this.settings = await window.storageManager.getSettings();
      
      // Set up storage change listener for settings updates
      this.setupStorageListener();
      
      // Check if extension should be active on this site
      const isEnabledSite = await window.storageManager.isCurrentSiteEnabled();
      if (!isEnabledSite) {
        console.log('YouTube Screenshot Helper: Not enabled for this site - waiting for click to activate');
        // Don't return here - wait for user to click extension
        this.isInitialized = true;
        return;
      }

      // Initialize components
            this.setupMessageListeners();
      this.setupMutationObserver();
      this.setupMetadataListener();
      
      // Setup fullscreen change listener
      this.setupFullscreenListener();
      
      // Wait for video content to load on custom sites
      this.waitForVideoContent();
      
      this.isInitialized = true;
      console.log('YouTube Screenshot Helper: Initialized successfully');
      
      // Notify that extension is ready
      this.showReadyNotification();
      
    } catch (error) {
      console.error('YouTube Screenshot Helper: Initialization failed:', error);
    }
  }

  async waitForUtilities() {
    // Wait for utility scripts to load
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      if (window.storageManager && window.keyHandler && window.screenshotManager) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('Utility scripts failed to load');
  }

  setupMessageListeners() {
    // Listen for messages from background script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'ping':
        sendResponse({ status: 'alive' });
        break;
        
      case 'captureScreenshot':
        // If not initialized yet (custom site), initialize now
        if (!this.isInitialized) {
          console.log('YouTube Screenshot Helper: Initializing for custom site via user action');
          this.setupMessageListeners();
          this.setupMutationObserver();
          this.setupFullscreenListener();
          this.isInitialized = true;
        }
        
                if (window.screenshotManager) {
          try {
            await window.screenshotManager.captureScreenshot(this.videoMetadata);
            sendResponse({ success: true });
          } catch (error) {
            console.error('Screenshot capture failed:', error);
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'Extension not initialized' });
        }
        break;
        
      case 'updateSettings':
        await this.updateSettings();
        sendResponse({ success: true });
        break;
        
      case 'getStatus':
        const videoFound = !!this.findVideoElement();
        const isEnabledSite = await window.storageManager.isCurrentSiteEnabled();
        
        sendResponse({
          initialized: this.isInitialized,
          site: window.location.hostname,
          fullscreen: this.isInFullscreen(),
          videoFound: videoFound,
          enabledSite: isEnabledSite
        });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  setupMutationObserver() {
    // Watch for DOM changes to handle dynamic content
    const observer = new MutationObserver((mutations) => {
      this.handleDOMChanges(mutations);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  setupMetadataListener() {
    document.addEventListener('metadataUpdated', (e) => {
      console.log('Content script received metadata:', e.detail);
      this.videoMetadata = e.detail;
    });
  }

  handleDOMChanges(mutations) {
    // Handle specific changes for different video sites
    const hostname = window.location.hostname;
    
    if (hostname.includes('youtube.com')) {
      this.handleYouTubeChanges(mutations);
    } else if (hostname.includes('vimeo.com')) {
      this.handleVimeoChanges(mutations);
    } else if (hostname.includes('twitch.tv')) {
      this.handleTwitchChanges(mutations);
    } else {
      // Handle custom/generic sites
      this.handleGenericSiteChanges(mutations);
    }
  }

  handleGenericSiteChanges(mutations) {
    // For custom sites, look for any new video elements
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a video or contains videos
            let videos = [];
            if (node.tagName === 'VIDEO') {
              videos.push(node);
            } else if (node.querySelector) {
              videos = Array.from(node.querySelectorAll('video'));
            }
            
            videos.forEach(video => {
              console.log('YouTube Screenshot Helper: New video element detected on custom site');
              this.attachVideoListeners(video);
            });
          }
        });
      }
    });
  }

  handleYouTubeChanges(mutations) {
    // Handle YouTube-specific DOM changes
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        // Check for new video elements
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const video = node.querySelector ? node.querySelector('video') : null;
            if (video || node.tagName === 'VIDEO') {
              console.log('YouTube Screenshot Helper: New video element detected');
              this.attachVideoListeners(video || node);
            }
          }
        });
      }
    });
  }

  handleVimeoChanges(mutations) {
    // Handle Vimeo-specific DOM changes
    console.log('Vimeo DOM changes detected');
  }

  handleTwitchChanges(mutations) {
    // Handle Twitch-specific DOM changes
    console.log('Twitch DOM changes detected');
  }

  waitForVideoContent() {
    // For custom sites, wait for video elements to appear
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait time
    
    const checkForVideo = () => {
      const videoElement = this.findVideoElement();
      if (videoElement) {
        console.log('YouTube Screenshot Helper: Video found on page');
        this.attachVideoListeners(videoElement);
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkForVideo, 1000); // Check every second
      } else {
        console.log('YouTube Screenshot Helper: No video found after waiting');
      }
    };
    
    // Start checking after a brief delay
    setTimeout(checkForVideo, 1000);
  }

  attachVideoListeners(video) {
    if (!video || video.hasScreenshotListeners) return;
    
    video.hasScreenshotListeners = true;
    
    // Add event listeners for video vents
    video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
    });

    video.addEventListener('play', () => {
      console.log('Video started playing');
    });

    video.addEventListener('pause', () => {
      console.log('Video paused');
    });

    video.addEventListener('fullscreenchange', () => {
      console.log('Fullscreen state changed:', this.isInFullscreen());
    });
  }

  findVideoElement() {
    const selectors = [
      'video',
      '.video-stream',
      '.vp-video',
      'video[data-a-target="video-player"]'
    ];

    for (const selector of selectors) {
      const video = document.querySelector(selector);
      if (video && video.videoWidth && video.videoHeight) {
        return video;
      }
    }

    return null;
  }

  isInFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      window.innerHeight === screen.height
    );
  }

  async updateSettings() {
    this.settings = await window.storageManager.getSettings();
    
    // Update all utility managers
    if (window.keyHandler) {
      await window.keyHandler.updateSettings();
    }
    
    if (window.screenshotManager) {
      await window.screenshotManager.updateSettings();
    }
  }

  getKeyDisplayName(keyCode) {
    const keyMap = {
      'Space': 'Space',
      'Enter': 'Enter',
      'Shift+KeyS': 'Shift+S',
      'Shift+KeyA': 'Shift+A',
      'Shift+KeyB': 'Shift+B',
      'Shift+KeyC': 'Shift+C',
      'Shift+KeyD': 'Shift+D',
      'Shift+KeyE': 'Shift+E',
      'Shift+KeyF': 'Shift+F',
      'Shift+KeyG': 'Shift+G',
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
      // Legacy support for non-shift keys
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

  getShortcutDisplayName(shortcut) {
    if (!shortcut) return 'undefined';
    
    const keyDisplayMap = {
        'enter': 'Enter',
        'space': 'Space',
    };

    return shortcut.toLowerCase().split('+').map(part => {
        if (keyDisplayMap[part]) {
            return keyDisplayMap[part];
        }
        if (part.startsWith('key')) {
            return part.substring(3).toUpperCase();
        }
        return part.charAt(0).toUpperCase() + part.slice(1);
    }).join('+');
  }

  showReadyNotification() {
    if (!this.settings.showNotifications) return;
    
    // Show the global shortcut instead of the fullscreen key
    const globalShortcut = 'Ctrl+Shift+S';
    const notification = document.createElement('div');
    notification.className = 'screenshot-ready-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <strong>YouTube Screenshot Helper</strong><br>
        Ready! Press ${globalShortcut} to capture screenshots
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2196F3;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 12px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.15);
      max-width: 250px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Animate out
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  setupFullscreenListener() {
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.handleFullscreenChange();
    });
    
    document.addEventListener('webkitfullscreenchange', () => {
      this.handleFullscreenChange();
    });
    
    document.addEventListener('mozfullscreenchange', () => {
      this.handleFullscreenChange();
    });
    
    document.addEventListener('MSFullscreenChange', () => {
      this.handleFullscreenChange();
    });
  }

  async handleFullscreenChange() {
    const isFullscreen = this.isInFullscreen();

    // Always remove popups on change
    const existingPopups = document.querySelectorAll('.fullscreen-screenshot-popup');
    existingPopups.forEach(popup => popup.remove());
    const existingStyles = document.querySelector('#fullscreen-popup-styles');
    if (existingStyles) {
        existingStyles.remove();
    }

    if (isFullscreen && this.settings.showFullscreenPopup) {
        // Re-fetch settings to ensure they are up-to-date
        await this.updateSettings();
        
        const shortcut = this.settings.fullscreenShortcut || 'shift+enter';
        const keyDisplayName = this.getShortcutDisplayName(shortcut);

        const popup = document.createElement('div');
        popup.className = 'fullscreen-screenshot-popup';
        popup.innerHTML = `
            <div class="popup-content">
                Press <strong>${keyDisplayName}</strong> to pause and capture screenshot
            </div>
        `;

        const style = document.createElement('style');
        style.id = 'fullscreen-popup-styles';
        style.innerHTML = `
            .fullscreen-screenshot-popup {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                font-size: 16px;
                font-weight: 500;
                opacity: 0;
                transition: opacity 0.4s ease-in-out;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                text-align: center;
            }
            .fullscreen-screenshot-popup.show {
                opacity: 1;
            }
            .fullscreen-screenshot-popup kbd {
                background-color: #333;
                border: 1px solid #555;
                padding: 3px 6px;
                border-radius: 4px;
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.classList.add('show');
        }, 50);

        const duration = this.settings.fullscreenPopupDuration || 3000;
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 400);
        }, duration);
    }
  }

  setupStorageListener() {
    // Listen for storage changes to update settings in real-time
    browser.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace === 'sync') {
        console.log('YouTube Screenshot Helper: Storage changed, updating settings');
        await this.updateSettings();
      }
    });
  }
}

// Initialize extension when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ScreenshotExtension();
  });
} else {
  new ScreenshotExtension();
}
