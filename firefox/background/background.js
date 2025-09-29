const extensionApi = (() => {
  if (typeof browser !== 'undefined') {
    return browser;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.browser !== 'undefined') {
    return globalThis.browser;
  }
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  return null;
})();

if (!extensionApi) {
  console.error('YouTube Screenshot Helper: No extension API detected in background script. Core features will fail.');
} else if (typeof browser === 'undefined') {
  try {
    globalThis.browser = extensionApi;
  } catch (assignmentError) {
    console.warn('YouTube Screenshot Helper: Unable to assign browser global alias:', assignmentError);
  }
}

const detector = (() => {
  if (typeof browserDetector !== 'undefined') {
    return browserDetector;
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.browserDetector !== 'undefined') {
    return globalThis.browserDetector;
  }
  if (typeof BrowserDetector !== 'undefined') {
    try {
      return new BrowserDetector();
    } catch (detectorError) {
      console.warn('YouTube Screenshot Helper: Unable to instantiate BrowserDetector fallback:', detectorError);
    }
  }
  return {
    isEdge: () => false,
    isFirefox: () => false,
    getBrowserName: () => 'Unknown',
    logBrowserInfo: () => {
      console.log('BrowserDetector fallback: Browser information unavailable.');
    }
  };
})();

const errorHandler = new ErrorHandler('background');
const browserName = typeof detector.getBrowserName === 'function' ? detector.getBrowserName() : 'Unknown';
// Use detector methods directly to avoid redeclaration conflicts with browserDetector.js globals
const isEdge = typeof detector.isEdge === 'function' ? detector.isEdge() : false;
const isFirefox = typeof detector.isFirefox === 'function' ? detector.isFirefox() : false;
const actionApi = (() => {
  if (typeof browser !== 'undefined') {
    if (browser.action) {
      return browser.action;
    }
    if (browser.browserAction) {
      return browser.browserAction;
    }
  }
  if (typeof chrome !== 'undefined') {
    if (chrome.action) {
      return chrome.action;
    }
    if (chrome.browserAction) {
      return chrome.browserAction;
    }
  }
  return null;
})();


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




if (typeof detector.logBrowserInfo === 'function') {
  detector.logBrowserInfo();
}

console.log(`YouTube Screenshot Helper: Background script loaded (${browserName} detected)`);

// Debug extension icon and popup setup
try {
  const manifest = browser.runtime.getManifest();
  console.log('[Background] Manifest popup config:', {
    browser_action: manifest.browser_action,
    default_popup: manifest.browser_action?.default_popup,
    default_icon: manifest.browser_action?.default_icon
  });
  
  // Check if popup file exists
  const popupPath = manifest.browser_action?.default_popup;
  if (popupPath) {
    const popupUrl = browser.runtime.getURL(popupPath);
    console.log('[Background] Popup URL resolved to:', popupUrl);
  }
} catch (manifestError) {
  console.error('[Background] Failed to check manifest configuration:', manifestError);
}

if (isEdge) {
  console.warn('YouTube Screenshot Helper: Folder organization is not supported in Microsoft Edge due to browser security restrictions. Screenshots will be saved to your Downloads folder with descriptive filenames.');
}

if (isFirefox) {
  console.warn('YouTube Screenshot Helper: OAuth-based cloud uploads are limited in Firefox because the browser.identity API is not yet available. Basic screenshot features remain fully supported.');
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
      case 'popup:lifecycle-event': {
        console.log('[Background] Popup lifecycle event:', {
          stage: message.stage,
          timestamp: message.timestamp,
          href: message.href,
          senderFrameId: sender.frameId,
          senderUrl: sender.url
        });
        return;
      }

      case 'ping':
        return Promise.resolve({ 
          status: 'ok', 
          timestamp: Date.now(),
          browser: typeof detector.getBrowserName === 'function' ? detector.getBrowserName() : 'Unknown'
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
                  console.warn(`Error restoring download UI (${browserName}):`, restoreError);
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
              console.log(`Download shelf disabled for silent screenshot download (${browserName})`);
              restoreActions.push(() => {
                try {
                nativeDownloadsApi.setShelfEnabled(true);
                console.log(`Download shelf restored after silent screenshot download (${browserName})`);
                } catch (restoreError) {
                  console.warn(`Failed to restore download shelf (${browserName}):`, restoreError);
                }
              });
            } catch (shelfError) {
              console.warn(`Unable to disable download shelf (${browserName}):`, shelfError);
            }
          } else {
            console.log(`setShelfEnabled API not available; shelf may remain visible (${browserName})`);
          }

          if (nativeDownloadsApi && typeof nativeDownloadsApi.setUiOptions === 'function') {
            try {
              nativeDownloadsApi.setUiOptions({ enabled: false }, () => {
                if (runtimeApi && runtimeApi.lastError) {
                  console.warn(`setUiOptions disable failed (${browserName}):`, runtimeApi.lastError);
                } else {
                  console.log(`Download UI disabled via setUiOptions for silent mode (${browserName})`);
                }
              });
              restoreActions.push(() => {
                nativeDownloadsApi.setUiOptions({ enabled: true }, () => {
                  if (runtimeApi && runtimeApi.lastError) {
                    console.warn(`Failed to re-enable download UI (${browserName}):`, runtimeApi.lastError);
                  } else {
                    console.log(`Download UI re-enabled after silent screenshot download (${browserName})`);
                  }
                });
              });
            } catch (uiError) {
              console.warn(`Unable to adjust download UI options (${browserName}):`, uiError);
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


          const isEdgeForDownload = isEdge;
          let downloadOptions = {
            url: message.dataUrl,
            filename: pathResult.path,
            saveAs: false,
            conflictAction: 'uniquify'
          };
          

          if (isEdgeForDownload && message.folderPath) {
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

    const hasScriptingApi = typeof browser.scripting !== 'undefined';

    if (hasScriptingApi && typeof browser.scripting.insertCSS === 'function') {
      await browser.scripting.insertCSS({
        target: { tabId },
        files: ['styles/content.css']
      });
    } else if (typeof browser.tabs.insertCSS === 'function') {
      await browser.tabs.insertCSS(tabId, {
        file: 'styles/content.css',
        matchAboutBlank: true
      });
    }

    for (const script of scripts) {
      if (hasScriptingApi && typeof browser.scripting.executeScript === 'function') {
        await browser.scripting.executeScript({
          target: { tabId },
          files: [script]
        });
      } else if (typeof browser.tabs.executeScript === 'function') {
        await browser.tabs.executeScript(tabId, {
          file: script,
          matchAboutBlank: true
        });
      }
    }
    
    console.log('Successfully injected content scripts into tab:', tabId);
  } catch (error) {
    console.error('Failed to inject content scripts:', error);
  }
}
if (actionApi && actionApi.onClicked && typeof actionApi.onClicked.addListener === 'function') {
  actionApi.onClicked.addListener(async (tab) => {
    console.log('[Background] Extension icon clicked - tab:', tab.id, tab.url);
    
    // Check if popup should be displayed
    const manifest = browser.runtime.getManifest();
    const hasPopup = manifest.browser_action && manifest.browser_action.default_popup;
    console.log('[Background] Extension has popup configured:', hasPopup, manifest.browser_action?.default_popup);
    
    if (hasPopup) {
      console.warn('[Background] Popup is configured but onClicked fired - this suggests popup failed to load');
      // Try to manually open popup as fallback
      try {
        const popupUrl = browser.runtime.getURL(manifest.browser_action.default_popup);
        console.log('[Background] Attempting to open popup manually at:', popupUrl);
        await browser.windows.create({
          url: popupUrl,
          type: 'popup',
          width: 400,
          height: 600
        });
      } catch (popupError) {
        console.error('[Background] Failed to manually open popup:', popupError);
      }
    }
    
    if (tab.url) {
      try {

        const result = await browser.storage.sync.get(['enabledSites']);
  const enabledSites = result.enabledSites || ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
        const url = new URL(tab.url);
        
        const isEnabledSite = enabledSites.some(site => url.hostname.includes(site));
        console.log('[Background] Site check - current:', url.hostname, 'enabled:', isEnabledSite);
        
        if (isEnabledSite) {

          try {
            await browser.tabs.sendMessage(tab.id, { action: 'ping' });
            console.log('[Background] Content script already active');
          } catch (error) {

            console.log('[Background] Injecting content script via extension click:', url.hostname);
            await injectContentScripts(tab.id);
          }
        }
      } catch (error) {
        console.error('[Background] Error handling extension click:', error);
      }
    }
  });
  console.log('[Background] Browser action click listener registered successfully');
} else {
  console.warn('[Background] Browser action API is not available - actionApi:', !!actionApi, 'onClicked:', !!actionApi?.onClicked);
}

if (browser?.browserAction?.setPopup) {
  try {
    browser.browserAction.setPopup({ popup: 'popup/popup.html' });
    console.log('[Background] Default popup path enforced programmatically');
  } catch (popupSetError) {
    console.error('[Background] Failed to set default popup path:', popupSetError);
  }
}