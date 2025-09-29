

class ErrorHandler {
  
  constructor(context = 'general') {
    this.context = context;

    this.browserDetector = (typeof window !== 'undefined' && window.browserDetector) || 
                          this.createFallbackDetector();
    this.isEdge = this.browserDetector.isEdge();
    this.isBrowserDetected = true;
    console.log(`ErrorHandler: Browser detected as ${this.browserDetector.getBrowserName()}`);
  }

  
  createFallbackDetector() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const isEdge = ua.includes('Edg/');
    
    return {
      isEdge: () => isEdge,
      isChrome: () => ua.includes('Chrome/') && !isEdge,
      getBrowserName: () => isEdge ? 'Edge' : (ua.includes('Chrome/') ? 'Chrome' : 'Unknown')
    };
  }

  
  handleError(error, operation, callback = null) {

    const errorPattern = analyzeError(error);
    
    const errorInfo = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: this.context,
      operation,
      timestamp: new Date().toISOString(),
      browser: this.browserDetector.getBrowserName(),
      isExtensionError: this.isExtensionError(error),
      pattern: errorPattern
    };


    console.error(`=== ERROR in ${this.context} (${operation}) ===`);
    console.error(`Message: ${errorInfo.message}`);
    console.error(`Browser: ${errorInfo.browser}`);
    if (errorPattern) {
      console.error(`Pattern: ${errorPattern.type} (${errorPattern.severity})`);
      console.error(`Recovery: ${errorPattern.recovery}`);
    }
    console.error(`Stack: ${errorInfo.stack}`);


    if (this.isEdge && this.isEdgeSpecificError(error)) {
      console.log('Applying Edge-specific error handling');
      errorInfo.edgeSpecific = true;
      this.handleEdgeSpecificError(error, operation);
    }


    if (errorPattern) {
      const recoveryStrategy = getRecoveryStrategy(errorPattern.recovery);
      if (recoveryStrategy) {
        console.log(`Recovery strategy: ${recoveryStrategy.description}`);
        errorInfo.recoveryStrategy = recoveryStrategy;
      }
    }


    if (callback && typeof callback === 'function') {
      try {
        callback(errorInfo);
      } catch (callbackError) {
        console.error('Error in error handling callback:', callbackError);
      }
    }

    return errorInfo;
  }

  
  async handleAsyncOperation(asyncFn, operation, errorCallback = null) {
    try {
      return await asyncFn();
    } catch (error) {
      const errorInfo = this.handleError(error, operation, errorCallback);
      return { success: false, error: errorInfo };
    }
  }

  
  isExtensionError(error) {
    const message = error.message || '';
    return message.includes('Extension context invalidated') || 
           message.includes('receiving end does not exist') ||
           message.includes('Could not establish connection');
  }

  
  isEdgeSpecificError(error) {
    const message = error.message || '';
    return message.includes('Edge does not support') || 
           message.includes('MS-Edge-') ||
           message.includes('path is not allowed') ||
           message.includes('Invalid file path');
  }

  
  handleEdgeSpecificError(error, operation) {
    const message = error.message || '';
    

    if (operation.includes('download') && 
        (message.includes('path') || message.includes('file'))) {
      console.log('Edge download path error detected, will use fallback path');

    }
    

  }

  
  createErrorResponse(message, code = null) {
    return {
      success: false,
      error: {
        message,
        code,
        context: this.context,
        browser: this.browserDetector.getBrowserName(),
        timestamp: new Date().toISOString()
      }
    };
  }

  
  createStandardizedResponse(error, operation) {
    return createStandardizedErrorResponse(error, this.context, operation);
  }
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
  module.exports.default = ErrorHandler;
} else if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
} else if (typeof globalThis !== 'undefined') {
  globalThis.ErrorHandler = ErrorHandler;
}