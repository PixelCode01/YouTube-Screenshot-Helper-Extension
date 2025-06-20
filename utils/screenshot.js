// Screenshot utility for YouTube Screenshot Helper

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
    // Remove any existing fullscreen popups that might be left from previous sessions
    const existingPopups = document.querySelectorAll('.fullscreen-screenshot-popup');
    existingPopups.forEach(popup => popup.remove());
    
    // Also remove the popup styles
    const popupStyles = document.querySelector('#fullscreen-popup-styles');
    if (popupStyles) {
      popupStyles.remove();
    }
  }

  async captureScreenshot() {
    console.log('ScreenshotManager: Starting screenshot capture');
    
    try {
      // Step 1: Check if video is playing and pause it
      const video = this.findVideoElement();
      let wasPlaying = false;
      
      if (video && !video.paused) {
        wasPlaying = true;
        video.pause();
        console.log('ScreenshotManager: Video paused (was playing)');
      }

      // Step 2: Hide controls if auto-hide is enabled
      let hiddenElements = [];
      if (this.settings.autoHideControls) {
        hiddenElements = this.hideVideoControls();
        console.log('ScreenshotManager: Controls hidden');
      }

      // Step 3: Wait a moment for UI to settle
      const delay = this.settings.captureDelay || 100;
      await this.sleep(delay);

      // Step 4: Capture the screenshot
      const dataUrl = await this.captureVideoFrame(video);
      
      // Step 5: Restore hidden elements
      if (hiddenElements.length > 0) {
        this.restoreVideoControls(hiddenElements);
        console.log('ScreenshotManager: Controls restored');
      }

      // Step 6: Resume video if it was playing
      if (wasPlaying && video) {
        setTimeout(() => {
          video.play();
          console.log('ScreenshotManager: Video resumed');
        }, 200); // Small delay to ensure controls are restored
      }

      // Step 7: Process and download the screenshot
      if (dataUrl) {
        await this.processScreenshot(dataUrl);
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
    // Try different selectors for various video sites
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
      
      // Generic fallback
      'video'
    ];

    // First try to find playing videos
    for (const selector of selectors) {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        if (video && video.videoWidth && video.videoHeight && !video.paused) {
          console.log('Found playing video:', video);
          return video;
        }
      }
    }

    // Then try any video with dimensions
    for (const selector of selectors) {
      const videos = document.querySelectorAll(selector);
      for (const video of videos) {
        if (video && video.videoWidth && video.videoHeight) {
          console.log('Found video with dimensions:', video);
          return video;
        }
      }
    }

    // Finally try any video element
    const allVideos = document.querySelectorAll('video');
    for (const video of allVideos) {
      if (video && (video.videoWidth > 0 || video.clientWidth > 100)) {
        console.log('Found fallback video:', video);
        return video;
      }
    }

    console.log('No video element found');
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
      throw new Error('No video element found');
    }

    // Set canvas dimensions to match video
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;

    // Draw video frame to canvas
    this.context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Convert to data URL
    return this.canvas.toDataURL('image/png', this.settings.screenshotQuality || 0.9);
  }

  async processScreenshot(dataUrl) {
    // Refresh settings to get latest title builder preferences
    await this.updateSettings();
    
    // Extract video metadata
    const metadata = this.extractVideoMetadata();
    
    const filename = this.generateCustomFilename(metadata, this.settings.filenameTemplate);
    
    console.log('Generated filename:', filename);
    
    // If annotation mode is enabled, show annotation interface
    if (this.settings.annotationMode) {
      this.showAnnotationInterface(dataUrl, filename);
    } else {
      // Direct download
      await this.downloadScreenshot(dataUrl, filename);
      
      // Also upload to cloud if enabled
      if (this.settings.uploadToCloud && this.settings.cloudService !== 'none') {
        await this.uploadToCloud(dataUrl, filename);
      }
    }

    this.showNotification(`Screenshot saved as: ${filename}`, 'success');
  }

  async downloadScreenshot(dataUrl, filename) {
    try {
      console.log('ScreenshotManager: Starting download process');
      console.log('Settings:', this.settings);
      
      // Generate folder path if folder organization is enabled
      let folderPath = '';
      if (this.settings.organizeFolders && this.settings.organizeFolders !== 'none') {
        console.log('Folder organization enabled:', this.settings.organizeFolders);
        
        const metadata = this.extractVideoMetadata();
        console.log('Extracted metadata:', metadata);
        
        folderPath = this.generateFolderPath(metadata);
        console.log('Generated folder path:', folderPath);
      } else {
        console.log('Folder organization disabled or set to none');
      }

      // Send message to background script to handle download
      console.log('Sending download message to background script');
      const response = await chrome.runtime.sendMessage({
        action: 'downloadScreenshot',
        dataUrl: dataUrl,
        filename: filename,
        folderPath: folderPath
      });

      if (!response.success) {
        throw new Error(response.error);
      }
      
      console.log('Download completed successfully');
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to direct download
      console.log('Falling back to direct download');
      this.fallbackDownload(dataUrl, filename);
    }
  }

  /**
   * Upload screenshot to cloud storage
   */
  async uploadToCloud(dataUrl, filename) {
    try {
      const service = this.settings.cloudService;
      console.log(`Uploading to cloud service: ${service}`);

      if (service === 'imgur') {
        // Use simplified Imgur upload
        const result = await this.uploadToImgur(dataUrl, filename);
        if (result.success) {
          this.showNotification(`Screenshot uploaded to Imgur: ${result.url}`, 'success');
          console.log('Imgur upload successful:', result);
          
          // Copy URL to clipboard if possible
          if (navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(result.url);
              this.showNotification('Image URL copied to clipboard!', 'info');
            } catch (e) {
              console.log('Failed to copy to clipboard:', e);
            }
          }
          
          return result;
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } else {
        throw new Error(`Cloud service ${service} not supported yet`);
      }
    } catch (error) {
      console.error('Cloud upload failed:', error);
      this.showNotification(`Cloud upload failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async uploadToImgur(dataUrl, filename) {
    try {
      // Convert data URL to base64
      const base64Data = dataUrl.split(',')[1];
      
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7', // Public Imgur client ID
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          type: 'base64',
          title: filename.replace('.png', ''),
          description: `Screenshot captured with YouTube Screenshot Helper on ${new Date().toLocaleDateString()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          url: result.data.link,
          deleteUrl: `https://imgur.com/delete/${result.data.deletehash}`,
          service: 'imgur',
          id: result.data.id
        };
      } else {
        throw new Error(result.data?.error || 'Invalid response from Imgur');
      }
    } catch (error) {
      console.error('Imgur upload failed:', error);
      return {
        success: false,
        error: error.message,
        service: 'imgur'
      };
    }
  }

  generateFolderPath(metadata) {
    if (!this.settings.organizeFolders || this.settings.organizeFolders === 'none') {
      return '';
    }

    let folderName = '';
    
    switch (this.settings.organizeFolders) {
      case 'channel':
        folderName = metadata.channelName || 'Unknown Channel';
        break;
      case 'playlist':
        folderName = metadata.playlistName || metadata.channelName || 'No Playlist';
        break;
      case 'video':
        folderName = metadata.title || 'Unknown Video';
        break;
      case 'date':
        folderName = new Date().toISOString().split('T')[0];
        break;
      case 'channel-date':
        const channelName = metadata.channelName || 'Unknown Channel';
        const date = new Date().toISOString().split('T')[0];
        folderName = `${channelName}/${date}`;
        break;
      case 'custom':
        // Use custom folder pattern if specified
        if (this.settings.customFolderPattern) {
          folderName = this.applyTemplate(this.settings.customFolderPattern, metadata);
          // Remove .png extension that applyTemplate adds
          folderName = folderName.replace('.png', '');
        }
        break;
      default:
        return '';
    }

    // Clean folder name for file system compatibility
    // Split by forward slash to preserve folder hierarchy
    const pathParts = folderName.split('/');
    const cleanedParts = pathParts.map(part => 
      part
        .replace(/[<>:"|?*\\]/g, '_') // Remove illegal chars but keep forward slash
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50) // Limit each part length
    ).filter(part => part.length > 0); // Remove empty parts
    
    folderName = cleanedParts.join('/');

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
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      
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
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
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

    canvas.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        
        // Handle text tool
        if (currentTool === 'text') {
          const text = prompt('Enter text:');
          if (text) {
            const color = overlay.querySelector('.color-picker').value;
            const lineWidth = overlay.querySelector('.line-width-select').value;
            ctx.fillStyle = color;
            ctx.font = `${lineWidth * 4}px Arial`;
            ctx.fillText(text, startX, startY);
          }
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
    this.settings = await window.storageManager.getSettings();
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
}

// Initialize screenshot manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.screenshotManager = new ScreenshotManager();
  });
} else {
  window.screenshotManager = new ScreenshotManager();
}
