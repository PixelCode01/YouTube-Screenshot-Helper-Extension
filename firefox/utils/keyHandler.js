

class KeyHandler {
  constructor() {
    this.settings = null;
    this.isListening = false;
    this.boundKeyHandler = this.handleKeyPress.bind(this);
    this.lastTriggerTime = 0;
    this.debounceDelay = 500;
    this.init();
  }

  async init() {
    this.settings = await window.storageManager.getSettings();
    this.startListening();
  }

  startListening() {
    if (this.isListening) return;
    
    document.addEventListener('keydown', this.boundKeyHandler, true);
    this.isListening = true;
  }

  stopListening() {
    if (!this.isListening) return;
    
    document.removeEventListener('keydown', this.boundKeyHandler, true);
    this.isListening = false;
    console.log('KeyHandler: Stopped listening for keypresses');
  }

  async handleKeyPress(event) {

    const currentTime = Date.now();
    if (currentTime - this.lastTriggerTime < this.debounceDelay) {
      console.log('KeyHandler: Debounced - ignoring rapid keypress');
      return;
    }


    if (!this.settings) {
      this.settings = await window.storageManager.getSettings();
    }


    const shouldHandle = this.shouldHandleKey(event);
    
    if (!shouldHandle) {
      return;
    }


    this.lastTriggerTime = currentTime;


    const isFullscreen = this.isInFullscreen();
    
    if (this.settings.fullscreenOnly && !isFullscreen) {
      console.log('KeyHandler: Fullscreen required but not in fullscreen mode');
      return;
    }


    const isEnabledSite = await window.storageManager.isCurrentSiteEnabled();
    
    if (!isEnabledSite) {
      console.log('KeyHandler: Site not enabled');
      return;
    }


    if (this.settings.preventDefault) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    console.log('KeyHandler: Triggering screenshot capture');
    

    const configuredKey = this.settings.fullscreenShortcut || this.settings.shortcutKey || 'shift+enter';
    

    const isShiftEnter = event.code === 'Enter' && event.shiftKey;
    

    let forcePreview = false;
    let skipAnnotation = false;
    
    if (isShiftEnter && configuredKey === 'shift+enter') {

      if (this.settings.annotationMode === true) {

        forcePreview = true;
        skipAnnotation = false;
      } else {

        forcePreview = false;
        skipAnnotation = true;
      }
    } else {

      forcePreview = false;
      skipAnnotation = false;
    }
    
    console.log('=== KEY HANDLER DEBUG ===');
    console.log('KeyHandler: Event details:');
    console.log('  - event.code:', event.code);
    console.log('  - event.shiftKey:', event.shiftKey);
    console.log('  - configuredKey:', configuredKey);
    console.log('  - isShiftEnter:', isShiftEnter);
    console.log('  - forcePreview:', forcePreview);
    console.log('  - skipAnnotation:', skipAnnotation);
    console.log('=== END KEY HANDLER DEBUG ===');
    

    if (window.screenshotManager) {
      window.screenshotManager.captureScreenshot({}, forcePreview, skipAnnotation);
    } else {
      console.error('KeyHandler: ScreenshotManager not available');
    }
  }

  shouldHandleKey(event) {

    const key = (this.settings && this.settings.fullscreenShortcut) || (this.settings && this.settings.shortcutKey) || 'shift+enter';
    
    console.log('KeyHandler: Checking key press - event.code:', event.code, 'setting key:', key);
    

    if (this.isInputFocused()) {
      console.log('KeyHandler: Input focused, ignoring keypress');
      return false;
    }
    

    switch (key.toLowerCase()) {

      case 'space':
        return event.code === 'Space' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'enter':
        return event.code === 'Enter' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
        

      case 'shift+enter':
        return event.code === 'Enter' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+space':
        return event.code === 'Space' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
        

      case 'shift+keys':
        return event.code === 'KeyS' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keya':
        return event.code === 'KeyA' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyb':
        return event.code === 'KeyB' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyc':
        return event.code === 'KeyC' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyd':
        return event.code === 'KeyD' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keye':
        return event.code === 'KeyE' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyf':
        return event.code === 'KeyF' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyg':
        return event.code === 'KeyG' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyh':
        return event.code === 'KeyH' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyi':
        return event.code === 'KeyI' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyj':
        return event.code === 'KeyJ' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyk':
        return event.code === 'KeyK' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyl':
        return event.code === 'KeyL' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keym':
        return event.code === 'KeyM' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyn':
        return event.code === 'KeyN' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyo':
        return event.code === 'KeyO' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyp':
        return event.code === 'KeyP' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyq':
        return event.code === 'KeyQ' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyr':
        return event.code === 'KeyR' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyt':
        return event.code === 'KeyT' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyu':
        return event.code === 'KeyU' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyv':
        return event.code === 'KeyV' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyw':
        return event.code === 'KeyW' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyx':
        return event.code === 'KeyX' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyy':
        return event.code === 'KeyY' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      case 'shift+keyz':
        return event.code === 'KeyZ' && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
        

      case 'keys':
        return event.code === 'KeyS' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keya':
        return event.code === 'KeyA' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyb':
        return event.code === 'KeyB' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyc':
        return event.code === 'KeyC' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyd':
        return event.code === 'KeyD' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keye':
        return event.code === 'KeyE' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyf':
        return event.code === 'KeyF' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyg':
        return event.code === 'KeyG' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyh':
        return event.code === 'KeyH' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyi':
        return event.code === 'KeyI' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyj':
        return event.code === 'KeyJ' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyk':
        return event.code === 'KeyK' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyl':
        return event.code === 'KeyL' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keym':
        return event.code === 'KeyM' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyn':
        return event.code === 'KeyN' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyo':
        return event.code === 'KeyO' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyp':
        return event.code === 'KeyP' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyq':
        return event.code === 'KeyQ' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyr':
        return event.code === 'KeyR' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyt':
        return event.code === 'KeyT' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyu':
        return event.code === 'KeyU' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyv':
        return event.code === 'KeyV' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyw':
        return event.code === 'KeyW' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyx':
        return event.code === 'KeyX' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyy':
        return event.code === 'KeyY' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      case 'keyz':
        return event.code === 'KeyZ' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
      default:
        return event.code === key;
    }
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


  isInputFocused() {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const inputTypes = ['input', 'textarea', 'select'];
    const isInput = inputTypes.includes(activeElement.tagName.toLowerCase());
    const isContentEditable = activeElement.contentEditable === 'true';
    
    return isInput || isContentEditable;
  }


  async updateSettings() {
    this.settings = await window.storageManager.getSettings();
  }

  destroy() {
    this.stopListening();
  }
}


if (typeof window !== 'undefined') {
  window.keyHandler = new KeyHandler();
}
