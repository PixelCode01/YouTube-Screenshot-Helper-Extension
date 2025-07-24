// Screenshot utility for YouTube Screenshot Helper
// Note: browser-polyfill.js is loaded via manifest.json

class ScreenshotManager {
  constructor() {
    this.settings = null;
    this.canvas = null;
    this.context = null;
    this.isReady = false;
    this.readyPromise = this.init();

    // Bind all methods to `this` to prevent context loss
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(prop => typeof this[prop] === 'function' && prop !== 'constructor')
      .forEach(method => { this[method] = this[method].bind(this); });
  }

  async init() {
    try {
      this.settings = await window.storageManager.getSettings();
      this.createCanvas();
      this.cleanupExistingPopups();
      this.isReady = true;
      console.log('ScreenshotManager: Initialized successfully.');
    } catch (error) {
      console.error('ScreenshotManager: Failed to initialize.', error);
      // Even on failure, resolve the promise so awaiting it doesn't hang
      this.isReady = false;
    }
  }

  async ready() {
    return this.readyPromise;
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
  }

  cleanupExistingPopups() {
    // Remove any existing fullscreen popups that might be left from previous sessions
    const existingPopups = document.querySelectorAll('.fullscreen-screenshot-popup');
    existingPopups.forEach(popup => popup.remove());
    
    // Also remove the popup styles
    const popupStyles = document.querySelector('#fullscreen-popup-styles');
    if (popupStyles) {
      popupStyles.remove();
    }
  }

  async captureScreenshot(metadata = {}, forcePreview = false, skipAnnotation = false) {
    console.log('ScreenshotManager: Starting screenshot capture');

    // Ensure the manager is initialized and settings are loaded
    await this.ready();

    if (!this.isReady || !this.settings) {
      console.error('ScreenshotManager: Cannot capture, manager not ready or settings failed to load.');
      this.showNotification('Screenshot Manager failed to initialize. Please reload the page.', 'error');
      return;
    }
    
    try {
      // Step 1: Check site configuration
      const siteConfig = await this.checkSiteConfiguration();
      
      // Step 2: Find video element (with enhanced waiting for educational platforms)
      let video = this.findVideoElement();
      
      if (!video) {
        console.log('ScreenshotManager: No video found immediately, checking if this is an educational platform...');
        
        // Check if this looks like an educational platform
        const hostname = window.location.hostname.toLowerCase();
        const isEducationalPlatform = hostname.includes('iit') || 
                                    hostname.includes('nptel') || 
                                    hostname.includes('swayam') || 
                                    hostname.includes('mooc') || 
                                    hostname.includes('edu') ||
                                    hostname.includes('learn') ||
                                    hostname.includes('course') ||
                                    hostname.includes('lecture') ||
                                    hostname.includes('university') ||
                                    hostname.includes('academic');
        
        // Special handling for IIT Madras seek platform
        const isIITMadras = hostname.includes('seek.onlinedegree.iitm.ac.in') ||
                           hostname.includes('iitm.ac.in') ||
                           hostname.includes('seek.') && hostname.includes('iit');
        
        const waitTime = (isEducationalPlatform || isIITMadras) ? 10000 : 3000; // Even longer wait for IIT Madras
        console.log(`ScreenshotManager: Educational platform detected: ${isEducationalPlatform}, IIT Madras: ${isIITMadras}, waiting ${waitTime}ms...`);
        
        video = await this.waitForVideoElement(waitTime);
      }
      
      if (!video) {
        let errorMessage;
        if (!siteConfig.isEnabledSite) {
          errorMessage = `This site (${siteConfig.hostname}) is not in your enabled sites list. Add it to custom sites in extension settings to use the screenshot feature.`;
        } else {
          errorMessage = `No video element found on this page. This might be because:
• The video player hasn't loaded yet - try waiting a moment
• The video is embedded in a way the extension can't detect
• The site uses a custom video player not yet supported
• Try refreshing the page and waiting for the video to load

Site: ${siteConfig.hostname}

🏛️ IIT Madras Debugging Info:
${siteConfig.hostname.includes('seek.onlinedegree.iitm.ac.in') || siteConfig.hostname.includes('iitm.ac.in') ? 
  '• Ultra-aggressive detection was enabled for IIT Madras\n• Extended 10-second wait period was used\n• Fallback to any video element was attempted\n• Check console for detailed video analysis' : 
  '• Standard educational platform detection was used\n• Consider manually adding video selectors if needed'}`;
        }
        
        console.error('ScreenshotManager:', errorMessage);
        this.showNotification(errorMessage, 'error');
        
        // Log debugging info
        console.log('ScreenshotManager: Debugging info:');
        console.log('- Total video elements:', document.querySelectorAll('video').length);
        console.log('- Total iframes:', document.querySelectorAll('iframe').length);
        console.log('- Page URL:', window.location.href);
        console.log('- Page title:', document.title);
        console.log('- Site enabled:', siteConfig.isEnabledSite);
        
        throw new Error('No video element found');
      }

      console.log('ScreenshotManager: Video element found, proceeding with capture');

      // Step 3: Check if video is playing and pause it
      let wasPlaying = false;
      
      if (video && !video.paused) {
        wasPlaying = true;
        video.pause();
        console.log('ScreenshotManager: Video paused (was playing)');
      }

      // Step 4: Hide controls if auto-hide is enabled
      let hiddenElements = [];
      if (this.settings.autoHideControls) {
        hiddenElements = this.hideVideoControls();
        console.log('ScreenshotManager: Controls hidden');
      }

      // Step 5: Wait a moment for UI to settle
      const delay = this.settings.captureDelay || 100;
      await this.sleep(delay);

      // Step 6: Capture the screenshot
      const dataUrl = await this.captureVideoFrame(video);
      
      // Step 7: Restore hidden elements
      if (hiddenElements.length > 0) {
        this.restoreVideoControls(hiddenElements);
        console.log('ScreenshotManager: Controls restored');
      }

      // Step 8: Resume video if it was playing
      if (wasPlaying && video) {
        setTimeout(() => {
          video.play();
          console.log('ScreenshotManager: Video resumed');
        }, 200); // Small delay to ensure controls are restored
      }

      // Step 9: Process and download the screenshot
      if (dataUrl) {
        await this.processScreenshot(dataUrl, metadata, forcePreview, skipAnnotation);
        console.log('ScreenshotManager: Screenshot captured successfully');
      } else {
        throw new Error('Failed to capture screenshot');
      }

    } catch (error) {
      console.error('ScreenshotManager: Error capturing screenshot:', error);
      this.showNotification('Failed to capture screenshot: ' + error.message, 'error');
    }
  }

  findVideoElement() {
    // Enhanced video selectors for comprehensive detection
    const selectors = [
      // YouTube selectors
      '.video-stream',
      '.html5-video-player video',
      '#movie_player video',
      'video.video-stream',
      
      // Vimeo selectors
      '.vp-video',
      '.vp-video-wrapper video',
      '.player video',
      
      // Twitch selectors
      'video[data-a-target="video-player"]',
      '.video-player video',
      
      // Educational platform selectors (common patterns)
      '.lesson-video video',
      '.course-video video',
      '.lecture-video video',
      '.video-lesson video',
      '#lesson-player video',
      '.player-wrapper video',
      '.video-frame video',
      '.media-wrapper video',
      '.content-video video',
      '.stream-video video',
      
      // Indian educational platform specific selectors
      '.nptel-player video',
      '.swayam-player video',
      '.mooc-player video',
      '.learning-player video',
      '.edu-video video',
      '.course-player video',
      '#videoPlayer video',
      '#courseVideo video',
      '#lectureVideo video',
      '.video-player-container video',
      '.lecture-player video',
      '.module-video video',
      '.chapter-video video',
      
      // IIT Madras seek platform specific selectors
      '.seek-video video',
      '.seek-player video',
      '.player-seek video',
      '.video-seek video',
      '.course-video-player video',
      '.online-degree-video video',
      '.degree-video video',
      '.iitm-video video',
      '.iitm-player video',
      '.video-content-player video',
      '.course-content-video video',
      '.lesson-player-container video',
      '.video-lesson-player video',
      '.streaming-video video',
      '.media-video video',
      '.embed-video video',
      '.iframe-video video',
      
      // Generic container patterns for IIT platforms
      '[class*="video"] video',
      '[class*="player"] video',
      '[id*="video"] video',
      '[id*="player"] video',
      
      // IIT/Academic platform patterns
      '.academic-video video',
      '.university-video video',
      '.iit-video video',
      '.lecture-content video',
      '.study-video video',
      '.education-video video',
      '.online-course video',
      '.e-learning video',
      
      // Video.js and common video players
      '.video-js video',
      '.vjs-tech',
      '.videojs video',
      '.plyr video',
      '.plyr__video',
      '.jwplayer video',
      '.flowplayer video',
      
      // Generic video selectors for custom sites
      'video[src]',
      'video[poster]',
      'video[width]',
      'video[height]',
      'video[controls]',
      'video[autoplay]',
      'video[preload]',
      '.video-container video',
      '.player-container video',
      '.video-wrapper video',
      '.media-player video',
      '.media-container video',
      '#player video',
      '.player video',
      '#video-player video',
      '.video-element video',
      
      // LMS and educational platform patterns
      '.video-content video',
      '.lesson-content video',
      '.course-content video',
      '.learning-video video',
      '.tutorial-video video',
      '.training-video video',
      
      // Iframe embedded videos (look inside iframes)
      'iframe video',
      
      // Generic fallback - any video element
      'video'
    ];

    console.log('ScreenshotManager: Looking for video elements...');
    console.log('ScreenshotManager: Current URL:', window.location.href);

    // Enhanced detection with better logging
    const allVideos = document.querySelectorAll('video');
    console.log('ScreenshotManager: Total video elements found:', allVideos.length);

    // Log details about all video elements found
    allVideos.forEach((video, index) => {
      console.log(`Video ${index + 1}:`, {
        element: video,
        src: video.src || video.currentSrc || 'no src',
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        clientWidth: video.clientWidth,
        clientHeight: video.clientHeight,
        paused: video.paused,
        readyState: video.readyState,
        networkState: video.networkState,
        duration: video.duration,
        currentTime: video.currentTime,
        classList: Array.from(video.classList),
        id: video.id,
        parentElement: video.parentElement?.tagName,
        style: {
          display: getComputedStyle(video).display,
          visibility: getComputedStyle(video).visibility,
          opacity: getComputedStyle(video).opacity
        }
      });
    });

    // First try to find playing videos with proper dimensions
    for (const selector of selectors) {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        if (video && video.videoWidth && video.videoHeight && !video.paused) {
          console.log('Found playing video with dimensions:', video.videoWidth + 'x' + video.videoHeight, 'using selector:', selector);
          return video;
        }
      }
    }

    // Then try any video with dimensions (even if paused)
    for (const selector of selectors) {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        if (video && video.videoWidth && video.videoHeight) {
          console.log('Found video with dimensions:', video.videoWidth + 'x' + video.videoHeight, 'using selector:', selector);
          return video;
        }
      }
    }

    // Try videos that are loaded (readyState >= 1) even without dimensions yet
    for (const video of allVideos) {
      if (video && video.readyState >= 1 && video.clientWidth > 100 && video.clientHeight > 50) {
        console.log('Found loaded video by readyState:', {
          readyState: video.readyState,
          clientSize: video.clientWidth + 'x' + video.clientHeight
        });
        return video;
      }
    }

    // Try videos with visible dimensions (even if not fully loaded)
    for (const video of allVideos) {
      if (video && (video.videoWidth > 0 || video.clientWidth > 100)) {
        const style = getComputedStyle(video);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          console.log('Found fallback video:', {
            videoSize: video.videoWidth + 'x' + video.videoHeight,
            clientSize: video.clientWidth + 'x' + video.clientHeight,
            display: style.display,
            visibility: style.visibility
          });
          return video;
        }
      }
    }

    // Final attempt: try any video element that's not hidden
    for (const video of allVideos) {
      const style = getComputedStyle(video);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        console.log('Found any visible video (last resort):', video);
        return video;
      }
    }

    // Educational platform specific fallback: try videos with any indication of being active
    const hostname = window.location.hostname.toLowerCase();
    const isEducationalPlatform = hostname.includes('iit') || hostname.includes('nptel') || 
                                hostname.includes('swayam') || hostname.includes('mooc') || 
                                hostname.includes('edu') || hostname.includes('learn') ||
                                hostname.includes('course') || hostname.includes('lecture');
    
    const isIITMadras = hostname.includes('seek.onlinedegree.iitm.ac.in') ||
                       hostname.includes('iitm.ac.in') ||
                       hostname.includes('seek.') && hostname.includes('iit');
    
    if (isEducationalPlatform || isIITMadras) {
      console.log(`ScreenshotManager: Educational platform detected (${hostname}), trying more lenient video detection...`);
      
      for (const video of allVideos) {
        // For educational platforms, accept videos with any of these conditions:
        if (video.readyState >= 1 || // Has loaded metadata
            video.networkState !== HTMLMediaElement.NETWORK_EMPTY || // Has network activity
            video.currentTime > 0 || // Has played
            video.duration > 0 || // Has duration  
            (video.src || video.currentSrc) || // Has a source
            video.clientWidth > 30 || // Has some width (very lenient)
            video.offsetWidth > 30 || // Or offset width
            video.getBoundingClientRect().width > 30) { // Or computed width
          
          console.log('ScreenshotManager: Found educational platform video (lenient detection):', {
            hostname: hostname,
            readyState: video.readyState,
            networkState: video.networkState,
            hasSource: !!(video.src || video.currentSrc),
            clientWidth: video.clientWidth,
            offsetWidth: video.offsetWidth,
            boundingWidth: video.getBoundingClientRect().width,
            currentTime: video.currentTime,
            duration: video.duration,
            classList: Array.from(video.classList),
            id: video.id,
            tagName: video.tagName
          });
          
          return video;
        }
      }
      
      // Ultra-lenient fallback for IIT Madras - accept ANY video element that exists
      if (isIITMadras && allVideos.length > 0) {
        console.log('ScreenshotManager: IIT Madras ultra-lenient fallback - using first video found');
        const video = allVideos[0];
        console.log('ScreenshotManager: IIT Madras fallback video:', {
          element: video,
          src: video.src || video.currentSrc || 'no source',
          parent: video.parentElement?.tagName,
          classList: Array.from(video.classList),
          id: video.id,
          clientRect: video.getBoundingClientRect()
        });
        return video;
      }
    }

    // Check for videos inside iframes
    const iframes = document.querySelectorAll('iframe');
    console.log('ScreenshotManager: Checking', iframes.length, 'iframes for videos');
    
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const iframeVideos = iframeDoc.querySelectorAll('video');
          console.log('Found', iframeVideos.length, 'videos in iframe:', iframe.src);
          if (iframeVideos.length > 0) {
            return iframeVideos[0]; // Return first video found in iframe
          }
        }
      } catch (e) {
        // Cross-origin iframe, can't access content
        console.log('Cannot access iframe content (cross-origin):', iframe.src);
      }
    }

    console.log('ScreenshotManager: No suitable video element found');
    return null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  hideVideoControls() {
    const hiddenElements = [];
    
    // YouTube specific selectors
    const youtubeSelectors = [
      '.ytp-chrome-top',
      '.ytp-chrome-bottom',
      '.ytp-gradient-top',
      '.ytp-gradient-bottom',
      '.ytp-title',
      '.ytp-watermark',
      '.ytp-ce-element',
      '.ytp-cards-teaser',
      '.ytp-endscreen-element'
    ];

    // Vimeo specific selectors
    const vimeoSelectors = [
      '.vp-controls',
      '.vp-title',
      '.vp-overlay'
    ];

    // Twitch specific selectors
    const twitchSelectors = [
      '.player-controls',
      '.player-overlay-background',
      '[data-a-target="player-overlay-click-handler"]'
    ];

    const allSelectors = [...youtubeSelectors, ...vimeoSelectors, ...twitchSelectors];

    allSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element && getComputedStyle(element).display !== 'none') {
          hiddenElements.push({
            element: element,
            originalDisplay: element.style.display,
            originalVisibility: element.style.visibility,
            originalOpacity: element.style.opacity
          });
          
          element.style.display = 'none';
        }
      });
    });

    return hiddenElements;
  }

  restoreVideoControls(hiddenElements) {
    hiddenElements.forEach(({ element, originalDisplay, originalVisibility, originalOpacity }) => {
      element.style.display = originalDisplay;
      element.style.visibility = originalVisibility;
      element.style.opacity = originalOpacity;
    });
  }

  async captureVideoFrame(video) {
    if (!video) {
      // If no video found, try to capture the whole page or ask user to add site
      console.log('ScreenshotManager: No video element found, attempting page capture');
      throw new Error('No video element found on this page. Try adding this site to custom sites in settings.');
    }

    // Check if video has valid dimensions
    if (!video.videoWidth || !video.videoHeight) {
      // Video exists but no dimensions - might be loading
      console.log('ScreenshotManager: Video found but no dimensions, checking for IIT Madras...');
      
      const hostname = window.location.hostname.toLowerCase();
      const isIITMadras = hostname.includes('seek.onlinedegree.iitm.ac.in') ||
                         hostname.includes('iitm.ac.in') ||
                         (hostname.includes('seek.') && hostname.includes('iit'));
      
      if (isIITMadras) {
        console.log('ScreenshotManager: IIT Madras detected - using client dimensions as fallback');
        
        // For IIT Madras, try using client dimensions
        const clientWidth = video.clientWidth || video.offsetWidth || 640;
        const clientHeight = video.clientHeight || video.offsetHeight || 360;
        
        console.log('ScreenshotManager: Using client dimensions:', clientWidth + 'x' + clientHeight);
        
        // Set canvas dimensions to client size
        this.canvas.width = clientWidth;
        this.canvas.height = clientHeight;
        
        try {
          // Draw video frame to canvas using client dimensions
          this.context.drawImage(video, 0, 0, clientWidth, clientHeight);
          
          // Convert to data URL
          const dataUrl = this.canvas.toDataURL('image/png', this.settings.screenshotQuality || 0.9);
          
          console.log('ScreenshotManager: IIT Madras fallback capture successful');
          return dataUrl;
        } catch (error) {
          console.log('ScreenshotManager: IIT Madras fallback capture failed:', error.message);
          // Continue to normal error handling
        }
      }
      
      // Wait a bit for video to load
      await this.sleep(1000);
      
      if (!video.videoWidth || !video.videoHeight) {
        // One more attempt for IIT Madras with minimal dimensions
        if (isIITMadras) {
          console.log('ScreenshotManager: IIT Madras final attempt with minimal dimensions');
          
          this.canvas.width = 640;
          this.canvas.height = 360;
          
          try {
            this.context.drawImage(video, 0, 0, 640, 360);
            const dataUrl = this.canvas.toDataURL('image/png', this.settings.screenshotQuality || 0.9);
            
            console.log('ScreenshotManager: IIT Madras minimal dimensions capture successful');
            return dataUrl;
          } catch (error) {
            console.log('ScreenshotManager: IIT Madras minimal dimensions capture failed:', error.message);
          }
        }
        
        throw new Error('Video found but not ready. Please wait for the video to load and try again.');
      }
    }

    // Set canvas dimensions to match video
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;

    // Draw video frame to canvas
    this.context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Convert to data URL
    return this.canvas.toDataURL('image/png', this.settings.screenshotQuality || 0.9);
  }

  async processScreenshot(dataUrl, metadata = {}, forcePreview = false, skipAnnotation = false) {
    // Refresh settings to get latest title builder preferences
    await this.updateSettings();
    
    console.log('=== SCREENSHOT PROCESSING DEBUG ===');
    console.log('processScreenshot called with:');
    console.log('  - forcePreview:', forcePreview);
    console.log('  - skipAnnotation:', skipAnnotation);
    console.log('  - settings.annotationMode:', this.settings.annotationMode);
    console.log('  - settings.disablePreviewByDefault:', this.settings.disablePreviewByDefault);
    
    // Combine passed-in metadata with other necessary data
    const combinedMetadata = {
      ...this.extractVideoMetadata(), // for things like timestamp
      ...metadata, // for title, channel, etc. from navigation
    };

    const filename = window.storageManager.generateFilename(this.settings.filenameTemplate, combinedMetadata);
    
    console.log('Generated filename:', filename);
    
    // Decide whether to show the annotation/preview UI
    const shouldShowAnnotation = !skipAnnotation && this.settings.annotationMode;
    const shouldShowPreview = !shouldShowAnnotation && this.shouldShowPreview(forcePreview, skipAnnotation);

    if (shouldShowAnnotation) {
      console.log('=== ANNOTATION/PREVIEW DECISION ===');
      console.log('📝 Annotation mode is on, showing annotation interface.');
      this.showAnnotationInterface(dataUrl, filename);
    } else if (shouldShowPreview) {
      console.log('=== ANNOTATION/PREVIEW DECISION ===');
      console.log('🖼️ Annotation is off, but preview is enabled. Showing screenshot preview.');
      this.showScreenshotPreview(dataUrl, filename);
    } else {
      console.log('=== DIRECT DOWNLOAD MODE ===');
      console.log('Calling downloadScreenshot directly...');
      try {
        await this.downloadScreenshot(dataUrl, filename);
        console.log('✓ Direct download completed successfully');
        
        // Also upload to cloud if enabled
        if (this.settings.uploadToCloud && this.settings.cloudService !== 'none') {
          console.log('Starting cloud upload...');
          await this.uploadToCloud(dataUrl, filename);
          console.log('✓ Cloud upload completed');
        }
        
        this.showNotification(`Screenshot saved as: ${filename}`, 'success');
      } catch (error) {
        console.error('✗ Direct download failed:', error);
        this.showNotification(`Download failed: ${error.message}`, 'error');
        return;
      }
    }
  }

  shouldShowPreview(forcePreview = false, skipAnnotation = false) {
    console.log('ScreenshotManager: shouldShowPreview check - forcePreview:', forcePreview, 'skipAnnotation:', skipAnnotation);
    console.log('ScreenshotManager: Settings - disablePreviewByDefault:', this.settings.disablePreviewByDefault);

    // If we are skipping annotation (and by extension, any UI), don't show preview.
    if (skipAnnotation) {
        return false;
    }

    // If forced to show preview (e.g., specific Shift+Enter combination), always show
    if (forcePreview) {
      console.log('ScreenshotManager: Forcing preview due to forcePreview=true');
      return true;
    }

    // If preview is disabled by default, don't show it.
    if (this.settings.disablePreviewByDefault) {
      console.log('ScreenshotManager: Preview disabled by default setting');
      return false;
    }

    // Otherwise, show the preview.
    console.log('ScreenshotManager: Showing preview by default.');
    return true;
  }

  showScreenshotPreview(dataUrl, filename) {
    this.cleanupExistingPopups(); // Ensure no other popups are open

    const popup = document.createElement('div');
    popup.className = 'fullscreen-screenshot-popup';
    popup.innerHTML = `
      <div class="preview-container">
        <div class="preview-header">
          <h3>Screenshot Preview</h3>
          <button class="close-btn" title="Close">&times;</button>
        </div>
        <div class="preview-image-container">
          <img src="${dataUrl}" alt="Screenshot preview" />
        </div>
        <div class="preview-footer">
          <button class="save-btn">💾 Save Screenshot</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    const close = () => document.body.removeChild(popup);

    popup.querySelector('.close-btn').addEventListener('click', close);
    popup.querySelector('.save-btn').addEventListener('click', async () => {
      console.log('=== SAVE BUTTON CLICKED ===');
      console.log('Starting download process...');
      console.log('Filename:', filename);
      console.log('DataURL length:', dataUrl ? dataUrl.length : 'null');
      
      try {
        await this.downloadScreenshot(dataUrl, filename);
        console.log('✓ Download completed successfully');
        
        // Also upload to cloud if enabled
        if (this.settings.uploadToCloud && this.settings.cloudService !== 'none') {
          console.log('Starting cloud upload...');
          await this.uploadToCloud(dataUrl, filename);
          console.log('✓ Cloud upload completed');
        }
      } catch (error) {
        console.error('✗ Save button error:', error);
      }
      
      console.log('Closing preview popup...');
      close();
      console.log('=== SAVE BUTTON PROCESS COMPLETE ===');
    });
  }

  async downloadScreenshot(dataUrl, filename) {
    try {
      console.log('=== ScreenshotManager: DOWNLOAD DEBUG START ===');
      console.log('ScreenshotManager: Starting download process');
      console.log('Initial filename:', filename);
      
      // Validate settings are loaded
      if (!this.settings) {
        console.error('CRITICAL: Settings not loaded!');
        this.settings = await window.storageManager.getSettings();
        console.log('Reloaded settings:', this.settings);
      }
      
      console.log('Current settings state:');
      console.log('- organizeFolders:', this.settings.organizeFolders);
      console.log('- useCustomPath:', this.settings.useCustomPath);
      console.log('- customDownloadPath:', this.settings.customDownloadPath);
      console.log('- customFolderPattern:', this.settings.customFolderPattern);
      
      // Generate folder path if folder organization is enabled
      let folderPath = '';
      if (this.settings.organizeFolders && this.settings.organizeFolders !== 'none') {
        console.log('✓ Folder organization enabled:', this.settings.organizeFolders);
        
        const metadata = this.extractVideoMetadata();
        console.log('Extracted metadata:');
        console.log('- site:', metadata.site);
        console.log('- title:', metadata.title);
        console.log('- channelName:', metadata.channelName);
        console.log('- playlistName:', metadata.playlistName);
        console.log('- currentTime:', metadata.currentTime);
        
        folderPath = this.generateFolderPath(metadata);
        console.log('✓ Generated folder path:', folderPath);
        
        if (!folderPath) {
          console.warn('WARNING: generateFolderPath returned empty string!');
        }
      } else {
        console.log('⚠️ Folder organization disabled or set to none');
      }

      // Prepare download message
      const downloadMessage = {
        action: 'downloadScreenshot',
        dataUrl: dataUrl,
        filename: filename,
        folderPath: folderPath
      };
      
      console.log('Sending download message to background script:');
      console.log('- action:', downloadMessage.action);
      console.log('- filename:', downloadMessage.filename);
      console.log('- folderPath:', downloadMessage.folderPath);
      console.log('- dataUrl length:', downloadMessage.dataUrl ? downloadMessage.dataUrl.length : 'null');
      
      const response = await browser.runtime.sendMessage(downloadMessage);
      
      console.log('Background script response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Unknown download error');
      }
      
      console.log('✓ Download completed successfully with ID:', response.downloadId);
      console.log('=== ScreenshotManager: DOWNLOAD DEBUG END ===');
    } catch (error) {
      console.error('=== DOWNLOAD ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      
      // Check if this is an extension context invalidation error
      if (error.message && (
          error.message.includes('Extension context invalidated') ||
          error.message.includes('receiving end does not exist') ||
          error.message.includes('Could not establish connection')
        )) {
        console.log('Extension context invalidated - using fallback download');
        this.showNotification('Extension was reloaded, using direct download fallback', 'warning');
      } else {
        console.log('Download failed - using fallback download');
        this.showNotification('Download failed, using direct download fallback', 'warning');
      }
      
      console.log('Falling back to direct download');
      this.fallbackDownload(dataUrl, filename);
      console.log('=== DOWNLOAD ERROR END ===');
    }
  }

  /**
   * Upload screenshot to cloud storage
   */
  async uploadToCloud(dataUrl, filename) {
    try {
      const service = this.settings.cloudService;
      console.log(`🔄 Uploading to cloud service: ${service}`);

      if (service === 'google-drive') {
        // Google Drive upload (requires authentication)
        if (!window.cloudStorageManager) {
          throw new Error('Cloud storage manager not available. Please check extension setup.');
        }
        
        const result = await window.cloudStorageManager.uploadToGoogleDrive(dataUrl, filename);
        this.showNotification('Screenshot uploaded to Google Drive!', 'success');
        return result;
      } else {
        throw new Error(`Cloud service "${service}" is not supported. Please select Google Drive.`);
      }
    } catch (error) {
      console.error('❌ Cloud upload failed:', error);
      this.showNotification(`Cloud upload failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // All Imgur upload methods removed - Imgur service no longer supported

  generateFolderPath(metadata) {
    console.log('=== FOLDER PATH GENERATION DEBUG ===');
    console.log('Input metadata:', metadata);
    console.log('Settings organizeFolders:', this.settings.organizeFolders);
    
    if (!this.settings.organizeFolders || this.settings.organizeFolders === 'none') {
      console.log('✓ Folder organization is disabled, returning empty string');
      return '';
    }

    let folderName = '';
    
    switch (this.settings.organizeFolders) {
      case 'channel':
        folderName = metadata.channelName || 'Unknown Channel';
        console.log('✓ Channel folder:', folderName);
        break;
      case 'playlist':
        folderName = metadata.playlistName || metadata.channelName || 'No Playlist';
        console.log('✓ Playlist folder:', folderName);
        break;
      case 'video':
        folderName = metadata.title || 'Unknown Video';
        console.log('✓ Video folder:', folderName);
        break;
      case 'date':
        folderName = new Date().toISOString().split('T')[0];
        console.log('✓ Date folder:', folderName);
        break;
      case 'channel-date':
        const channelName = metadata.channelName || 'Unknown Channel';
        const date = new Date().toISOString().split('T')[0];
        folderName = `${channelName}/${date}`;
        console.log('✓ Channel-Date folder:', folderName);
        break;
      case 'channel-video':
        const channelName2 = metadata.channelName || 'Unknown Channel';
        const videoTitle = metadata.title || 'Unknown Video';
        folderName = `${channelName2}/${videoTitle}`;
        console.log('✓ Channel-Video folder:', folderName);
        break;
      case 'date-channel':
        const date2 = new Date().toISOString().split('T')[0];
        const channelName3 = metadata.channelName || 'Unknown Channel';
        folderName = `${date2}/${channelName3}`;
        console.log('✓ Date-Channel folder:', folderName);
        break;
      case 'channel-playlist':
        const channelName4 = metadata.channelName || 'Unknown Channel';
        const playlistName = metadata.playlistName || 'No Playlist';
        folderName = `${channelName4}/${playlistName}`;
        console.log('✓ Channel-Playlist folder:', folderName);
        break;
      case 'custom':
        // Use custom folder pattern if specified
        if (this.settings.customFolderPattern) {
          console.log('Using custom pattern:', this.settings.customFolderPattern);
          folderName = this.applyTemplate(this.settings.customFolderPattern, metadata);
          // Remove .png extension that applyTemplate adds
          folderName = folderName.replace('.png', '');
          console.log('✓ Custom folder after template:', folderName);
        } else {
          console.warn('WARNING: Custom folder selected but no pattern provided!');
        }
        break;
      default:
        console.error('ERROR: Unknown organization type:', this.settings.organizeFolders);
        return '';
    }

    console.log('Raw folder name before cleaning:', folderName);

    // Clean folder name for file system compatibility
    // Split by forward slash to preserve folder hierarchy
    const pathParts = folderName.split('/');
    console.log('Path parts before cleaning:', pathParts);
    
    const cleanedParts = pathParts.map(part => 
      part
        .replace(/[<>:"|?*\\]/g, '_') // Remove illegal chars but keep forward slash
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50) // Limit each part length
    ).filter(part => part.length > 0); // Remove empty parts
    
    console.log('Path parts after cleaning:', cleanedParts);
    
    folderName = cleanedParts.join('/');
    console.log('✓ Final cleaned folder path:', folderName);
    console.log('=== FOLDER PATH GENERATION END ===');

    return folderName;
  }

  fallbackDownload(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  showAnnotationInterface(dataUrl, filename) {
    // Create annotation overlay
    const overlay = document.createElement('div');
    overlay.className = 'screenshot-annotation-overlay';
    overlay.innerHTML = `
      <div class="annotation-container">
        <div class="annotation-header">
          <h3>🎨 Annotate Your Screenshot</h3>
          <div class="header-controls">
            <button class="undo-btn" title="Undo last action">↶ Undo</button>
            <button class="clear-btn" title="Clear all annotations">🗑️ Clear</button>
            <button class="close-btn" title="Close without saving">&times;</button>
          </div>
        </div>
        <div class="annotation-canvas-container">
          <canvas class="annotation-canvas"></canvas>
          <div class="canvas-hint">Click and drag to start annotating</div>
        </div>
        <div class="annotation-tools">
          <div class="tool-group">
            <label class="tool-group-label">Drawing Tools:</label>
            <button class="tool-btn active" data-tool="arrow" title="Draw arrows">🏹 Arrow</button>
            <button class="tool-btn" data-tool="rectangle" title="Draw rectangles">⬜ Rectangle</button>
            <button class="tool-btn" data-tool="circle" title="Draw circles">⭕ Circle</button>
            <button class="tool-btn" data-tool="highlight" title="Highlight areas">🖍️ Highlight</button>
            <button class="tool-btn" data-tool="text" title="Add text">📝 Text</button>
            <button class="tool-btn" data-tool="pen" title="Free drawing">✏️ Pen</button>
            <button class="tool-btn" data-tool="crop" title="Crop image">✂️ Crop</button>
          </div>
          <div class="tool-group">
            <label class="tool-group-label">Style:</label>
            <input type="color" class="color-picker" value="#ff0000" title="Choose color">
            <select class="line-width-select" title="Line thickness">
              <option value="2">Thin</option>
              <option value="4" selected>Medium</option>
              <option value="6">Thick</option>
              <option value="8">Extra Thick</option>
            </select>
          </div>
          <div class="tool-group">
            <button class="download-btn">💾 Save Screenshot</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Initialize annotation canvas
    const canvas = overlay.querySelector('.annotation-canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      
      // Hide the hint after image loads
      const hint = overlay.querySelector('.canvas-hint');
      if (hint) hint.style.display = 'none';
    };
    img.src = dataUrl;

    // Add event listeners for annotation tools
    this.setupAnnotationTools(overlay, canvas, filename);
  }

  setupAnnotationTools(overlay, canvas, filename) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let currentTool = 'arrow';
    let isDrawing = false;
    let startX, startY;
    let originalImageData = null;
    let undoStack = [];
    let redoStack = [];

    // Store the original image data for redrawing
    const storeOriginalImage = () => {
      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };

    // Push current state to undo stack
    const pushToUndoStack = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.push(imageData);
      redoStack = []; // Clear redo stack when new action is performed
      if (undoStack.length > 20) { // Limit undo stack size
        undoStack.shift();
      }
    };

    // Undo functionality
    const undo = () => {
      if (undoStack.length > 0) {
        const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        redoStack.push(currentState);
        const previousState = undoStack.pop();
        ctx.putImageData(previousState, 0, 0);
        storeOriginalImage();
      }
    };

    // Clear functionality
    const clearCanvas = () => {
      pushToUndoStack();
      // Reload the original screenshot
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        storeOriginalImage();
      };
      img.src = overlay.dataset.originalImage;
    };

    // Store original image URL for clearing
    const originalImg = new Image();
    originalImg.onload = () => {
      overlay.dataset.originalImage = originalImg.src;
      pushToUndoStack(); // Store initial state
    };
    originalImg.src = canvas.toDataURL();

    // Set the first tool as active by default
    const firstToolBtn = overlay.querySelector('.tool-btn[data-tool="arrow"]');
    if (firstToolBtn) {
      firstToolBtn.classList.add('active');
    }

    // Tool selection
    overlay.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Tool button clicked:', btn.dataset.tool);
        
        currentTool = btn.dataset.tool;
        overlay.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update canvas cursor based on tool
        if (currentTool === 'crop') {
          canvas.style.cursor = 'crosshair';
          canvas.className = 'annotation-canvas crop-mode';
        } else if (currentTool === 'pen') {
          canvas.className = 'annotation-canvas pen-mode';
        } else {
          canvas.className = 'annotation-canvas arrow-mode';
        }
      });
    });

    // Undo button
    const undoBtn = overlay.querySelector('.undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        undo();
      });
    }

    // Clear button
    const clearBtn = overlay.querySelector('.clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearCanvas();
      });
    }

    // Mouse events for drawing
    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      startX = (e.clientX - rect.left) * scaleX;
      startY = (e.clientY - rect.top) * scaleY;
      
      // Store original image when starting to draw
      if (!originalImageData) {
        storeOriginalImage();
      }
      
      // Push to undo stack before starting new drawing
      pushToUndoStack();
      
      console.log('Mouse down at:', startX, startY, 'Tool:', currentTool);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;
      
      // Set drawing properties
      const color = overlay.querySelector('.color-picker').value;
      const lineWidth = overlay.querySelector('.line-width-select').value;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = parseInt(lineWidth);
      ctx.lineCap = 'round';
      
      if (currentTool === 'arrow') {
        // Restore original image and draw arrow
        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }
        this.drawArrow(ctx, startX, startY, currentX, currentY);
      } else if (currentTool === 'rectangle') {
        // Restore original image and draw rectangle
        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }
        ctx.beginPath();
        ctx.rect(startX, startY, currentX - startX, currentY - startY);
        ctx.stroke();
      } else if (currentTool === 'circle') {
        // Restore original image and draw circle
        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }
        const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentTool === 'highlight') {
        // Draw continuous highlight
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.rect(startX, startY, currentX - startX, currentY - startY);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      } else if (currentTool === 'crop') {
        // Show crop preview
        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }
        // Draw crop area with overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Clear the crop selection area
        const cropX = Math.min(startX, currentX);
        const cropY = Math.min(startY, currentY);
        const cropWidth = Math.abs(currentX - startX);
        const cropHeight = Math.abs(currentY - startY);
        
        ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
        
        // Draw crop border with dashed line
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
        ctx.setLineDash([]); // Reset line dash
        
        // Draw corner handles
        const handleSize = 8;
        ctx.fillStyle = '#ff0000';
        // Top-left
        ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
        // Top-right  
        ctx.fillRect(cropX + cropWidth - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
        // Bottom-left
        ctx.fillRect(cropX - handleSize/2, cropY + cropHeight - handleSize/2, handleSize, handleSize);
        // Bottom-right
        ctx.fillRect(cropX + cropWidth - handleSize/2, cropY + cropHeight - handleSize/2, handleSize, handleSize);
      } else if (currentTool === 'pen') {
        // Free drawing
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        startX = currentX;
        startY = currentY;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (isDrawing) {
        isDrawing = false;
        
        // Handle crop tool
        if (currentTool === 'crop') {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const endX = (e.clientX - rect.left) * scaleX;
          const endY = (e.clientY - rect.top) * scaleY;
          
          // Calculate crop dimensions
          const cropX = Math.min(startX, endX);
          const cropY = Math.min(startY, endY);
          const cropWidth = Math.abs(endX - startX);
          const cropHeight = Math.abs(endY - startY);
          
          if (cropWidth > 10 && cropHeight > 10) {
            // Create new canvas with cropped content
            const croppedCanvas = document.createElement('canvas');
            const croppedCtx = croppedCanvas.getContext('2d');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            
            // Draw cropped portion
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.putImageData(originalImageData, 0, 0);
            
            croppedCtx.drawImage(tempCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            // Update main canvas with cropped image
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            ctx.drawImage(croppedCanvas, 0, 0);
            
            storeOriginalImage();
          }
        }
        
        // Handle text tool
        if (currentTool === 'text') {
          // Create a text input overlay for better UX
          this.createTextInput(overlay, canvas, ctx, startX, startY);
        }
        
        // Store the new state as original for next drawing
        storeOriginalImage();
        console.log('Mouse up - drawing completed');
      }
    });

    // Download button
    overlay.querySelector('.download-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Download button clicked');
      
      const annotatedDataUrl = canvas.toDataURL('image/png');
      this.downloadScreenshot(annotatedDataUrl, filename);
      document.body.removeChild(overlay);
    });

    // Close button
    overlay.querySelector('.close-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Close button clicked');
      
      document.body.removeChild(overlay);
    });
  }

  drawArrow(ctx, fromX, fromY, toX, toY) {
    const headlen = 15; // Length of the arrow head
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw the main line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw the arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  showNotification(message, type = 'info') {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.screenshot-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `screenshot-notification ${type}`;
    notification.textContent = message;
    
    // Use CSS classes instead of inline styles for better consistency
    document.body.appendChild(notification);

    // Trigger show animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 400);
      }
    }, 3000);
  }

  // Check if in fullscreen mode
  isInFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      window.innerHeight === screen.height
    );
  }

  async updateSettings() {
    // Refresh settings from storage - this is called when settings change
    this.settings = await window.storageManager.getSettings();
    console.log('ScreenshotManager: Settings updated', this.settings);
  }

  // Video metadata extraction methods
  extractVideoMetadata() {
    const metadata = {
      title: this.getVideoTitle(),
      chapter: this.getCurrentChapter(),
      currentTime: this.getCurrentTime(),
      site: window.location.hostname,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      channelName: this.getChannelName(),
      playlistName: this.getPlaylistName()
    };

    console.log('Extracted video metadata:', metadata);
    return metadata;
  }

  getVideoTitle() {
    const hostname = window.location.hostname;
    let title = '';

    try {
      if (hostname.includes('youtube.com')) {
        // YouTube title selectors (try multiple)
        const selectors = [
          'h1.ytd-video-primary-info-renderer',
          '.ytd-video-primary-info-renderer h1',
          'h1.style-scope.ytd-video-primary-info-renderer',
          '.ytp-title-text',
          '#container h1',
          'ytd-video-primary-info-renderer h1'
        ];
        
        for (const selector of selectors) {
          const titleElement = document.querySelector(selector);
          if (titleElement && titleElement.textContent.trim()) {
            title = titleElement.textContent.trim();
            break;
          }
        }
        
        // Fallback to page title
        if (!title) {
          title = document.title.replace(' - YouTube', '');
        }
      } else if (hostname.includes('vimeo.com')) {
        // Vimeo title selectors 
        const selectors = [
          '.player_title',
          'h1[data-test-id="title"]',
          '.clip_info-wrapper h1',
          '.title'
        ];
        
        for (const selector of selectors) {
          const titleElement = document.querySelector(selector);
          if (titleElement && titleElement.textContent.trim()) {
            title = titleElement.textContent.trim();
            break;
          }
        }
        
        if (!title) {
          title = document.title.replace(' on Vimeo', '');
        }
      } else if (hostname.includes('twitch.tv')) {
        // Twitch title selectors
        const selectors = [
          '[data-a-target="stream-title"]',
          '.channel-info-content h2',
          '.tw-title'
        ];
        
        for (const selector of selectors) {
          const titleElement = document.querySelector(selector);
          if (titleElement && titleElement.textContent.trim()) {
            title = titleElement.textContent.trim();
            break;
          }
        }
        
        if (!title) {
          title = document.title.replace(' - Twitch', '');
        }
      } else {
        // Generic fallback
        title = document.title;
      }
    } catch (error) {
      console.warn('Error extracting video title:', error);
      title = document.title;
    }

    // Clean up title
    return title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
  }

  getChannelName() {
    const hostname = window.location.hostname;
    let channelName = '';

    try {
      if (hostname.includes('youtube.com')) {
        // YouTube channel name selectors
        const selectors = [
          'ytd-channel-name a',
          '#channel-name a',
          '.ytd-channel-name a',
          'a.yt-simple-endpoint.style-scope.yt-formatted-string',
          '.ytd-video-owner-renderer .ytd-channel-name a',
          '#owner-text a',
          '.owner-text a'
        ];
        
        for (const selector of selectors) {
          const channelElement = document.querySelector(selector);
          if (channelElement && channelElement.textContent.trim()) {
            channelName = channelElement.textContent.trim();
            break;
          }
        }
      } else if (hostname.includes('vimeo.com')) {
        // Vimeo channel/user name selectors
        const selectors = [
          '.user-link',
          '.byline a',
          '[data-test-id="byline"] a'
        ];
        
        for (const selector of selectors) {
          const userElement = document.querySelector(selector);
          if (userElement && userElement.textContent.trim()) {
            channelName = userElement.textContent.trim();
            break;
          }
        }
      } else if (hostname.includes('twitch.tv')) {
        // Twitch channel name selectors
        const selectors = [
          '[data-a-target="user-display-name"]',
          '.channel-info-content h1',
          '.tw-title'
        ];
        
        for (const selector of selectors) {
          const channelElement = document.querySelector(selector);
          if (channelElement && channelElement.textContent.trim()) {
            channelName = channelElement.textContent.trim();
            break;
          }
        }
        
        // Extract from URL path
        if (!channelName) {
          const pathParts = window.location.pathname.split('/');
          if (pathParts.length > 1) {
            channelName = pathParts[1];
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting channel name:', error);
    }

    // Clean up channel name
    return channelName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
  }

  getPlaylistName() {
    const hostname = window.location.hostname;
    let playlistName = '';

    try {
      if (hostname.includes('youtube.com')) {
        // Check if we're in a playlist
        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('list');
        
        if (playlistId) {
          // Try to get playlist title from the page
          const playlistSelectors = [
            '.ytd-playlist-header-renderer h1',
            '.ytd-playlist-sidebar-renderer .title',
            '.playlist-title'
          ];
          
          for (const selector of playlistSelectors) {
            const playlistElement = document.querySelector(selector);
            if (playlistElement && playlistElement.textContent.trim()) {
              playlistName = playlistElement.textContent.trim();
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting playlist name:', error);
    }

    // Clean up playlist name
    return playlistName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
  }

  getCurrentChapter() {
    const hostname = window.location.hostname;
    let chapter = '';

    try {
      if (hostname.includes('youtube.com')) {
        // YouTube chapter selectors
        const chapterSelectors = [
          '.ytp-chapter-title-content',
          '.ytp-chapter-title',
          '.ytd-macro-markers-list-item-renderer.iron-selected .ytd-macro-markers-list-item-renderer',
          '.ytp-progress-bar-container .ytp-chapter-title'
        ];
        
        for (const selector of chapterSelectors) {
          const chapterElement = document.querySelector(selector);
          if (chapterElement && chapterElement.textContent.trim()) {
            chapter = chapterElement.textContent.trim();
            break;
          }
        }
      }
      // Vimeo and Twitch don't typically have chapters
    } catch (error) {
      console.warn('Error extracting chapter:', error);
    }

    return chapter.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
  }

  getCurrentTime() {
    try {
      const video = this.findVideoElement();
      if (video && !isNaN(video.currentTime)) {
        const time = Math.floor(video.currentTime);
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;
        
        if (hours > 0) {
          return `${hours.toString().padStart(2, '0')}-${minutes.toString().padStart(2, '0')}-${seconds.toString().padStart(2, '0')}`;
        } else {
          return `${minutes.toString().padStart(2, '0')}-${seconds.toString().padStart(2, '0')}`;
        }
      }
    } catch (error) {
      console.warn('Error getting current time:', error);
    }
    
    return '';
  }

  generateCustomFilename(metadata, template = null) {
    // If user has a custom template (advanced mode), use that
    if (template && template.trim()) {
      return this.applyTemplate(template, metadata);
    }
    
    // If filenameTemplate setting exists and not empty, use old template system
    if (this.settings.filenameTemplate && this.settings.filenameTemplate.trim()) {
      return this.applyTemplate(this.settings.filenameTemplate, metadata);
    }
    
    // Otherwise use the new title builder system
    const components = [];
    const separator = this.settings.titleSeparator || ' - ';
    
    if (this.settings.includeYoutube) {
      components.push('YouTube');
    }
    
    if (this.settings.includeChannelName && metadata.channelName) {
      const cleanChannel = metadata.channelName.replace(/[<>:"/\\|?*]/g, '').substring(0, 40);
      components.push(cleanChannel);
    }
    
    if (this.settings.includePlaylistName && metadata.playlistName) {
      const cleanPlaylist = metadata.playlistName.replace(/[<>:"/\\|?*]/g, '').substring(0, 40);
      components.push(cleanPlaylist);
    }
    
    if (this.settings.includeVideoTitle && metadata.title) {
      // Clean title for filename
      const cleanTitle = metadata.title.replace(/[<>:"/\\|?*]/g, '').substring(0, 50);
      components.push(cleanTitle);
    }
    
    if (this.settings.includeChapter && metadata.chapter) {
      const cleanChapter = metadata.chapter.replace(/[<>:"/\\|?*]/g, '').substring(0, 30);
      components.push(cleanChapter);
    }
    
    if (this.settings.includeTimestamp && metadata.currentTime) {
      components.push(metadata.currentTime);
    }
    
    if (this.settings.includeDate) {
      const date = new Date().toISOString().split('T')[0];
      components.push(date);
    }
    
    if (this.settings.includeTime) {
      const time = new Date().toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      components.push(time);
    }
    
    let filename = components.join(separator) || 'youtube-screenshot';
    
    // Clean up filename and ensure it ends with .png
    filename = filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    return filename + '.png';
  }

  applyTemplate(template, metadata) {
    const now = new Date();
    
    const replacements = {
      '{site}': metadata.site.replace(/[<>:"/\\|?*]/g, '_'),
      '{title}': metadata.title || 'video',
      '{chapter}': metadata.chapter || '',
      '{timestamp}': metadata.currentTime || '',
      '{date}': now.toISOString().split('T')[0],
      '{time}': now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-'),
      '{datetime}': now.toISOString().replace('T', '_').replace(/[:.]/g, '-').split('.')[0],
      '{year}': now.getFullYear().toString(),
      '{month}': (now.getMonth() + 1).toString().padStart(2, '0'),
      '{day}': now.getDate().toString().padStart(2, '0'),
      '{hour}': now.getHours().toString().padStart(2, '0'),
      '{minute}': now.getMinutes().toString().padStart(2, '0'),
      '{second}': now.getSeconds().toString().padStart(2, '0'),
      // New template variables
      '{channel}': metadata.channelName || '',
      '{playlist}': metadata.playlistName || ''
    };

    let filename = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      filename = filename.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
    });

    // Clean up consecutive separators and ensure it ends with .png
    filename = filename
      .replace(/[-_\s]+/g, '-')
      .replace(/^[-_\s]+|[-_\s]+$/g, '')
      .replace(/\.png$/, '') + '.png';

    return filename;
  }

  createTextInput(overlay, canvas, ctx, x, y) {
    // Create text input overlay
    const textOverlay = document.createElement('div');
    textOverlay.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      z-index: 10002;
      background: white;
      border: 2px solid #2196F3;
      border-radius: 4px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Enter text...';
    textInput.style.cssText = `
      border: none;
      outline: none;
      font-size: 14px;
      min-width: 150px;
      background: transparent;
    `;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '✓';
    confirmBtn.style.cssText = `
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 4px 8px;
      margin-left: 8px;
      cursor: pointer;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕';
    cancelBtn.style.cssText = `
      background: #f44336;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 4px 8px;
      margin-left: 4px;
      cursor: pointer;
    `;
    
    textOverlay.appendChild(textInput);
    textOverlay.appendChild(confirmBtn);
    textOverlay.appendChild(cancelBtn);
    
    // Position the text input correctly
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    
    textOverlay.style.left = (canvasRect.left + (x / scaleX)) + 'px';
    textOverlay.style.top = (canvasRect.top + (y / scaleY)) + 'px';
    
    document.body.appendChild(textOverlay);
    textInput.focus();
    
    const addText = () => {
      const text = textInput.value.trim();
      if (text) {
        const color = overlay.querySelector('.color-picker').value;
        const lineWidth = parseInt(overlay.querySelector('.line-width-select').value);
        
        ctx.fillStyle = color;
        ctx.font = `${lineWidth * 8}px Arial`;
        ctx.fillText(text, x, y);
        
        console.log('Text added:', text, 'at position:', x, y);
      }
      document.body.removeChild(textOverlay);
    };
    
    const cancelText = () => {
      document.body.removeChild(textOverlay);
    };
    
    confirmBtn.addEventListener('click', addText);
    cancelBtn.addEventListener('click', cancelText);
    
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addText();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelText();
      }
    });
  }

  async waitForVideoElement(maxWaitTime = 5000) {
    console.log('ScreenshotManager: Waiting for video element to load...');
    
    const startTime = Date.now();
    const pollInterval = 150; // Check more frequently (every 150ms)
    
    // Check if this is IIT Madras for ultra-aggressive detection
    const hostname = window.location.hostname.toLowerCase();
    const isIITMadras = hostname.includes('seek.onlinedegree.iitm.ac.in') ||
                       hostname.includes('iitm.ac.in') ||
                       (hostname.includes('seek.') && hostname.includes('iit'));
    
    if (isIITMadras) {
      console.log('ScreenshotManager: IIT Madras detected - using ultra-aggressive video detection');
    }
    
    return new Promise((resolve) => {
      const checkForVideo = () => {
        // Try multiple detection strategies
        let video = this.findVideoElement();
        
        // If main detection didn't work, try more aggressive detection
        if (!video) {
          // Check for any video elements that might be loading
          const allVideos = document.querySelectorAll('video');
          console.log(`ScreenshotManager: Found ${allVideos.length} video elements, analyzing...`);
          
          for (const videoEl of allVideos) {
            // Standard criteria
            if (videoEl.readyState >= 1 || // Has metadata
                videoEl.networkState !== HTMLMediaElement.NETWORK_EMPTY || // Network activity
                videoEl.currentTime > 0 || // Has played
                videoEl.duration > 0 || // Has duration  
                (videoEl.src || videoEl.currentSrc) || // Has source
                (videoEl.clientWidth > 50 && videoEl.clientHeight > 50)) { // Has visible size
              
              console.log('ScreenshotManager: Found potentially ready video:', {
                readyState: videoEl.readyState,
                networkState: videoEl.networkState,
                currentTime: videoEl.currentTime,
                duration: videoEl.duration,
                hasSource: !!(videoEl.src || videoEl.currentSrc),
                clientSize: `${videoEl.clientWidth}x${videoEl.clientHeight}`,
                videoSize: `${videoEl.videoWidth}x${videoEl.videoHeight}`
              });
              
              video = videoEl;
              break;
            }
          }
          
          // Ultra-aggressive detection for IIT Madras - accept ANY video element
          if (!video && isIITMadras && allVideos.length > 0) {
            console.log('ScreenshotManager: IIT Madras ultra-aggressive - accepting any video element');
            video = allVideos[0];
            console.log('ScreenshotManager: IIT Madras fallback video selected:', {
              element: video.tagName,
              src: video.src || video.currentSrc || 'no source',
              classList: Array.from(video.classList),
              id: video.id,
              readyState: video.readyState,
              clientRect: video.getBoundingClientRect()
            });
          }
        }
        
        if (video) {
          console.log('ScreenshotManager: Video element found after waiting');
          resolve(video);
          return;
        }
        
        const elapsed = Date.now() - startTime;
        if (elapsed >= maxWaitTime) {
          console.log('ScreenshotManager: Timeout waiting for video element');
          
          // Final attempt: log detailed info about what we found
          const allVideos = document.querySelectorAll('video');
          if (allVideos.length > 0) {
            console.log('ScreenshotManager: Videos found but none suitable:');
            allVideos.forEach((v, i) => {
              console.log(`Video ${i + 1}:`, {
                readyState: v.readyState,
                networkState: v.networkState,
                videoSize: `${v.videoWidth}x${v.videoHeight}`,
                clientSize: `${v.clientWidth}x${v.clientHeight}`,
                src: v.src || v.currentSrc || 'no source',
                classList: Array.from(v.classList),
                id: v.id,
                parentElement: v.parentElement?.tagName,
                style: getComputedStyle(v).display
              });
            });
            
            // For IIT Madras, try one last time with the first video found
            if (isIITMadras) {
              console.log('ScreenshotManager: IIT Madras final fallback - using first video regardless');
              resolve(allVideos[0]);
              return;
            }
          }
          
          resolve(null);
          return;
        }
        
        setTimeout(checkForVideo, pollInterval);
      };
      
      checkForVideo();
    });
  }

  async checkSiteConfiguration() {
    const hostname = window.location.hostname;
    const isEnabledSite = await window.storageManager.isCurrentSiteEnabled();
    
    console.log('ScreenshotManager: Site configuration check:');
    console.log('- Hostname:', hostname);
    console.log('- Is enabled site:', isEnabledSite);
    
    return {
      hostname,
      isEnabledSite
    };
  }
}

// Initialize screenshot manager when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.screenshotManager = new ScreenshotManager();
    });
  } else {
    window.screenshotManager = new ScreenshotManager();
  }
}
