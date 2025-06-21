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
      fullscreenPopupDuration: 3000,
      // Screenshot preview settings
      disablePreviewByDefault: false
    });
    
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Handle messages from content scripts and extension pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message:', message.action, 'from tab:', sender.tab?.id);
  
  if (message.action === 'ping') {
    // Respond to ping for testing
    sendResponse({status: 'ok', timestamp: Date.now()});
    return true;
  }
  
  if (message.action === 'downloadScreenshot') {
    // Handle screenshot download
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
    
    // Check if user has custom download path configured
    chrome.storage.sync.get(['useCustomPath', 'customDownloadPath'], (result) => {
      console.log('=== STORAGE RESULT ===');
      console.log('Storage result:', result);
      console.log('useCustomPath:', result.useCustomPath);
      console.log('customDownloadPath:', result.customDownloadPath);
      
      // 🔍 SAVE PATH VALIDATION LOGGING
      console.log('=== SAVE PATH VALIDATION START ===');
      console.log('🔍 Analyzing save path configuration:');
      console.log('  • useCustomPath type:', typeof result.useCustomPath);
      console.log('  • useCustomPath value:', result.useCustomPath);
      console.log('  • customDownloadPath type:', typeof result.customDownloadPath);
      console.log('  • customDownloadPath value:', JSON.stringify(result.customDownloadPath));
      console.log('  • customDownloadPath length:', result.customDownloadPath ? result.customDownloadPath.length : 0);
      console.log('  • customDownloadPath empty check:', !result.customDownloadPath);
      
      // 🔧 IMPROVED CHROME EXTENSION PATH HANDLING
      console.log('=== IMPROVED PATH HANDLING LOGIC ===');
      
      // 🔧 SIMPLIFIED PATH HANDLING - Only relative paths within Downloads folder
      console.log('=== SIMPLIFIED PATH CONSTRUCTION ===');
      
      let pathParts = [];
      
      // Handle custom download path (relative only)
      if (result.useCustomPath && result.customDownloadPath) {
        console.log('🎯 Using custom relative path within Downloads folder');
        console.log(`📁 Custom path: "${result.customDownloadPath}"`);
        
        // Clean and normalize the custom path (UI already prevents absolute paths)
        const cleanPath = result.customDownloadPath
          .replace(/^[/\\]+/, '')  // Remove any leading slashes
          .replace(/[/\\]+$/, '')  // Remove trailing slashes
          .replace(/\\/g, '/');    // Normalize separators
        
        if (cleanPath) {
          pathParts.push(cleanPath);
          console.log(`✅ Added custom path: "${cleanPath}"`);
        }
      }
      
      // Handle folder organization settings
      if (message.folderPath) {
        const normalizedFolderPath = message.folderPath
          .replace(/\\/g, '/')     // Normalize separators
          .replace(/^\/+/, '')     // Remove leading slashes
          .replace(/\/+$/, '');    // Remove trailing slashes
        
        if (normalizedFolderPath) {
          pathParts.push(normalizedFolderPath);
          console.log(`✅ Added folder organization path: "${normalizedFolderPath}"`);
        }
      }
      
      // Add the filename at the end
      pathParts.push(downloadOptions.filename);
      
      // Construct the final path
      const finalPath = pathParts.join('/');
      downloadOptions.filename = finalPath;
      
      console.log('=== FINAL PATH RESULT ===');
      console.log(`📁 Path parts: [${pathParts.map(p => `"${p}"`).join(', ')}]`);
      console.log(`📄 Final filename: "${downloadOptions.filename}"`);
      console.log(`💾 Will save to: Downloads/${downloadOptions.filename}`)
      
      // For Chrome extension downloads, we might need to use conflictAction
      downloadOptions.conflictAction = 'uniquify'; // This ensures files don't get overwritten
      
      console.log('=== FINAL DOWNLOAD OPTIONS ===');
      console.log('Final download options:', downloadOptions);
      console.log('=== SAVE PATH VALIDATION END ===');
      
      console.log('Calling chrome.downloads.download...');
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('=== DOWNLOAD FAILED ===');
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          console.error('Error message:', chrome.runtime.lastError.message);
          
          // 🔍 DETAILED ERROR ANALYSIS
          console.log('=== DETAILED ERROR ANALYSIS ===');
          console.log('🔍 Error analysis for save path issue:');
          console.log('  • Error message:', chrome.runtime.lastError.message);
          console.log('  • Attempted filename:', downloadOptions.filename);
          console.log('  • Used custom path:', result.useCustomPath);
          console.log('  • Custom path value:', result.customDownloadPath);
          console.log('  • saveAs setting:', downloadOptions.saveAs);
          
          if (chrome.runtime.lastError.message.includes('path') || 
              chrome.runtime.lastError.message.includes('directory') ||
              chrome.runtime.lastError.message.includes('folder')) {
            console.log('  🎯 ERROR CONTAINS PATH-RELATED KEYWORDS!');
            console.log('  🎯 This confirms the save path is the issue!');
          }
          
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('=== DOWNLOAD SUCCESS ===');
          console.log('Screenshot downloaded with ID:', downloadId);
          console.log('=== BACKGROUND SCRIPT: DOWNLOAD DEBUG END ===');
          sendResponse({ success: true, downloadId });
        }
      });
    });
    
    return true; // Keep message channel open for async response
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

  // Handle unknown actions gracefully
  console.warn('Background: Unknown message action:', message.action);
  sendResponse({ success: false, error: 'Unknown action: ' + message.action });
  return true;
});

// Background script Imgur upload function removed - Imgur service no longer supported

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
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Check if we should inject into this tab
      const result = await chrome.storage.sync.get(['enabledSites']);
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
          const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
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
      'utils/storage.js',
      'utils/keyHandler.js',
      'utils/cloudConfig.js',
      'utils/cloudStorage.js',
      'utils/screenshot.js',
      'content/content.js',
      'content/youtube.js'
    ];
    
    // Inject CSS first
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['styles/content.css']
    });
    
    // Inject JavaScript files
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

// Handle extension icon clicks for custom sites
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url) {
    try {
      // Check if this might be a custom site that needs script injection
      const result = await chrome.storage.sync.get(['enabledSites']);
      const enabledSites = result.enabledSites || ['youtube.com', 'vimeo.com', 'twitch.tv'];
      const url = new URL(tab.url);
      
      const isEnabledSite = enabledSites.some(site => url.hostname.includes(site));
      
      if (isEnabledSite) {
        // Try to ping content script
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
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
