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
              try {
                action();
              } catch (err) {
                console.warn('Restore error:', err);
              }
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
                } catch (err) {
                  console.warn('Shelf restore error:', err);
                }
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
      
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          scheduleRestore();
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          scheduleRestore();
          sendResponse({ success: true, downloadId });
        }
      });
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
      const enabledSites = result.enabledSites || ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      
      const builtInSites = ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const isBuiltInSite = builtInSites.some(site => url.hostname.includes(site));
      const isEnabledCustomSite = enabledSites.some(site => 
        url.hostname.includes(site) && !builtInSites.includes(site)
      );
      
      if (isEnabledCustomSite) {
        try {
          await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
          await injectContentScripts(tabId);
        }
      }
    } catch (error) {
      console.error('Content script injection error:', error);
    }
  }
});

async function injectContentScripts(tabId) {
  try {
    const scripts = [
      'utils/storage.js',
      'utils/keyHandler.js',
      'utils/cloudConfig.js',
      'utils/cloudStorage.js',
      'utils/screenshot.js',
      'content/content.js',
      'content/youtube.js'
    ];
    
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['styles/content.css']
    });
    
    for (const script of scripts) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [script]
      });
    }
  } catch (error) {
    console.error('Script injection failed:', error);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
    try {
      const result = await chrome.storage.sync.get(['enabledSites']);
      const enabledSites = result.enabledSites || ['youtube.com', 'youtube-nocookie.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      
      const isEnabledSite = enabledSites.some(site => url.hostname.includes(site));
      
      if (isEnabledSite) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        } catch (error) {
          await injectContentScripts(tab.id);
        }
      }
    } catch (error) {
      console.error('Extension click error:', error);
    }
  }
});
