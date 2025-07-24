/**
 * Unified browser detection utility for YouTube Screenshot Helper
 * Provides consistent browser detection across Chrome and Edge versions
 */

class BrowserDetector {
  constructor() {
    this.userAgent = this.getUserAgent();
    this.browserInfo = this.detectBrowser();
  }

  /**
   * Safely gets the user agent string
   * @returns {string} User agent string or empty string if unavailable
   */
  getUserAgent() {
    try {
      return navigator.userAgent || '';
    } catch (error) {
      console.warn('BrowserDetector: Unable to access navigator.userAgent:', error);
      return '';
    }
  }

  /**
   * Detects the current browser and version
   * @returns {Object} Browser information object
   */
  detectBrowser() {
    const ua = this.userAgent;
    
    // Edge detection (must come before Chrome since Edge includes Chrome in UA)
    if (ua.includes('Edg/')) {
      const versionMatch = ua.match(/Edg\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
      return {
        name: 'Edge',
        isEdge: true,
        isChrome: false,
        version: versionMatch ? versionMatch[1] : 'Unknown',
        majorVersion: versionMatch ? parseInt(versionMatch[1].split('.')[0]) : 0,
        engine: 'Chromium'
      };
    }
    
    // Chrome detection
    if (ua.includes('Chrome/')) {
      const versionMatch = ua.match(/Chrome\/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
      return {
        name: 'Chrome',
        isEdge: false,
        isChrome: true,
        version: versionMatch ? versionMatch[1] : 'Unknown',
        majorVersion: versionMatch ? parseInt(versionMatch[1].split('.')[0]) : 0,
        engine: 'Chromium'
      };
    }
    
    // Fallback for unknown browsers
    return {
      name: 'Unknown',
      isEdge: false,
      isChrome: false,
      version: 'Unknown',
      majorVersion: 0,
      engine: 'Unknown'
    };
  }

  /**
   * Returns true if running in Microsoft Edge
   * @returns {boolean} True if Edge browser
   */
  isEdge() {
    return this.browserInfo.isEdge;
  }

  /**
   * Returns true if running in Google Chrome
   * @returns {boolean} True if Chrome browser
   */
  isChrome() {
    return this.browserInfo.isChrome;
  }

  /**
   * Returns the browser name
   * @returns {string} Browser name (Edge, Chrome, or Unknown)
   */
  getBrowserName() {
    return this.browserInfo.name;
  }

  /**
   * Returns the browser version
   * @returns {string} Browser version string
   */
  getBrowserVersion() {
    return this.browserInfo.version;
  }

  /**
   * Returns the major version number
   * @returns {number} Major version number
   */
  getMajorVersion() {
    return this.browserInfo.majorVersion;
  }

  /**
   * Returns complete browser information
   * @returns {Object} Complete browser info object
   */
  getBrowserInfo() {
    return {
      ...this.browserInfo,
      userAgent: this.userAgent
    };
  }

  /**
   * Checks if the browser supports a specific feature
   * @param {string} feature - Feature to check
   * @returns {boolean} True if feature is supported
   */
  supportsFeature(feature) {
    switch (feature) {
      case 'downloads':
        return this.browserInfo.isEdge || this.browserInfo.isChrome;
      
      case 'alarms':
        return this.browserInfo.isEdge || this.browserInfo.isChrome;
      
      case 'notifications':
        return this.browserInfo.isEdge || this.browserInfo.isChrome;
      
      case 'scripting':
        return this.browserInfo.isEdge || this.browserInfo.isChrome;
      
      case 'storage':
        return this.browserInfo.isEdge || this.browserInfo.isChrome;
      
      case 'commands':
        return this.browserInfo.isEdge || this.browserInfo.isChrome;
      
      default:
        return false;
    }
  }

  /**
   * Gets browser-specific limitations
   * @returns {Object} Object describing browser limitations
   */
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
    
    return {
      maxDownloadPathLength: 200,
      maxPathDepth: 3,
      stricterPathValidation: true,
      notificationStylingLimited: true,
      downloadPathRestrictions: true
    };
  }

  /**
   * Applies browser-specific fixes or configurations
   * @param {string} context - Context where fixes are being applied
   * @returns {Object} Browser-specific configuration
   */
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

    return config;
  }

  /**
   * Logs browser information for debugging
   */
  logBrowserInfo() {
    const info = this.getBrowserInfo();
    console.log('=== Browser Detection Results ===');
    console.log(`Browser: ${info.name} ${info.version}`);
    console.log(`Major Version: ${info.majorVersion}`);
    console.log(`Engine: ${info.engine}`);
    console.log(`User Agent: ${info.userAgent}`);
    console.log(`Is Edge: ${info.isEdge}`);
    console.log(`Is Chrome: ${info.isChrome}`);
    console.log('=== End Browser Detection ===');
  }
}

// Create a singleton instance for global use
const browserDetector = new BrowserDetector();

// Export both the class and singleton instance
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

// Legacy compatibility functions
const isEdgeBrowser = () => browserDetector.isEdge();
const isChromeBrowser = () => browserDetector.isChrome();
const getBrowserName = () => browserDetector.getBrowserName();

// Export legacy functions for backward compatibility
if (typeof window !== 'undefined') {
  window.isEdgeBrowser = isEdgeBrowser;
  window.isChromeBrowser = isChromeBrowser;
  window.getBrowserName = getBrowserName;
} else if (typeof globalThis !== 'undefined') {
  globalThis.isEdgeBrowser = isEdgeBrowser;
  globalThis.isChromeBrowser = isChromeBrowser;
  globalThis.getBrowserName = getBrowserName;
}