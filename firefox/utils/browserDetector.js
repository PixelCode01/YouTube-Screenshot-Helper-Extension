

class BrowserDetector {
  constructor() {
    this.userAgent = this.getUserAgent();
    this.browserInfo = this.detectBrowser();
  }

  
  getUserAgent() {
    try {
      return navigator.userAgent || '';
    } catch (error) {
      console.warn('BrowserDetector: Unable to access navigator.userAgent:', error);
      return '';
    }
  }

  
  detectBrowser() {
    const ua = this.userAgent;
    

    if (ua.includes('Edg/')) {
      const versionMatch = ua.match(/Edg\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
      return {
        name: 'Edge',
        isEdge: true,
        isFirefox: false,
        isChrome: false,
        version: versionMatch ? versionMatch[1] : 'Unknown',
        majorVersion: versionMatch ? parseInt(versionMatch[1].split('.')[0]) : 0,
        engine: 'Chromium'
      };
    }
    

    if (ua.includes('Edg/')) {
      const versionMatch = ua.match(/Chrome\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
      return {
        name: 'Chrome',
        isEdge: false,
        isFirefox: false,
        isChrome: true,
        version: versionMatch ? versionMatch[1] : 'Unknown',
        majorVersion: versionMatch ? parseInt(versionMatch[1].split('.')[0]) : 0,
        engine: 'Chromium'
      };
    }
    

    if (ua.includes('Firefox/')) {
      const versionMatch = ua.match(/Firefox\/([0-9]+\.[0-9]+)/);
      return {
        name: 'Firefox',
        isEdge: false,
        isFirefox: true,
        isChrome: false,
        version: versionMatch ? versionMatch[1] : 'Unknown',
        majorVersion: versionMatch ? parseInt(versionMatch[1].split('.')[0]) : 0,
        engine: 'Gecko'
      };
    }


    return {
      name: 'Unknown',
      isEdge: false,
      isFirefox: false,
      isChrome: false,
      version: 'Unknown',
      majorVersion: 0,
      engine: 'Unknown'
    };
  }

  
  isEdge() {
    return this.browserInfo.isEdge;
  }

  
  isFirefox() {
    return this.browserInfo.isFirefox;
  }

  
  isChrome() {
    return this.browserInfo.isChrome;
  }

  
  getBrowserName() {
    return this.browserInfo.name;
  }

  
  getBrowserVersion() {
    return this.browserInfo.version;
  }

  
  getMajorVersion() {
    return this.browserInfo.majorVersion;
  }

  
  getBrowserInfo() {
    return {
      ...this.browserInfo,
      userAgent: this.userAgent
    };
  }

  
  supportsFeature(feature) {
    switch (feature) {
      case 'downloads':
      case 'alarms':
      case 'notifications':
      case 'scripting':
      case 'storage':
      case 'commands':
        return this.browserInfo.isEdge || this.browserInfo.isChrome || this.browserInfo.isFirefox;

      case 'identity':
        return this.browserInfo.isEdge || this.browserInfo.isChrome;

      default:
        return false;
    }
  }

  
  getBrowserLimitations() {
    if (this.browserInfo.isEdge) {
      return {
        maxDownloadPathLength: 200,
        maxPathDepth: 4,
        stricterPathValidation: true,
        notificationStylingLimited: true,
        downloadPathRestrictions: true
      };
    }
    
    if (this.browserInfo.isChrome) {
      return {
        maxDownloadPathLength: 260,
        maxPathDepth: 8,
        stricterPathValidation: false,
        notificationStylingLimited: false,
        downloadPathRestrictions: false
      };
    }

    if (this.browserInfo.isFirefox) {
      return {
        maxDownloadPathLength: 255,
        maxPathDepth: 8,
        stricterPathValidation: false,
        notificationStylingLimited: false,
        downloadPathRestrictions: false,
        identityApiUnavailable: true
      };
    }
    
    return {
      maxDownloadPathLength: 200,
      maxPathDepth: 3,
      stricterPathValidation: true,
      notificationStylingLimited: true,
      downloadPathRestrictions: true
    };
  }

  
  getBrowserSpecificConfig(context) {
    const config = {
      browser: this.browserInfo.name,
      context
    };

    if (this.browserInfo.isEdge) {
      switch (context) {
        case 'download':
          config.useSimplifiedPaths = true;
          config.maxRetries = 2;
          config.fallbackToTimestamp = true;
          break;
        
        case 'notification':
          config.useBasicStyling = true;
          config.limitTextLength = true;
          break;
        
        case 'storage':
          config.usePolyfill = true;
          break;
      }
    }

    if (this.browserInfo.isFirefox && context === 'identity') {
      config.supported = false;
      config.note = 'Firefox does not implement browser.identity APIs for OAuth-based authentication flows.';
    }

    return config;
  }

  
  logBrowserInfo() {
    const info = this.getBrowserInfo();
  }
}


const browserDetector = new BrowserDetector();


if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BrowserDetector, browserDetector };
  module.exports.default = { BrowserDetector, browserDetector };
} else if (typeof window !== 'undefined') {
  window.BrowserDetector = BrowserDetector;
  window.browserDetector = browserDetector;
} else if (typeof globalThis !== 'undefined') {
  globalThis.BrowserDetector = BrowserDetector;
  globalThis.browserDetector = browserDetector;
}


const isEdgeBrowser = () => browserDetector.isEdge();
const isFirefoxBrowser = () => browserDetector.isFirefox();
const isChromeBrowser = () => browserDetector.isChrome();
const getBrowserName = () => browserDetector.getBrowserName();


if (typeof window !== 'undefined') {
  window.isEdgeBrowser = isEdgeBrowser;
  window.isFirefoxBrowser = isFirefoxBrowser;
  window.isChromeBrowser = isChromeBrowser;
  window.getBrowserName = getBrowserName;
} else if (typeof globalThis !== 'undefined') {
  globalThis.isEdgeBrowser = isEdgeBrowser;
  globalThis.isFirefoxBrowser = isFirefoxBrowser;
  globalThis.isChromeBrowser = isChromeBrowser;
  globalThis.getBrowserName = getBrowserName;
}