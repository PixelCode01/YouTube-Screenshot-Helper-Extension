
class YouTubeHandler {
  constructor() {
    this.playerAPI = null;
    this.init();
  }

  init() {
    this.waitForYouTubePlayer();
  }

  async waitForYouTubePlayer() {
    const checkPlayer = () => {
      const player = document.querySelector('.html5-video-player') || 
                    document.querySelector('#movie_player') ||
                    document.querySelector('video');
      
      if (player) {
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
    document.addEventListener('keydown', (event) => {
      if (window.keyHandler && window.keyHandler.shouldHandleKey(event)) {
        event.stopPropagation();
        event.preventDefault();
        
        if (!window.keyHandler || !window.storageManager) return false;
        window.keyHandler.handleKeyPress(event);
      }
    }, true);
  }

  setupPlayerStateMonitoring() {
    const video = document.querySelector('video');
    if (video) {
      video.addEventListener('play', () => {});
      video.addEventListener('pause', () => {});
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
    if (fullscreenBtn && fullscreenBtn.parentNode === controlsBar) {
      controlsBar.insertBefore(screenshotBtn, fullscreenBtn);
    } else {
      controlsBar.appendChild(screenshotBtn);
    }
  }

  onVideoChanged() {
    setTimeout(() => {
      this.addScreenshotButton();
    }, 1000);
  }

  onFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
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

const youtubeHostPatterns = ['youtube.com', 'youtube-nocookie.com'];
if (youtubeHostPatterns.some(domain => window.location.hostname.includes(domain))) {
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
