// Background service worker for YouTube Screenshot Helper
console.log('YouTube Screenshot Helper: Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('YouTube Screenshot Helper installed');
    
    // Set default settings
    chrome.storage.sync.set({
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
      fullscreenPopupDuration: 3000
    });
    
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Handle messages from content scripts and extension pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    // Respond to ping for testing
    sendResponse({status: 'ok', timestamp: Date.now()});
    return true;
  }
  
  if (message.action === 'downloadScreenshot') {
    // Handle screenshot download
    console.log('Download request received with filename:', message.filename, 'folderPath:', message.folderPath);
    
    let downloadOptions = {
      url: message.dataUrl,
      filename: message.filename || `youtube-screenshot-${Date.now()}.png`,
      saveAs: false
    };
    
    console.log('Download options:', downloadOptions);
    
    // Check if user has custom download path configured
    chrome.storage.sync.get(['useCustomPath', 'customDownloadPath'], (result) => {
      console.log('Storage result:', result);
      
      // Handle folder organization and custom paths
      let pathParts = [];
      
      // If using custom path, add it to our path parts
      if (result.useCustomPath && result.customDownloadPath) {
        pathParts.push(result.customDownloadPath.replace(/\\/g, '/').replace(/\/+$/, '')); // Normalize path
      }
      
      // If there's a folder path from organization settings, add it
      if (message.folderPath) {
        pathParts.push(message.folderPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, ''));
      }
      
      // Add the actual filename
      pathParts.push(downloadOptions.filename);
      
      // Join all parts to create the final relative path
      const finalFilename = pathParts.join('/');
      
      console.log('Constructed final path:', finalFilename);
      
      // Update download options with final filename
      downloadOptions.filename = finalFilename;
      
      // For Chrome extension downloads, we might need to use conflictAction
      downloadOptions.conflictAction = 'uniquify'; // This ensures files don't get overwritten
      
      console.log('Final download options:', downloadOptions);
      
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download failed:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('Screenshot downloaded with ID:', downloadId);
          sendResponse({ success: true, downloadId });
        }
      });
    });
    
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'getSettings') {
    chrome.storage.sync.get(null, (settings) => {
      sendResponse(settings);
    });
    return true;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'capture-screenshot') {
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'captureScreenshot',
      source: 'shortcut'
    });
  }
});

// Handle tab updates to inject content scripts if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if we should inject into this tab
    chrome.storage.sync.get(['enabledSites'], (result) => {
      const enabledSites = result.enabledSites || ['youtube.com', 'vimeo.com', 'twitch.tv'];
      const shouldInject = enabledSites.some(site => tab.url.includes(site));
      
      if (shouldInject) {
        // Send a ping to check if content script is already loaded
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script not loaded, inject it
            console.log('Injecting content script into tab:', tabId);
          }
        });
      }
    });
  }
});
