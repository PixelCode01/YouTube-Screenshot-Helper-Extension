

class ScreenshotManager {
  constructor() {
    this.settings = null;
    this.canvas = null;
    this.context = null;
    this.init();
  }

  async init() {
    this.settings = await window.storageManager.getSettings();
    this.createCanvas();
    this.cleanupExistingPopups();
  }

  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
  }

  cleanupExistingPopups() {

    const existingPopups = document.querySelectorAll('.fullscreen-screenshot-popup');
    existingPopups.forEach(popup => popup.remove());
    

    const popupStyles = document.querySelector('#fullscreen-popup-styles');
    if (popupStyles) {
      popupStyles.remove();
    }
  }

  async captureScreenshot(metadata = {}, forcePreview = false, skipAnnotation = false) {
    console.log('ScreenshotManager: Starting screenshot capture');
    
    try {

      const siteConfig = await this.checkSiteConfiguration();
      

      let video = this.findVideoElement();
      
      if (!video) {
        console.log('ScreenshotManager: No video found immediately, checking if this is an educational platform...');
        

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
        

        const isIITMadras = hostname.includes('seek.onlinedegree.iitm.ac.in') ||
                           hostname.includes('iitm.ac.in') ||
                           hostname.includes('seek.') && hostname.includes('iit');
        
        const waitTime = (isEducationalPlatform || isIITMadras) ? 10000 : 3000;
        console.log(`ScreenshotManager: Educational platform detected: ${isEducationalPlatform}, IIT Madras: ${isIITMadras}, waiting ${waitTime}ms...`);
        
        video = await this.waitForVideoElement(waitTime);
      }
      
      if (!video) {
        let errorMessage;
        if (!siteConfig.isEnabledSite) {
          errorMessage = `This site (${siteConfig.hostname}) is not in your enabled sites list. Add it to custom sites in extension settings to use the screenshot feature.`;
        } else {
          const iitMadrasHints = siteConfig.hostname.includes('seek.onlinedegree.iitm.ac.in') || siteConfig.hostname.includes('iitm.ac.in')
            ? '- Aggressive detection logic enabled for IIT Madras\n- Extended ten second wait applied\n- Fallback to any video element attempted\n- Check the console for additional diagnostics'
            : '- Standard educational platform detection used\n- Consider adding custom video selectors if needed';

          errorMessage = `No video element found on this page. Possible causes include:
- The video player has not finished loading
- The video is embedded in a way the extension cannot detect automatically
- The site uses a custom video player that is not yet supported
- Refreshing the page may help once the video is fully loaded

Site: ${siteConfig.hostname}

IIT Madras diagnostics:
${iitMadrasHints}`;
        }
        
        console.error('ScreenshotManager:', errorMessage);
        this.showNotification(errorMessage, 'error');
        

        console.log('ScreenshotManager: Debugging info:');
        console.log('- Total video elements:', document.querySelectorAll('video').length);
        console.log('- Total iframes:', document.querySelectorAll('iframe').length);
        console.log('- Page URL:', window.location.href);
        console.log('- Page title:', document.title);
        console.log('- Site enabled:', siteConfig.isEnabledSite);
        
        throw new Error('No video element found');
      }

      console.log('ScreenshotManager: Video element found, proceeding with capture');


      let wasPlaying = false;
      
      if (video && !video.paused) {
        wasPlaying = true;
        video.pause();
        console.log('ScreenshotManager: Video paused (was playing)');
      }


      let hiddenElements = [];
      if (this.settings.autoHideControls) {
        hiddenElements = this.hideVideoControls();
        console.log('ScreenshotManager: Controls hidden');
      }


      const delay = this.settings.captureDelay || 100;
      await this.sleep(delay);


      const dataUrl = await this.captureVideoFrame(video);
      

      if (hiddenElements.length > 0) {
        this.restoreVideoControls(hiddenElements);
        console.log('ScreenshotManager: Controls restored');
      }


      if (wasPlaying && video) {
        setTimeout(() => {
          video.play();
          console.log('ScreenshotManager: Video resumed');
        }, 200);
      }


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

    const selectors = [

      '.video-stream',
      '.html5-video-player video',
      '#movie_player video',
      'video.video-stream',
      

      '.vp-video',
      '.vp-video-wrapper video',
      '.player video',
      

      'video[data-a-target="video-player"]',
      '.video-player video',
      

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
      

      '[class*="video"] video',
      '[class*="player"] video',
      '[id*="video"] video',
      '[id*="player"] video',
      

      '.academic-video video',
      '.university-video video',
      '.iit-video video',
      '.lecture-content video',
      '.study-video video',
      '.education-video video',
      '.online-course video',
      '.e-learning video',
      

      '.video-js video',
      '.vjs-tech',
      '.videojs video',
      '.plyr video',
      '.plyr__video',
      '.jwplayer video',
      '.flowplayer video',
      

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
      

      '.video-content video',
      '.lesson-content video',
      '.course-content video',
      '.learning-video video',
      '.tutorial-video video',
      '.training-video video',
      

      'iframe video',
      

      'video'
    ];

    console.log('ScreenshotManager: Looking for video elements...');
    console.log('ScreenshotManager: Current URL:', window.location.href);


    const allVideos = document.querySelectorAll('video');
    console.log('ScreenshotManager: Total video elements found:', allVideos.length);


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


    for (const selector of selectors) {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        if (video && video.videoWidth && video.videoHeight && !video.paused) {
          console.log('Found playing video with dimensions:', video.videoWidth + 'x' + video.videoHeight, 'using selector:', selector);
          return video;
        }
      }
    }


    for (const selector of selectors) {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        if (video && video.videoWidth && video.videoHeight) {
          console.log('Found video with dimensions:', video.videoWidth + 'x' + video.videoHeight, 'using selector:', selector);
          return video;
        }
      }
    }


    for (const video of allVideos) {
      if (video && video.readyState >= 1 && video.clientWidth > 100 && video.clientHeight > 50) {
        console.log('Found loaded video by readyState:', {
          readyState: video.readyState,
          clientSize: video.clientWidth + 'x' + video.clientHeight
        });
        return video;
      }
    }


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


    for (const video of allVideos) {
      const style = getComputedStyle(video);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        console.log('Found any visible video (last resort):', video);
        return video;
      }
    }


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

        if (video.readyState >= 1 ||
            video.networkState !== HTMLMediaElement.NETWORK_EMPTY ||
            video.currentTime > 0 ||
            video.duration > 0 ||
            (video.src || video.currentSrc) ||
            video.clientWidth > 30 ||
            video.offsetWidth > 30 ||
            video.getBoundingClientRect().width > 30) {
          
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


    const iframes = document.querySelectorAll('iframe');
    console.log('ScreenshotManager: Checking', iframes.length, 'iframes for videos');
    
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const iframeVideos = iframeDoc.querySelectorAll('video');
          console.log('Found', iframeVideos.length, 'videos in iframe:', iframe.src);
          if (iframeVideos.length > 0) {
            return iframeVideos[0];
          }
        }
      } catch (e) {

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


    const vimeoSelectors = [
      '.vp-controls',
      '.vp-title',
      '.vp-overlay'
    ];


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

      console.log('ScreenshotManager: No video element found, attempting page capture');
      throw new Error('No video element found on this page. Try adding this site to custom sites in settings.');
    }


    if (!video.videoWidth || !video.videoHeight) {

      console.log('ScreenshotManager: Video found but no dimensions, checking for IIT Madras...');
      
      const hostname = window.location.hostname.toLowerCase();
      const isIITMadras = hostname.includes('seek.onlinedegree.iitm.ac.in') ||
                         hostname.includes('iitm.ac.in') ||
                         (hostname.includes('seek.') && hostname.includes('iit'));
      
      if (isIITMadras) {
        console.log('ScreenshotManager: IIT Madras detected - using client dimensions as fallback');
        

        const clientWidth = video.clientWidth || video.offsetWidth || 640;
        const clientHeight = video.clientHeight || video.offsetHeight || 360;
        
        console.log('ScreenshotManager: Using client dimensions:', clientWidth + 'x' + clientHeight);
        

        this.canvas.width = clientWidth;
        this.canvas.height = clientHeight;
        
        try {

          this.context.drawImage(video, 0, 0, clientWidth, clientHeight);
          

          const dataUrl = this.canvas.toDataURL('image/png', this.settings.screenshotQuality || 0.9);
          
          console.log('ScreenshotManager: IIT Madras fallback capture successful');
          return dataUrl;
        } catch (error) {
          console.log('ScreenshotManager: IIT Madras fallback capture failed:', error.message);

        }
      }
      

      await this.sleep(1000);
      
      if (!video.videoWidth || !video.videoHeight) {

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


    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;


    this.context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);


    return this.canvas.toDataURL('image/png', this.settings.screenshotQuality || 0.9);
  }

  async processScreenshot(dataUrl, metadata = {}, forcePreview = false, skipAnnotation = false) {

    await this.updateSettings();
    
    console.log('=== SCREENSHOT PROCESSING DEBUG ===');
    console.log('processScreenshot called with:');
    console.log('  - forcePreview:', forcePreview);
    console.log('  - skipAnnotation:', skipAnnotation);
    console.log('  - settings.annotationMode:', this.settings.annotationMode);
    console.log('  - settings.disablePreviewByDefault:', this.settings.disablePreviewByDefault);
    

    const combinedMetadata = {
      ...this.extractVideoMetadata(),
      ...metadata
    };
    
    const filename = this.generateCustomFilename(combinedMetadata, this.settings.filenameTemplate);
    
    console.log('Generated filename:', filename);
    


    const shouldShowPreview = !skipAnnotation && this.shouldShowPreview(forcePreview);
    
    console.log('=== ANNOTATION DECISION ===');
    console.log('  - !skipAnnotation:', !skipAnnotation);
    console.log('  - shouldShowPreview result:', shouldShowPreview);
    console.log('  - Final action:', shouldShowPreview ? 'SHOW ANNOTATION' : 'DIRECT DOWNLOAD');
    
    if (shouldShowPreview) {
  console.log('Showing annotation interface');
      this.showAnnotationInterface(dataUrl, filename);
    } else {
  console.log('Direct download requested - skipping annotation');

      await this.downloadScreenshot(dataUrl, filename);
      

      if (this.settings.uploadToCloud && this.settings.cloudService !== 'none') {
        await this.uploadToCloud(dataUrl, filename);
      }
    }

    this.showNotification(`Screenshot saved as: ${filename}`, 'success');
  }

  shouldShowPreview(forcePreview = false) {
    console.log('ScreenshotManager: shouldShowPreview check - forcePreview:', forcePreview);
    console.log('ScreenshotManager: Settings - annotationMode:', this.settings.annotationMode, 'disablePreviewByDefault:', this.settings.disablePreviewByDefault);
    

    if (forcePreview) {
      console.log('ScreenshotManager: Forcing preview due to forcePreview=true');
      return true;
    }
    

    if (this.settings.disablePreviewByDefault === true) {
      console.log('ScreenshotManager: Preview disabled by default setting');
      return false;
    }
    

    const shouldShow = this.settings.annotationMode === true;
    console.log('ScreenshotManager: Final shouldShowPreview result:', shouldShow);
    return shouldShow;
  }

  async downloadScreenshot(dataUrl, filename) {
    try {
      console.log('=== ScreenshotManager: DOWNLOAD DEBUG START ===');
      console.log('ScreenshotManager: Starting download process');
      console.log('Initial filename:', filename);
      

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
      

      let folderPath = '';
      if (this.settings.organizeFolders && this.settings.organizeFolders !== 'none') {
  console.log('Folder organization enabled:', this.settings.organizeFolders);
        
        const metadata = this.extractVideoMetadata();
        console.log('Extracted metadata:');
        console.log('- site:', metadata.site);
        console.log('- title:', metadata.title);
        console.log('- channelName:', metadata.channelName);
        console.log('- playlistName:', metadata.playlistName);
        console.log('- currentTime:', metadata.currentTime);
        
        folderPath = this.generateFolderPath(metadata);
  console.log('Generated folder path:', folderPath);
        
        if (!folderPath) {
          console.warn('WARNING: generateFolderPath returned empty string!');
        }
      } else {
  console.log('Folder organization disabled or set to none');
      }


      const downloadMessage = {
        action: 'downloadScreenshot',
        dataUrl: dataUrl,
        filename: filename,
        folderPath: folderPath,
        silentDownloads: !!this.settings.silentDownloads
      };
      
      console.log('Sending download message to background script:');
      console.log('- action:', downloadMessage.action);
      console.log('- filename:', downloadMessage.filename);
      console.log('- folderPath:', downloadMessage.folderPath);
      console.log('- silentDownloads:', downloadMessage.silentDownloads);
      console.log('- dataUrl length:', downloadMessage.dataUrl ? downloadMessage.dataUrl.length : 'null');
      
      const response = await chrome.runtime.sendMessage(downloadMessage);
      
      console.log('Background script response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Unknown download error');
      }
      
  console.log('Download completed successfully with ID:', response.downloadId);
      console.log('=== ScreenshotManager: DOWNLOAD DEBUG END ===');
    } catch (error) {
      console.error('=== DOWNLOAD ERROR ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      

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

  
  async uploadToCloud(dataUrl, filename) {
    try {
      const service = this.settings.cloudService;
  console.log(`Uploading to cloud service: ${service}`);

      if (!window.cloudStorageManager) {
        throw new Error('Cloud storage manager not available. Please check extension setup.');
      }

      let folderPath = '';
      if (this.settings.organizeFolders && this.settings.organizeFolders !== 'none') {
        const metadata = this.extractVideoMetadata();
        folderPath = this.generateFolderPath(metadata) || '';
      }

      const normalizedService = this.normalizeCloudServiceKey(service);
      const result = await window.cloudStorageManager.uploadScreenshot({
        service: normalizedService,
        dataUrl,
        filename,
        folderPath
      });

      const providerName = this.getCloudProviderName(normalizedService);
      this.showNotification(`Screenshot uploaded to ${providerName}!`, 'success');
      return result;
    } catch (error) {
  console.error('Cloud upload failed:', error);
      this.showNotification(`Cloud upload failed: ${error.message}`, 'error');
      throw error;
    }
  }

  normalizeCloudServiceKey(service) {
    switch (service) {
      case 'google-drive':
      case 'gdrive':
        return 'google-drive';
      case 'one-drive':
      case 'onedrive':
      case 'ms-onedrive':
        return 'one-drive';
      default:
        return service;
    }
  }

  getCloudProviderName(serviceKey) {
    switch (serviceKey) {
      case 'google-drive':
        return 'Google Drive';
      case 'one-drive':
        return 'OneDrive';
      default:
        return 'Cloud Storage';
    }
  }



  generateFolderPath(metadata) {
    console.log('=== FOLDER PATH GENERATION DEBUG ===');
    console.log('Input metadata:', metadata);
    console.log('Settings organizeFolders:', this.settings.organizeFolders);
    
    if (!this.settings.organizeFolders || this.settings.organizeFolders === 'none') {
  console.log('Folder organization is disabled, returning empty string');
      return '';
    }

    let folderName = '';
    
    switch (this.settings.organizeFolders) {
      case 'channel':
        folderName = metadata.channelName || 'Unknown Channel';
  console.log('Channel folder:', folderName);
        break;
      case 'playlist':
        folderName = metadata.playlistName || metadata.channelName || 'No Playlist';
  console.log('Playlist folder:', folderName);
        break;
      case 'video':
        folderName = metadata.title || 'Unknown Video';
  console.log('Video folder:', folderName);
        break;
      case 'date':
        folderName = new Date().toISOString().split('T')[0];
  console.log('Date folder:', folderName);
        break;
      case 'channel-date':
        const channelName = metadata.channelName || 'Unknown Channel';
        const date = new Date().toISOString().split('T')[0];
        folderName = `${channelName}/${date}`;
  console.log('Channel-Date folder:', folderName);
        break;
      case 'channel-video':
        const channelName2 = metadata.channelName || 'Unknown Channel';
        const videoTitle = metadata.title || 'Unknown Video';
        folderName = `${channelName2}/${videoTitle}`;
  console.log('Channel-Video folder:', folderName);
        break;
      case 'date-channel':
        const date2 = new Date().toISOString().split('T')[0];
        const channelName3 = metadata.channelName || 'Unknown Channel';
        folderName = `${date2}/${channelName3}`;
  console.log('Date-Channel folder:', folderName);
        break;
      case 'channel-playlist':
        const channelName4 = metadata.channelName || 'Unknown Channel';
        const playlistName = metadata.playlistName || 'No Playlist';
        folderName = `${channelName4}/${playlistName}`;
  console.log('Channel-Playlist folder:', folderName);
        break;
      case 'custom':

        if (this.settings.customFolderPattern) {
          console.log('Using custom pattern:', this.settings.customFolderPattern);
          folderName = this.applyTemplate(this.settings.customFolderPattern, metadata);

          folderName = folderName.replace('.png', '');
          console.log('Custom folder after template:', folderName);
        } else {
          console.warn('WARNING: Custom folder selected but no pattern provided!');
        }
        break;
      default:
        console.error('ERROR: Unknown organization type:', this.settings.organizeFolders);
        return '';
    }

    console.log('Raw folder name before cleaning:', folderName);



    const pathParts = folderName.split('/');
    console.log('Path parts before cleaning:', pathParts);
    
    const cleanedParts = pathParts.map(part => 
      part
  .replace(/[<>:"|?*\\]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50)
    ).filter(part => part.length > 0);
    
    console.log('Path parts after cleaning:', cleanedParts);
    
    folderName = cleanedParts.join('/');
  console.log('Final cleaned folder path:', folderName);
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

    const overlay = document.createElement('div');
    overlay.className = 'screenshot-annotation-overlay';
    overlay.innerHTML = `
      <div class="annotation-container">
        <div class="annotation-header">
          <h3>Annotate Your Screenshot</h3>
          <div class="header-controls">
            <button class="undo-btn" title="Undo last action">Undo</button>
            <button class="clear-btn" title="Clear all annotations">Clear</button>
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
            <button class="tool-btn active" data-tool="arrow" title="Draw arrows">Arrow</button>
            <button class="tool-btn" data-tool="rectangle" title="Draw rectangles">Rectangle</button>
            <button class="tool-btn" data-tool="circle" title="Draw circles">Circle</button>
            <button class="tool-btn" data-tool="highlight" title="Highlight areas">Highlight</button>
            <button class="tool-btn" data-tool="text" title="Add text">Text</button>
            <button class="tool-btn" data-tool="pen" title="Free drawing">Pen</button>
            <button class="tool-btn" data-tool="crop" title="Crop image">Crop</button>
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
            <button class="download-btn">Save Screenshot</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);


    const canvas = overlay.querySelector('.annotation-canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      

      const hint = overlay.querySelector('.canvas-hint');
      if (hint) hint.style.display = 'none';
    };
    img.src = dataUrl;


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


    const storeOriginalImage = () => {
      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };


    const pushToUndoStack = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.push(imageData);
      redoStack = [];
      if (undoStack.length > 20) {
        undoStack.shift();
      }
    };


    const undo = () => {
      if (undoStack.length > 0) {
        const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        redoStack.push(currentState);
        const previousState = undoStack.pop();
        ctx.putImageData(previousState, 0, 0);
        storeOriginalImage();
      }
    };


    const clearCanvas = () => {
      pushToUndoStack();

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        storeOriginalImage();
      };
      img.src = overlay.dataset.originalImage;
    };


    const originalImg = new Image();
    originalImg.onload = () => {
      overlay.dataset.originalImage = originalImg.src;
      pushToUndoStack();
    };
    originalImg.src = canvas.toDataURL();


    const firstToolBtn = overlay.querySelector('.tool-btn[data-tool="arrow"]');
    if (firstToolBtn) {
      firstToolBtn.classList.add('active');
    }


    overlay.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Tool button clicked:', btn.dataset.tool);
        
        currentTool = btn.dataset.tool;
        overlay.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        

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


    const undoBtn = overlay.querySelector('.undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        undo();
      });
    }


    const clearBtn = overlay.querySelector('.clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearCanvas();
      });
    }


    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      startX = (e.clientX - rect.left) * scaleX;
      startY = (e.clientY - rect.top) * scaleY;
      

      if (!originalImageData) {
        storeOriginalImage();
      }
      

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
      

      const color = overlay.querySelector('.color-picker').value;
      const lineWidth = overlay.querySelector('.line-width-select').value;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = parseInt(lineWidth);
      ctx.lineCap = 'round';
      
      if (currentTool === 'arrow') {

        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }
        this.drawArrow(ctx, startX, startY, currentX, currentY);
      } else if (currentTool === 'rectangle') {

        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }
        ctx.beginPath();
        ctx.rect(startX, startY, currentX - startX, currentY - startY);
        ctx.stroke();
      } else if (currentTool === 'circle') {

        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }
        const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
        ctx.beginPath();
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentTool === 'highlight') {

        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.rect(startX, startY, currentX - startX, currentY - startY);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
      } else if (currentTool === 'crop') {

        if (originalImageData) {
          ctx.putImageData(originalImageData, 0, 0);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        

        const cropX = Math.min(startX, currentX);
        const cropY = Math.min(startY, currentY);
        const cropWidth = Math.abs(currentX - startX);
        const cropHeight = Math.abs(currentY - startY);
        
        ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
        

        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
        ctx.setLineDash([]);
        

        const handleSize = 8;
        ctx.fillStyle = '#ff0000';

        ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);

        ctx.fillRect(cropX + cropWidth - handleSize/2, cropY - handleSize/2, handleSize, handleSize);

        ctx.fillRect(cropX - handleSize/2, cropY + cropHeight - handleSize/2, handleSize, handleSize);

        ctx.fillRect(cropX + cropWidth - handleSize/2, cropY + cropHeight - handleSize/2, handleSize, handleSize);
      } else if (currentTool === 'pen') {

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
        

        if (currentTool === 'crop') {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const endX = (e.clientX - rect.left) * scaleX;
          const endY = (e.clientY - rect.top) * scaleY;
          

          const cropX = Math.min(startX, endX);
          const cropY = Math.min(startY, endY);
          const cropWidth = Math.abs(endX - startX);
          const cropHeight = Math.abs(endY - startY);
          
          if (cropWidth > 10 && cropHeight > 10) {

            const croppedCanvas = document.createElement('canvas');
            const croppedCtx = croppedCanvas.getContext('2d');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.putImageData(originalImageData, 0, 0);
            
            croppedCtx.drawImage(tempCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            

            canvas.width = cropWidth;
            canvas.height = cropHeight;
            ctx.drawImage(croppedCanvas, 0, 0);
            
            storeOriginalImage();
          }
        }
        

        if (currentTool === 'text') {

          this.createTextInput(overlay, canvas, ctx, startX, startY);
        }
        

        storeOriginalImage();
        console.log('Mouse up - drawing completed');
      }
    });


    overlay.querySelector('.download-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Download button clicked');
      
      const annotatedDataUrl = canvas.toDataURL('image/png');
      this.downloadScreenshot(annotatedDataUrl, filename);
      document.body.removeChild(overlay);
    });


    overlay.querySelector('.close-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Close button clicked');
      
      document.body.removeChild(overlay);
    });
  }

  drawArrow(ctx, fromX, fromY, toX, toY) {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);


    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();


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

    const existingNotifications = document.querySelectorAll('.screenshot-notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `screenshot-notification ${type}`;
    notification.textContent = message;
    

    document.body.appendChild(notification);


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

    this.settings = await window.storageManager.getSettings();
    console.log('ScreenshotManager: Settings updated', this.settings);
  }

  sanitizeFilePart(value, maxLength = 100) {
    if (!value || typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/[\t\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[<>:"/\\|?*]/g, '_')
      .trim()
      .substring(0, maxLength);
  }

  getYouTubePlayerDetails() {
    try {
      const initialDetails = window.ytInitialPlayerResponse?.videoDetails;
      if (initialDetails && typeof initialDetails.title === 'string') {
        return initialDetails;
      }

      const ytPlayerArgs = window.ytplayer?.config?.args;
      if (ytPlayerArgs?.player_response) {
        const response = typeof ytPlayerArgs.player_response === 'string'
          ? JSON.parse(ytPlayerArgs.player_response)
          : ytPlayerArgs.player_response;

        if (response?.videoDetails) {
          return response.videoDetails;
        }
      }
    } catch (error) {
      console.warn('Error accessing YouTube player details:', error);
    }

    return null;
  }

  getYouTubePlaylistTitleFromData() {
    try {
      const data = window.ytInitialData;
      if (!data) return '';

      const playlistContainer = data?.contents?.twoColumnWatchNextResults?.playlist;
      if (!playlistContainer) return '';

      const sources = [
        playlistContainer.playlist?.title,
        playlistContainer.playlistPanelRenderer?.title,
        playlistContainer.playlistPanelRenderer?.header?.playlistHeaderRenderer?.title
      ];

      for (const source of sources) {
        if (!source) continue;
        if (typeof source === 'string' && source.trim()) {
          return source.trim();
        }
        if (source.simpleText && source.simpleText.trim()) {
          return source.simpleText.trim();
        }
        if (Array.isArray(source.runs)) {
          const text = source.runs.map(run => run.text).join('').trim();
          if (text) {
            return text;
          }
        }
      }
    } catch (error) {
      console.warn('Error accessing YouTube playlist data:', error);
    }

    return '';
  }


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
    const hostname = window.location.hostname.toLowerCase();
    let title = '';

    try {
      if (hostname.includes('youtube.com')) {
        const videoDetails = this.getYouTubePlayerDetails();
        if (videoDetails?.title) {
          title = videoDetails.title;
        }

        if (!title) {
          const selectors = [
            'ytd-watch-metadata h1 > yt-formatted-string',
            'ytd-watch-metadata #title h1',
            '#title.ytd-watch-metadata h1',
            '#title h1.ytd-watch-metadata',
            '#container h1.ytd-watch-metadata',
            '.ytp-title-text'
          ];

          for (const selector of selectors) {
            const titleElement = document.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }
        }

        if (!title && document.title) {
          title = document.title.replace(/ - YouTube$/, '');
        }
      } else if (hostname.includes('vimeo.com')) {
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

        if (!title && document.title) {
          title = document.title.replace(/ on Vimeo$/, '');
        }
      } else if (hostname.includes('twitch.tv')) {
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

        if (!title && document.title) {
          title = document.title.replace(/ - Twitch$/, '');
        }
      } else {
        title = document.title;
      }
    } catch (error) {
      console.warn('Error extracting video title:', error);
      title = document.title;
    }

    return this.sanitizeFilePart(title, 100);
  }

  getChannelName() {
    const hostname = window.location.hostname.toLowerCase();
    let channelName = '';

    try {
      if (hostname.includes('youtube.com')) {
        const videoDetails = this.getYouTubePlayerDetails();
        if (videoDetails?.author) {
          channelName = videoDetails.author;
        }

        const selectors = [
          'ytd-video-owner-renderer #channel-name yt-formatted-string a',
          'ytd-watch-metadata #owner-name a',
          'ytd-watch-metadata ytd-channel-name a',
          '#owner-text a.yt-simple-endpoint',
          '#channel-name a.yt-simple-endpoint'
        ];
        
        if (!channelName) {
          for (const selector of selectors) {
            const channelElement = document.querySelector(selector);
            if (channelElement && channelElement.textContent.trim()) {
              channelName = channelElement.textContent.trim();
              break;
            }
          }
        }

        if (!channelName) {
          const metaAuthor = document.querySelector('meta[itemprop="author"]') ||
            document.querySelector('link[itemprop="name"]');
          if (metaAuthor?.content) {
            channelName = metaAuthor.content;
          }
        }
      } else if (hostname.includes('vimeo.com')) {

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

    return this.sanitizeFilePart(channelName, 50);
  }

  getPlaylistName() {
    const hostname = window.location.hostname.toLowerCase();
    let playlistName = '';

    try {
      if (hostname.includes('youtube.com')) {

        const urlParams = new URLSearchParams(window.location.search);
        const playlistId = urlParams.get('list');
        
        if (playlistId) {
          playlistName = this.getYouTubePlaylistTitleFromData();

          if (!playlistName) {
            const playlistSelectors = [
              'ytd-playlist-panel-renderer #header #title-text',
              'ytd-playlist-panel-renderer #header h3',
              'ytd-playlist-panel-renderer #title a',
              'ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"] ytd-playlist-panel-renderer #header #title-text'
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
      }
    } catch (error) {
      console.warn('Error extracting playlist name:', error);
    }

    return this.sanitizeFilePart(playlistName, 50);
  }

  getCurrentChapter() {
    const hostname = window.location.hostname;
    let chapter = '';

    try {
      if (hostname.includes('youtube.com')) {

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

    if (template && template.trim()) {
      return this.applyTemplate(template, metadata);
    }
    

    if (this.settings.filenameTemplate && this.settings.filenameTemplate.trim()) {
      return this.applyTemplate(this.settings.filenameTemplate, metadata);
    }
    

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

      '{channel}': metadata.channelName || '',
      '{playlist}': metadata.playlistName || ''
    };

    let filename = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
      filename = filename.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
    });


    filename = filename
      .replace(/[-_\s]+/g, '-')
      .replace(/^[-_\s]+|[-_\s]+$/g, '')
      .replace(/\.png$/, '') + '.png';

    return filename;
  }

  createTextInput(overlay, canvas, ctx, x, y) {

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
  confirmBtn.textContent = 'OK';
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
  cancelBtn.textContent = 'Cancel';
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
    const pollInterval = 150;
    

    const hostname = window.location.hostname.toLowerCase();
    const isIITMadras = hostname.includes('seek.onlinedegree.iitm.ac.in') ||
                       hostname.includes('iitm.ac.in') ||
                       (hostname.includes('seek.') && hostname.includes('iit'));
    
    if (isIITMadras) {
      console.log('ScreenshotManager: IIT Madras detected - using ultra-aggressive video detection');
    }
    
    return new Promise((resolve) => {
      const checkForVideo = () => {

        let video = this.findVideoElement();
        

        if (!video) {

          const allVideos = document.querySelectorAll('video');
          console.log(`ScreenshotManager: Found ${allVideos.length} video elements, analyzing...`);
          
          for (const videoEl of allVideos) {

            if (videoEl.readyState >= 1 ||
                videoEl.networkState !== HTMLMediaElement.NETWORK_EMPTY ||
                videoEl.currentTime > 0 ||
                videoEl.duration > 0 ||
                videoEl.src || videoEl.currentSrc ||
                (videoEl.clientWidth > 50 && videoEl.clientHeight > 50)) {
              
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


if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.screenshotManager = new ScreenshotManager();
    });
  } else {
    window.screenshotManager = new ScreenshotManager();
  }
}
