
importScripts('../browser-polyfill.js');


importScripts('../utils/commonErrorPatterns.js');
importScripts('../utils/browserDetector.js');
importScripts('../utils/pathNormalizer.js');
importScripts('../utils/errorHandler.js');


const errorHandler = new ErrorHandler('background');


const KEEP_ALIVE_ALARM = 'youtube-screenshot-helper-keep-alive';


browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === KEEP_ALIVE_ALARM) {

  }
});



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
  periodInMinutes: 0.5
      });
      console.log('Keep-alive alarm created.');
    }
    return { success: true };
  }, 'createKeepAliveAlarm');
}




browserDetector.logBrowserInfo();

console.log(`YouTube Screenshot Helper: Background script loaded (${browserDetector.getBrowserName()} detected)`);


if (browserDetector.isEdge()) {
  console.warn('YouTube Screenshot Helper: Folder organization is not supported in Microsoft Edge due to browser security restrictions. Screenshots will be saved to your Downloads folder with descriptive filenames.');
}




browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('YouTube Screenshot Helper installed');
    

    browser.storage.sync.set({
      enabledSites: ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'],
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

      customDownloadPath: '',
      useCustomPath: false,

  silentDownloads: false,

      showFullscreenPopup: false,
      fullscreenPopupDuration: 3000,

      disablePreviewByDefault: false
    });
    

    console.log('Opening options page after installation...');

    setTimeout(async () => {
      try {
        await browser.runtime.openOptionsPage();
        console.log('Options page opened successfully');
      } catch (error) {
        console.error('Failed to open options page:', error);

        try {
          await browser.tabs.create({ url: browser.runtime.getURL('options/options.html') });
          console.log('Options page opened in new tab as fallback');
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);

          if (browser.notifications) {
            browser.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'YouTube Screenshot Helper',
              message: 'Extension installed! Click the extension icon to access settings.'
            });
          }
        }
      }
  }, 1000);
  }
});


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

      case 'downloadScreenshot': {
        const storageResult = await browser.storage.sync.get(['useCustomPath', 'customDownloadPath', 'silentDownloads']);
        console.log('Storage result:', storageResult);

        const silentDownloadsEnabled = typeof message.silentDownloads === 'boolean'
          ? message.silentDownloads
          : !!storageResult.silentDownloads;
        console.log('Silent downloads enabled for this request:', silentDownloadsEnabled);

        const restoreActions = [];
        let silentUiDisabled = false;

        const scheduleRestore = (() => {
          let scheduled = false;
          return () => {
            if (scheduled || restoreActions.length === 0) {
              return;
            }
            scheduled = true;
            setTimeout(() => {
              restoreActions.forEach(action => {
                try {
                  action();
                } catch (restoreError) {
                  console.warn('Error restoring download UI (Edge):', restoreError);
                }
              });
              restoreActions.length = 0;
              silentUiDisabled = false;
            }, 1500);
          };
        })();

        const nativeDownloadsApi = (typeof chrome !== 'undefined' && chrome.downloads)
          ? chrome.downloads
          : (browser.downloads || null);
        const runtimeApi = (typeof chrome !== 'undefined' && chrome.runtime)
          ? chrome.runtime
          : (typeof browser !== 'undefined' ? browser.runtime : null);

        const prepareSilentMode = () => {
          if (!silentDownloadsEnabled || silentUiDisabled) {
            return;
          }
          silentUiDisabled = true;

          if (nativeDownloadsApi && typeof nativeDownloadsApi.setShelfEnabled === 'function') {
            try {
              nativeDownloadsApi.setShelfEnabled(false);
              console.log('Download shelf disabled for silent screenshot download (Edge)');
              restoreActions.push(() => {
                try {
                  nativeDownloadsApi.setShelfEnabled(true);
                  console.log('Download shelf restored after silent screenshot download (Edge)');
                } catch (restoreError) {
                  console.warn('Failed to restore download shelf (Edge):', restoreError);
                }
              });
            } catch (shelfError) {
              console.warn('Unable to disable download shelf (Edge):', shelfError);
            }
          } else {
            console.log('setShelfEnabled API not available; shelf may remain visible (Edge)');
          }

          if (nativeDownloadsApi && typeof nativeDownloadsApi.setUiOptions === 'function') {
            try {
              nativeDownloadsApi.setUiOptions({ enabled: false }, () => {
                if (runtimeApi && runtimeApi.lastError) {
                  console.warn('setUiOptions disable failed (Edge):', runtimeApi.lastError);
                } else {
                  console.log('Download UI disabled via setUiOptions for silent mode (Edge)');
                }
              });
              restoreActions.push(() => {
                nativeDownloadsApi.setUiOptions({ enabled: true }, () => {
                  if (runtimeApi && runtimeApi.lastError) {
                    console.warn('Failed to re-enable download UI (Edge):', runtimeApi.lastError);
                  } else {
                    console.log('Download UI re-enabled after silent screenshot download (Edge)');
                  }
                });
              });
            } catch (uiError) {
              console.warn('Unable to adjust download UI options (Edge):', uiError);
            }
          }
        };

        return errorHandler.handleAsyncOperation(async () => {
          console.log('=== BACKGROUND SCRIPT: DOWNLOAD DEBUG START ===');
          console.log('Download request received:', { filename: message.filename, folderPath: message.folderPath });
          console.log('DataURL length:', message.dataUrl ? message.dataUrl.length : 'null');
          console.log('DataURL preview:', message.dataUrl ? message.dataUrl.substring(0, 100) + '...' : 'null');


          if (!browser.downloads) {
            throw new Error('browser.downloads API is not available');
          }
          console.log('browser.downloads API is available');


          const pathNormalizer = new PathNormalizer();
          const pathResult = pathNormalizer.normalizePath(
            message.filename || `youtube-screenshot-${Date.now()}.png`,
            message.folderPath,
            storageResult.useCustomPath ? storageResult.customDownloadPath : ''
          );

          console.log('Path normalization result:', pathResult);


          const isEdge = navigator.userAgent.includes('Edg/');
          let downloadOptions = {
            url: message.dataUrl,
            filename: pathResult.path,
            saveAs: false,
            conflictAction: 'uniquify'
          };
          

          if (isEdge && message.folderPath) {
            console.log('Edge detected - trying alternative folder path formats...');
            

            const windowsPath = pathResult.path.replace(/\//g, '\\');
            console.log('Trying Windows-style path:', windowsPath);
            

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

          prepareSilentMode();

          let downloadId;
          try {
            console.log('Calling browser.downloads.download...');
            downloadId = await browser.downloads.download(downloadOptions);
          } catch (downloadError) {
            scheduleRestore();
            throw downloadError;
          }

          console.log('=== DOWNLOAD SUCCESS ===');
          console.log('Screenshot downloaded with ID:', downloadId);

          scheduleRestore();
          

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

          if (errorInfo.message.includes('filename') || errorInfo.message.includes('path') || 
              errorInfo.message.includes('Invalid filename')) {
            console.log('Path-related error detected, attempting fallback download...');
            
            const pathNormalizer = new PathNormalizer();
            const fallbackResult = pathNormalizer.createFallbackPath(message.filename);
            
            try {
              prepareSilentMode();
              const downloadId = await browser.downloads.download({
                url: message.dataUrl,
                filename: fallbackResult.path,
                saveAs: false
              });
              
              scheduleRestore();
              
              return { 
                success: true, 
                downloadId,
                pathInfo: fallbackResult,
                note: 'Used fallback filename due to path restrictions'
              };
            } catch (fallbackError) {
              scheduleRestore();
              console.error('Fallback download also failed:', fallbackError);
              return { success: false, error: fallbackError.message };
            }
          }

          scheduleRestore();
          return { success: false, error: errorInfo.message };
        });
      }

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

    const errorInfo = errorHandler.handleError(unexpectedError, 'message processing');
    return { 
      success: false, 
      error: errorInfo.message,
      browser: errorInfo.browser
    };
  }
});




browser.commands.onCommand.addListener((command, tab) => {
  if (command === 'capture-screenshot') {

    browser.tabs.sendMessage(tab.id, {
      action: 'captureScreenshot',
      source: 'shortcut'
    });
  }
});


browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {

  const result = await browser.storage.sync.get(['enabledSites']);
  const enabledSites = result.enabledSites || ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      

  const builtInSites = ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const isBuiltInSite = builtInSites.some(site => url.hostname.includes(site));
      const isEnabledCustomSite = enabledSites.some(site => 
        url.hostname.includes(site) && !builtInSites.includes(site)
      );
      
      if (isEnabledCustomSite) {

        try {
          const response = await browser.tabs.sendMessage(tabId, { action: 'ping' });
          console.log('Content script already active on custom site:', url.hostname);
        } catch (error) {

          console.log('Injecting content script into custom site:', url.hostname);
          await injectContentScripts(tabId);
        }
      }
    } catch (error) {
      console.error('Error checking/injecting content script:', error);
    }
  }
});


async function injectContentScripts(tabId) {
  try {

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
    

    await browser.scripting.insertCSS({
      target: { tabId },
      files: ['styles/content.css']
    });
    

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


browser.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
    try {

      const result = await browser.storage.sync.get(['enabledSites']);
  const enabledSites = result.enabledSites || ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      
      const isEnabledSite = enabledSites.some(site => url.hostname.includes(site));
      
      if (isEnabledSite) {

        try {
          await browser.tabs.sendMessage(tab.id, { action: 'ping' });
        } catch (error) {

          console.log('Injecting content script via extension click:', url.hostname);
          await injectContentScripts(tab.id);
        }
      }
    } catch (error) {
      console.error('Error handling extension click:', error);
    }
  }
});