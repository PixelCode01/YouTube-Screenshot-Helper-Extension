chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
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
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({status: 'ok', timestamp: Date.now()});
    return true;
  }
  
  if (message.action === 'downloadScreenshot') {
    let downloadOptions = {
      url: message.dataUrl,
      filename: message.filename || `youtube-screenshot-${Date.now()}.png`,
      saveAs: false
    };
    
    chrome.storage.sync.get(['useCustomPath', 'customDownloadPath', 'silentDownloads'], (result) => {
      let pathParts = [];
      
      if (result.useCustomPath && result.customDownloadPath) {
        const cleanPath = result.customDownloadPath
          .replace(/^[/\\]+/, '')
          .replace(/[/\\]+$/, '')
          .replace(/\\/g, '/');
        
        if (cleanPath) {
          pathParts.push(cleanPath);
        }
      }
      
      if (message.folderPath) {
        const normalizedFolderPath = message.folderPath
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/\/+$/, '');
        
        if (normalizedFolderPath) {
          pathParts.push(normalizedFolderPath);
        }
      }
      
      pathParts.push(downloadOptions.filename);
      downloadOptions.filename = pathParts.join('/');
      downloadOptions.conflictAction = 'uniquify';

      const silentDownloadsEnabled = typeof message.silentDownloads === 'boolean'
        ? message.silentDownloads
        : !!result.silentDownloads;

      const restoreActions = [];
      const scheduleRestore = (() => {
        let scheduled = false;
        return () => {
          if (scheduled || restoreActions.length === 0) return;
          scheduled = true;
          setTimeout(() => {
            restoreActions.forEach(action => {
              try { action(); }
              catch (err) { console.warn('Restore error:', err); }
            });
          }, 1500);
        };
      })();

      if (silentDownloadsEnabled) {
        if (chrome.downloads && typeof chrome.downloads.setShelfEnabled === 'function') {
          try {
            chrome.downloads.setShelfEnabled(false, () => {
              if (chrome.runtime.lastError) {
                // Silently ignore permission errors for downloads.shelf
                return;
              }
              restoreActions.push(() => {
                try { 
                  chrome.downloads.setShelfEnabled(true, () => {
                    if (chrome.runtime.lastError) {
                      // Silently ignore
                    }
                  });
                }
                catch (err) { console.warn('Shelf restore error:', err); }
              });
            });
          } catch (err) {
            console.warn('Shelf disable error:', err);
          }
        }

        if (chrome.downloads && typeof chrome.downloads.setUiOptions === 'function') {
          try {
            chrome.downloads.setUiOptions({ enabled: false }, () => {
              if (chrome.runtime.lastError) {
                console.warn('UI disable error:', chrome.runtime.lastError);
              }
            });
            restoreActions.push(() => {
              chrome.downloads.setUiOptions({ enabled: true }, () => {
                if (chrome.runtime.lastError) {
                  console.warn('UI restore error:', chrome.runtime.lastError);
                }
              });
            });
          } catch (err) {
            console.warn('UI options error:', err);
          }
        }
      }
      
      // Firefox-specific: Convert data URL to blob URL for better compatibility
      const isFirefox = typeof InstallTrigger !== 'undefined' || navigator.userAgent.includes('Firefox');
      
      if (isFirefox && downloadOptions.url.startsWith('data:')) {
        try {
          // Convert data URL to blob for Firefox
          fetch(downloadOptions.url)
            .then(res => res.blob())
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              downloadOptions.url = blobUrl;
              
              chrome.downloads.download(downloadOptions, (downloadId) => {
                // Clean up blob URL after download starts
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                
                if (chrome.runtime.lastError) {
                  scheduleRestore();
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                  scheduleRestore();
                  sendResponse({ success: true, downloadId });
                }
              });
            })
            .catch(error => {
              console.error('Blob conversion error:', error);
              sendResponse({ success: false, error: error.message });
            });
        } catch (error) {
          console.error('Data URL conversion error:', error);
          sendResponse({ success: false, error: error.message });
        }
      } else {
        chrome.downloads.download(downloadOptions, (downloadId) => {
          if (chrome.runtime.lastError) {
            scheduleRestore();
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            scheduleRestore();
            sendResponse({ success: true, downloadId });
          }
        });
      }
    });
    
    return true;
  }
  
  if (message.action === 'getSettings') {
    chrome.storage.sync.get(null, (settings) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse(settings);
      }
    });
    return true;
  }

  sendResponse({ success: false, error: 'Unknown action: ' + message.action });
  return true;
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'capture-screenshot') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'captureScreenshot',
      source: 'shortcut'
    });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const result = await chrome.storage.sync.get(['enabledSites']);
      
      // Add null check for result
      if (!result) {
        console.warn('Storage result is undefined, using defaults');
        return;
      }
      
      const enabledSites = result.enabledSites || ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      
      const builtInSites = ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const isBuiltInSite = builtInSites.some(site => url.hostname.includes(site));
      const isEnabledCustomSite = enabledSites.some(site => 
        url.hostname.includes(site) && !builtInSites.includes(site)
      );
      
      // For Firefox Manifest V2, content scripts are automatically injected via manifest
      // We don't need to manually inject them
      if (isEnabledCustomSite) {
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
          // Content script not ready yet, it will be injected by the manifest
          console.log('Content script not ready for custom site:', error);
        }
      }
    } catch (error) {
      console.error('Content script injection error:', error);
    }
  }
});

// Firefox Manifest V2 uses browserAction, not action
// Check if browserAction exists (Firefox) or use action (Chrome MV3)
const browserActionAPI = chrome.browserAction || chrome.action;

if (browserActionAPI && browserActionAPI.onClicked) {
  browserActionAPI.onClicked.addListener(async (tab) => {
    if (tab.url) {
      try {
        const result = await chrome.storage.sync.get(['enabledSites']);
        
        // Add null check for result
        if (!result) {
          console.warn('Storage result is undefined, using defaults');
          return;
        }
        
        const enabledSites = result.enabledSites || ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
        const url = new URL(tab.url);
        
        const isEnabledSite = enabledSites.some(site => url.hostname.includes(site));
        
        if (isEnabledSite) {
          try {
            await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
          } catch (error) {
            // Content script not ready yet
            console.log('Content script not ready:', error);
          }
        }
      } catch (error) {
        console.error('Extension click error:', error);
      }
    }
  });
} else {
  console.warn('Browser action API not available - extension icon click may not work');
}
