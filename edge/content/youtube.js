// YouTube-specific functionality for Screenshot Helper
// Note: browser-polyfill.js is loaded via manifest.json

class YouTubeHandler {
  constructor() {
    this.playerAPI = null;
    this.init();
  }

  init() {
    console.log('YouTube Screenshot Helper: YouTube handler initialized');
    this.waitForYouTubePlayer();
  }

  async waitForYouTubePlayer() {
    const checkPlayer = () => {
      const player = document.querySelector('.html5-video-player') || 
                    document.querySelector('#movie_player') ||
                    document.querySelector('video');
      
      if (player) {
        console.log('YouTube player found');
        this.setupYouTubeIntegration();
        return true;
      }
      return false;
    };

    if (checkPlayer()) return;
    
    const pollInterval = setInterval(() => {
      if (checkPlayer()) {
        clearInterval(pollInterval);
      }
    }, 1000);
    
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 30000);
  }

  setupYouTubeIntegration() {
    this.setupKeyboardOverrides();
    this.setupPlayerStateMonitoring();
    this.setupCustomUI();
    this.setupNavigationHandler();
  }

  setupKeyboardOverrides() {
    // KeyHandler already has its own keydown listener, no need for duplicate
    // Just ensure YouTube's default shortcuts don't interfere
    document.addEventListener('keydown', (event) => {
      if (window.keyHandler && window.keyHandler.shouldHandleKey(event)) {
        event.stopPropagation();
        event.preventDefault();
        // Don't call handleKeyPress here - keyHandler's own listener will handle it
      }
    }, true);
  }

  setupPlayerStateMonitoring() {
    const video = document.querySelector('video');
    if (video) {
      video.addEventListener('play', () => {
        console.log('YouTube: Video started playing');
      });
      
      video.addEventListener('pause', () => {
        console.log('YouTube: Video paused');
      });
    }
  }

  setupCustomUI() {
    this.addScreenshotButton();
  }

  async addScreenshotButton() {
    const controlsBar = document.querySelector('.ytp-right-controls') || 
                       document.querySelector('.ytp-chrome-controls');
    
    if (!controlsBar || controlsBar.querySelector('.screenshot-btn')) {
      return;
    }

    const screenshotBtn = document.createElement('button');
    screenshotBtn.className = 'ytp-button screenshot-btn';
    screenshotBtn.title = 'Take Screenshot (Ctrl+Shift+S)';
    screenshotBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21,17H7V3H21M21,1H7A2,2 0 0,0 5,3V17A2,2 0 0,0 7,19H21A2,2 0 0,0 23,17V3A2,2 0 0,0 21,1M3,5H1V21A2,2 0 0,0 3,23H19V21H3M15.5,11L13.5,13.5L11.5,11.5L9,15H19L15.5,11Z"/></svg>';

    screenshotBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (window.screenshotManager) {
        await window.screenshotManager.captureScreenshot();
      }
    });

    const fullscreenBtn = controlsBar.querySelector('.ytp-fullscreen-button');
    if (fullscreenBtn) {
      controlsBar.insertBefore(screenshotBtn, fullscreenBtn);
    } else {
      controlsBar.appendChild(screenshotBtn);
    }

    console.log('YouTube: Screenshot button added to player controls');
  }

  onVideoChanged() {
    const metadata = this.getVideoMetadata();
    document.dispatchEvent(new CustomEvent('metadataUpdated', { detail: metadata }));
    console.log('YouTube: Dispatched metadataUpdated event');

    // Existing logic to refresh UI elements
    console.log('YouTube: Video changed, refreshing screenshot button');
    setTimeout(() => {
      this.addScreenshotButton();
    }, 1000);
  }

  onFullscreenChange() {
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement
    );
    
    console.log('YouTube: Fullscreen state changed:', isFullscreen);
  }

  getVideoMetadata() {
    const metadata = {
      title: document.title.replace(' - YouTube', ''),
      channel: document.querySelector('#owner #channel-name a')?.textContent || '',
      playlist: document.querySelector('.ytd-playlist-panel-renderer .title')?.textContent || '',
      chapter: document.querySelector('.ytp-chapter-title-content')?.textContent || '',
    };
    console.log('YouTube metadata collected:', metadata);
    return metadata;
  }

  setupNavigationHandler() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.onVideoChanged();
      }
    }).observe(document, { subtree: true, childList: true });
  }
}

// Initialize YouTube handler when this script loads
if (window.location.hostname.includes('youtube.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.youtubeHandler = new YouTubeHandler();
    });
  } else {
    window.youtubeHandler = new YouTubeHandler();
  }
  
  document.addEventListener('fullscreenchange', () => {
    if (window.youtubeHandler) {
      window.youtubeHandler.onFullscreenChange();
    }
  });
  
  document.addEventListener('webkitfullscreenchange', () => {
    if (window.youtubeHandler) {
      window.youtubeHandler.onFullscreenChange();
    }
  });
}
