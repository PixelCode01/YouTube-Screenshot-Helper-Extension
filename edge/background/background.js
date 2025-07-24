// Import browser polyfill first
importScripts('../browser-polyfill.js');

// Import utility scripts in order
importScripts('../utils/commonErrorPatterns.js');
importScripts('../utils/browserDetector.js');
importScripts('../utils/pathNormalizer.js');
importScripts('../utils/errorHandler.js');

// Initialize global error handler for background script
const errorHandler = new ErrorHandler('background');

// --- Service Worker Keep-Alive --- //
const KEEP_ALIVE_ALARM = 'youtube-screenshot-helper-keep-alive';

// The alarm listener can be empty. Its existence is what keeps the service worker alive.
browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === KEEP_ALIVE_ALARM) {
    // console.log('Keep-alive alarm fired.');
  }
});

// Create the alarm when the extension is installed, updated, or the browser starts.
// This ensures the alarm is always set.
browser.runtime.onStartup.addListener(() => {
  console.log('Browser startup: Setting keep-alive alarm.');
  createKeepAliveAlarm();
});

browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason, 'Setting keep-alive alarm.');
  createKeepAliveAlarm();
});

async function createKeepAliveAlarm() {
  return errorHandler.handleAsyncOperation(async () => {
    const alarm = await browser.alarms.get(KEEP_ALIVE_ALARM);
    if (!alarm) {
      await browser.alarms.create(KEEP_ALIVE_ALARM, {
        periodInMinutes: 0.5 // Fire every 30 seconds
      });
      console.log('Keep-alive alarm created.');
    }
    return { success: true };
  }, 'createKeepAliveAlarm');
}

// Background service worker for YouTube Screenshot Helper

// Log browser detection results
browserDetector.logBrowserInfo();

console.log(`YouTube Screenshot Helper: Background script loaded (${browserDetector.getBrowserName()} detected)`);

// Edge-specific folder organization warning
if (browserDetector.isEdge()) {
  console.warn('📁 YouTube Screenshot Helper: Folder organization is not supported in Microsoft Edge due to browser security restrictions. Screenshots will be saved to your Downloads folder with descriptive filenames.');
}

// Edge-specific error handling is now integrated into the ErrorHandler class

// Handle extension installation
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('YouTube Screenshot Helper installed');
    
    // Set default settings
    browser.storage.sync.set({
      enabledSites: ['youtube.com', 'vimeo.com', 'twitch.tv'],
      fullscreenShortcut: 'shift+enter', // Default to Shift+Enter
      fullscreenOnly: false,
      autoHideControls: true,
      uploadToCloud: false,
      annotationMode: false,
      cloudService: 'none',
      screenshotQuality: 0.9,
      filenameTemplate: '', // Empty means use title builder
      debugMode: false,
      showNotifications: true,
      captureDelay: 100,
      preventDefault: true,
      // Theme settings
      themePreference: 'auto',
      // Title builder settings
      includeYoutube: true,
      includeVideoTitle: true,
      includeChannelName: false,
      includePlaylistName: false,
      includeChapter: false,
      includeTimestamp: true,
      includeDate: true,
      includeTime: false,
      titleSeparator: ' - ',
      // Folder organization settings
      organizeFolders: 'none',
      customFolderPattern: '{channel}/{date}',
      // Download path settings
      customDownloadPath: '',
      useCustomPath: false,
      // Fullscreen popup settings
      showFullscreenPopup: false,
      fullscreenPopupDuration: 3000,
      // Screenshot preview settings
      disablePreviewByDefault: false
    });
    
    // Open options page on first install
    console.log('Opening options page after installation...');
    // Add a small delay to ensure extension is fully loaded
    setTimeout(async () => {
      try {
        await browser.runtime.openOptionsPage();
        console.log('Options page opened successfully');
      } catch (error) {
      console.error('Failed to open options page:', error);
      // Fallback: try opening in a new tab
      try {
        await browser.tabs.create({ url: browser.runtime.getURL('options/options.html') });
        console.log('Options page opened in new tab as fallback');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // Show notification as last resort
        if (browser.notifications) {
          browser.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'YouTube Screenshot Helper',
            message: 'Extension installed! Click the extension icon to access settings.'
          });
        }
      }
    }, 1000); // Wait 1 second before trying to open options
  }
});

// Handle messages from content scripts and extension pages
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log('Background: Received message:', message.action, 'from tab:', sender.tab?.id);

  try {
    switch (message.action) {
      case 'ping':
        return Promise.resolve({ 
          status: 'ok', 
          timestamp: Date.now(),
          browser: browserDetector.getBrowserName()
        });

      case 'downloadScreenshot':
        return errorHandler.handleAsyncOperation(async () => {
          console.log('=== BACKGROUND SCRIPT: DOWNLOAD DEBUG START ===');
          console.log('Download request received:', { filename: message.filename, folderPath: message.folderPath });
          console.log('DataURL length:', message.dataUrl ? message.dataUrl.length : 'null');
          console.log('DataURL preview:', message.dataUrl ? message.dataUrl.substring(0, 100) + '...' : 'null');

          // Check if downloads API is available
          if (!browser.downloads) {
            throw new Error('browser.downloads API is not available');
          }
          console.log('✓ browser.downloads API is available');

          const result = await browser.storage.sync.get(['useCustomPath', 'customDownloadPath']);
          console.log('Storage result:', result);

          // Use PathNormalizer for consistent path handling
          const pathNormalizer = new PathNormalizer();
          const pathResult = pathNormalizer.normalizePath(
            message.filename || `youtube-screenshot-${Date.now()}.png`,
            message.folderPath,
            result.useCustomPath ? result.customDownloadPath : ''
          );

          console.log('Path normalization result:', pathResult);

          // Edge-specific folder handling attempt
          const isEdge = navigator.userAgent.includes('Edg/');
          let downloadOptions = {
            url: message.dataUrl,
            filename: pathResult.path,
            saveAs: false, // Always save directly to Downloads in Edge
            conflictAction: 'uniquify'
          };
          
          // Try alternative path formats for Edge
          if (isEdge && message.folderPath) {
            console.log('Edge detected - trying alternative folder path formats...');
            
            // Try with backslashes (Windows-style)
            const windowsPath = pathResult.path.replace(/\//g, '\\');
            console.log('Trying Windows-style path:', windowsPath);
            
            // Try with suggested downloads directory
            try {
              const suggestedPath = message.folderPath.replace(/\//g, '\\') + '\\' + message.filename;
              console.log('Trying suggested path:', suggestedPath);
              downloadOptions.filename = suggestedPath;
            } catch (e) {
              console.log('Suggested path failed, using normalized path');
            }
          }

          console.log(`Final constructed filename for download: "${downloadOptions.filename}"`);
          console.log('Download options:', {
            url: downloadOptions.url ? `${downloadOptions.url.substring(0, 50)}...` : 'null',
            filename: downloadOptions.filename,
            saveAs: downloadOptions.saveAs,
            conflictAction: downloadOptions.conflictAction
          });
          
          console.log('Calling browser.downloads.download...');
          const downloadId = await browser.downloads.download(downloadOptions);

          console.log('=== DOWNLOAD SUCCESS ===');
          console.log('Screenshot downloaded with ID:', downloadId);
          
          // Check the actual download info to see where it was saved
          setTimeout(async () => {
            try {
              const downloadInfo = await browser.downloads.search({ id: downloadId });
              if (downloadInfo && downloadInfo.length > 0) {
                console.log('=== ACTUAL DOWNLOAD LOCATION ===');
                console.log('Requested filename:', downloadOptions.filename);
                console.log('Actual filename:', downloadInfo[0].filename);
                console.log('Full path:', downloadInfo[0].filename);
                console.log('=== END DOWNLOAD LOCATION ===');
              }
            } catch (error) {
              console.log('Could not retrieve download info:', error);
            }
          }, 1000);
          
          console.log('=== BACKGROUND SCRIPT: DOWNLOAD DEBUG END ===');
          
          return { 
            success: true, 
            downloadId,
            pathInfo: pathResult,
            debug: true
          };
        }, 'downloadScreenshot', async (errorInfo) => {
          // If this is a path-related error, try with a fallback path
          if (errorInfo.message.includes('filename') || errorInfo.message.includes('path') || 
              errorInfo.message.includes('Invalid filename')) {
            console.log('Path-related error detected, attempting fallback download...');
            
            const pathNormalizer = new PathNormalizer();
            const fallbackResult = pathNormalizer.createFallbackPath(message.filename);
            
            try {
              const downloadId = await browser.downloads.download({
                url: message.dataUrl,
                filename: fallbackResult.path,
                saveAs: false
              });
              
              return { 
                success: true, 
                downloadId,
                pathInfo: fallbackResult,
                note: 'Used fallback filename due to path restrictions'
              };
            } catch (fallbackError) {
              console.error('Fallback download also failed:', fallbackError);
              return { success: false, error: fallbackError.message };
            }
          }
          return { success: false, error: errorInfo.message };
        });

      case 'getSettings':
        return errorHandler.handleAsyncOperation(async () => {
          const settings = await browser.storage.sync.get(null);
          return settings;
        }, 'getSettings');

      case 'setSetting':
        return errorHandler.handleAsyncOperation(async () => {
          await browser.storage.sync.set({ [message.key]: message.value });
          return { success: true };
        }, 'setSetting');

      case 'setSettings':
        return errorHandler.handleAsyncOperation(async () => {
          await browser.storage.sync.set(message.settings);
          return { success: true };
        }, 'setSettings');

      default:
        console.warn('Background: Unknown message action:', message.action);
        return errorHandler.createErrorResponse('Unknown action: ' + message.action, 'UNKNOWN_ACTION');
    }
  } catch (unexpectedError) {
    // Global error handler for any unexpected errors in message processing
    const errorInfo = errorHandler.handleError(unexpectedError, 'message processing');
    return { 
      success: false, 
      error: errorInfo.message,
      browser: errorInfo.browser
    };
  }
});

// Background script Imgur upload function removed - Imgur service no longer supported

// Handle keyboard shortcuts
browser.commands.onCommand.addListener((command, tab) => {
  if (command === 'capture-screenshot') {
    // Send message to content script
    browser.tabs.sendMessage(tab.id, {
      action: 'captureScreenshot',
      source: 'shortcut'
    });
  }
});

// Handle tab updates to inject content scripts if needed
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Check if we should inject into this tab
      const result = await browser.storage.sync.get(['enabledSites']);
      const enabledSites = result.enabledSites || ['youtube.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      
      // Check if this is a custom site (not a built-in site)
      const builtInSites = ['youtube.com', 'vimeo.com', 'twitch.tv'];
      const isBuiltInSite = builtInSites.some(site => url.hostname.includes(site));
      const isEnabledCustomSite = enabledSites.some(site => 
        url.hostname.includes(site) && !builtInSites.includes(site)
      );
      
      if (isEnabledCustomSite) {
        // This is a custom site, check if content script is already loaded
        try {
          const response = await browser.tabs.sendMessage(tabId, { action: 'ping' });
          console.log('Content script already active on custom site:', url.hostname);
        } catch (error) {
          // Content script not loaded, inject it
          console.log('Injecting content script into custom site:', url.hostname);
          await injectContentScripts(tabId);
        }
      }
    } catch (error) {
      console.error('Error checking/injecting content script:', error);
    }
  }
});

// Function to inject content scripts programmatically
async function injectContentScripts(tabId) {
  try {
    // Inject scripts in the correct order
    const scripts = [
      'browser-polyfill.js',
      'utils/storage.js',
      'utils/keyHandler.js',
      'utils/cloudConfig.js',
      'utils/cloudStorage.js',
      'utils/screenshot.js',
      'content/content.js',
      'content/youtube.js'
    ];
    
    // Inject CSS first
    await browser.scripting.insertCSS({
      target: { tabId },
      files: ['styles/content.css']
    });
    
    // Inject JavaScript files
    for (const script of scripts) {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [script]
      });
    }
    
    console.log('Successfully injected content scripts into tab:', tabId);
  } catch (error) {
    console.error('Failed to inject content scripts:', error);
  }
}

// Handle extension icon clicks for custom sites
browser.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
    try {
      // Check if this might be a custom site that needs script injection
      const result = await browser.storage.sync.get(['enabledSites']);
      const enabledSites = result.enabledSites || ['youtube.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      
      const isEnabledSite = enabledSites.some(site => url.hostname.includes(site));
      
      if (isEnabledSite) {
        // Try to ping content script
        try {
          await browser.tabs.sendMessage(tab.id, { action: 'ping' });
        } catch (error) {
          // Content script not loaded, inject it
          console.log('Injecting content script via extension click:', url.hostname);
          await injectContentScripts(tab.id);
        }
      }
    } catch (error) {
      console.error('Error handling extension click:', error);
    }
  }
});