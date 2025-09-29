console.log('YouTube Screenshot Helper: Background script loaded');
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('YouTube Screenshot Helper installed');
    
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
  console.log('Background: Received message:', message.action, 'from tab:', sender.tab?.id);
  
  if (message.action === 'ping') {
    sendResponse({status: 'ok', timestamp: Date.now()});
    return true;
  }
  
  if (message.action === 'downloadScreenshot') {
    console.log('=== BACKGROUND SCRIPT: DOWNLOAD DEBUG START ===');
    console.log('Download request received:');
    console.log('- filename:', message.filename);
    console.log('- folderPath:', message.folderPath);
    console.log('- dataUrl length:', message.dataUrl ? message.dataUrl.length : 'null');
    
    let downloadOptions = {
      url: message.dataUrl,
      filename: message.filename || `youtube-screenshot-${Date.now()}.png`,
      saveAs: false
    };
    
    console.log('Initial download options:', downloadOptions);
    
    chrome.storage.sync.get(['useCustomPath', 'customDownloadPath', 'silentDownloads'], (result) => {
  console.log('=== STORAGE RESULT ===');
  console.log('Storage result:', result);
  console.log('useCustomPath:', result.useCustomPath);
  console.log('customDownloadPath:', result.customDownloadPath);
  console.log('silentDownloads (storage):', result.silentDownloads);
      
      console.log('=== SAVE PATH VALIDATION START ===');
  console.log('Analyzing save path configuration:');
  console.log('  - useCustomPath type:', typeof result.useCustomPath);
  console.log('  - useCustomPath value:', result.useCustomPath);
  console.log('  - customDownloadPath type:', typeof result.customDownloadPath);
  console.log('  - customDownloadPath value:', JSON.stringify(result.customDownloadPath));
  console.log('  - customDownloadPath length:', result.customDownloadPath ? result.customDownloadPath.length : 0);
  console.log('  - customDownloadPath empty check:', !result.customDownloadPath);

  console.log('=== IMPROVED PATH HANDLING LOGIC ===');
      
  console.log('=== SIMPLIFIED PATH CONSTRUCTION ===');
      
      let pathParts = [];
      
      if (result.useCustomPath && result.customDownloadPath) {
  console.log('Using custom relative path within the Downloads folder');
  console.log(`Custom path: "${result.customDownloadPath}"`);
        
        const cleanPath = result.customDownloadPath
          .replace(/^[/\\]+/, '')
          .replace(/[/\\]+$/, '')
          .replace(/\\/g, '/');
        
        if (cleanPath) {
          pathParts.push(cleanPath);
          console.log(`Added custom path: "${cleanPath}"`);
        }
      }
      
      if (message.folderPath) {
        const normalizedFolderPath = message.folderPath
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/\/+$/, '');
        
        if (normalizedFolderPath) {
          pathParts.push(normalizedFolderPath);
          console.log(`Added folder organization path: "${normalizedFolderPath}"`);
        }
      }
      
      pathParts.push(downloadOptions.filename);
      
      const finalPath = pathParts.join('/');
      downloadOptions.filename = finalPath;
      
  console.log('=== FINAL PATH RESULT ===');
  console.log(`Path parts: [${pathParts.map(p => `"${p}"`).join(', ')}]`);
  console.log(`Final filename: "${downloadOptions.filename}"`);
  console.log(`Saving to: Downloads/${downloadOptions.filename}`)
      
  downloadOptions.conflictAction = 'uniquify';
      
      console.log('=== FINAL DOWNLOAD OPTIONS ===');
      console.log('Final download options:', downloadOptions);
      console.log('=== SAVE PATH VALIDATION END ===');

      const silentDownloadsEnabled = typeof message.silentDownloads === 'boolean'
        ? message.silentDownloads
        : !!result.silentDownloads;
      console.log('Silent downloads enabled for this request:', silentDownloadsEnabled);

      const restoreActions = [];
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
                console.warn('Error restoring download UI:', restoreError);
              }
            });
          }, 1500);
        };
      })();

      if (silentDownloadsEnabled) {
        if (chrome.downloads && typeof chrome.downloads.setShelfEnabled === 'function') {
          try {
            chrome.downloads.setShelfEnabled(false);
            console.log('Download shelf disabled for silent screenshot download');
            restoreActions.push(() => {
              try {
                chrome.downloads.setShelfEnabled(true);
                console.log('Download shelf restored after silent download');
              } catch (restoreError) {
                console.warn('Failed to restore download shelf:', restoreError);
              }
            });
          } catch (shelfError) {
            console.warn('Unable to disable download shelf:', shelfError);
          }
        } else {
          console.log('chrome.downloads.setShelfEnabled is not available; shelf will remain visible');
        }

        if (chrome.downloads && typeof chrome.downloads.setUiOptions === 'function') {
          try {
            chrome.downloads.setUiOptions({ enabled: false }, () => {
              if (chrome.runtime.lastError) {
                console.warn('setUiOptions disable failed:', chrome.runtime.lastError);
              } else {
                console.log('Download UI disabled via setUiOptions for silent mode');
              }
            });
            restoreActions.push(() => {
              chrome.downloads.setUiOptions({ enabled: true }, () => {
                if (chrome.runtime.lastError) {
                  console.warn('Failed to re-enable download UI:', chrome.runtime.lastError);
                } else {
                  console.log('Download UI re-enabled after silent screenshot download');
                }
              });
            });
          } catch (uiError) {
            console.warn('Unable to adjust download UI options:', uiError);
          }
        }
      }
      
      console.log('Calling chrome.downloads.download...');
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('=== DOWNLOAD FAILED ===');
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          console.error('Error message:', chrome.runtime.lastError.message);
          
          console.log('=== DETAILED ERROR ANALYSIS ===');
          console.log('Error analysis for save path issue:');
          console.log('  - Error message:', chrome.runtime.lastError.message);
          console.log('  - Attempted filename:', downloadOptions.filename);
          console.log('  - Used custom path:', result.useCustomPath);
          console.log('  - Custom path value:', result.customDownloadPath);
          console.log('  - saveAs setting:', downloadOptions.saveAs);
          
          if (chrome.runtime.lastError.message.includes('path') || 
              chrome.runtime.lastError.message.includes('directory') ||
              chrome.runtime.lastError.message.includes('folder')) {
            console.log('  Path-related keywords detected in error message.');
            console.log('  Save path confirmed as the source of the issue.');
          }
          
          scheduleRestore();
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('=== DOWNLOAD SUCCESS ===');
          console.log('Screenshot downloaded with ID:', downloadId);
          console.log('=== BACKGROUND SCRIPT: DOWNLOAD DEBUG END ===');
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
        console.error('Background: Error getting settings:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse(settings);
      }
    });
    return true;
  }

  console.warn('Background: Unknown message action:', message.action);
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
          const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
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
    
    console.log('Successfully injected content scripts into tab:', tabId);
  } catch (error) {
    console.error('Failed to inject content scripts:', error);
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
          console.log('Injecting content script via extension click:', url.hostname);
          await injectContentScripts(tab.id);
        }
      }
    } catch (error) {
      console.error('Error handling extension click:', error);
    }
  }
});
