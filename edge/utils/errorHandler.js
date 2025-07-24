/**
 * Common error handling utility for YouTube Screenshot Helper
 * This utility provides standardized error handling across Chrome and Edge versions
 */

class ErrorHandler {
  /**
   * Creates a new ErrorHandler instance
   * @param {string} context - The context where this handler is used (e.g., 'background', 'content', 'popup')
   */
  constructor(context = 'general') {
    this.context = context;
    // Import browser detector if available, otherwise fallback to basic detection
    this.browserDetector = (typeof window !== 'undefined' && window.browserDetector) || 
                          this.createFallbackDetector();
    this.isEdge = this.browserDetector.isEdge();
    this.isBrowserDetected = true;
    console.log(`ErrorHandler: Browser detected as ${this.browserDetector.getBrowserName()}`);
  }

  /**
   * Creates a fallback browser detector if the main one isn't available
   * @returns {Object} Fallback detector object
   */
  createFallbackDetector() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const isEdge = ua.includes('Edg/');
    
    return {
      isEdge: () => isEdge,
      isChrome: () => ua.includes('Chrome/') && !isEdge,
      getBrowserName: () => isEdge ? 'Edge' : (ua.includes('Chrome/') ? 'Chrome' : 'Unknown')
    };
  }

  /**
   * Handles an error with standardized logging and optional callback
   * @param {Error} error - The error to handle
   * @param {string} operation - Description of the operation that failed
   * @param {Function} [callback] - Optional callback to execute after handling
   * @returns {Object} Error information object
   */
  handleError(error, operation, callback = null) {
    // Analyze error using common patterns
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

    // Log the error with consistent format
    console.error(`=== ERROR in ${this.context} (${operation}) ===`);
    console.error(`Message: ${errorInfo.message}`);
    console.error(`Browser: ${errorInfo.browser}`);
    if (errorPattern) {
      console.error(`Pattern: ${errorPattern.type} (${errorPattern.severity})`);
      console.error(`Recovery: ${errorPattern.recovery}`);
    }
    console.error(`Stack: ${errorInfo.stack}`);

    // Apply browser-specific handling if needed
    if (this.isEdge && this.isEdgeSpecificError(error)) {
      console.log('Applying Edge-specific error handling');
      errorInfo.edgeSpecific = true;
      this.handleEdgeSpecificError(error, operation);
    }

    // Apply pattern-based recovery if available
    if (errorPattern) {
      const recoveryStrategy = getRecoveryStrategy(errorPattern.recovery);
      if (recoveryStrategy) {
        console.log(`Recovery strategy: ${recoveryStrategy.description}`);
        errorInfo.recoveryStrategy = recoveryStrategy;
      }
    }

    // Execute callback if provided
    if (callback && typeof callback === 'function') {
      try {
        callback(errorInfo);
      } catch (callbackError) {
        console.error('Error in error handling callback:', callbackError);
      }
    }

    return errorInfo;
  }

  /**
   * Handles errors in async functions with standardized try/catch pattern
   * @param {Function} asyncFn - The async function to execute
   * @param {string} operation - Description of the operation
   * @param {Function} [errorCallback] - Optional callback for error handling
   * @returns {Promise<*>} Result of the async function or error info
   */
  async handleAsyncOperation(asyncFn, operation, errorCallback = null) {
    try {
      return await asyncFn();
    } catch (error) {
      const errorInfo = this.handleError(error, operation, errorCallback);
      return { success: false, error: errorInfo };
    }
  }

  /**
   * Checks if an error is related to extension context
   * @param {Error} error - The error to check
   * @returns {boolean} True if it's an extension context error
   */
  isExtensionError(error) {
    const message = error.message || '';
    return message.includes('Extension context invalidated') || 
           message.includes('receiving end does not exist') ||
           message.includes('Could not establish connection');
  }

  /**
   * Checks if an error is Edge-specific
   * @param {Error} error - The error to check
   * @returns {boolean} True if it's an Edge-specific error
   */
  isEdgeSpecificError(error) {
    const message = error.message || '';
    return message.includes('Edge does not support') || 
           message.includes('MS-Edge-') ||
           message.includes('path is not allowed') ||
           message.includes('Invalid file path');
  }

  /**
   * Handles Edge-specific errors
   * @param {Error} error - The Edge-specific error
   * @param {string} operation - The operation that failed
   */
  handleEdgeSpecificError(error, operation) {
    const message = error.message || '';
    
    // Handle download path errors in Edge
    if (operation.includes('download') && 
        (message.includes('path') || message.includes('file'))) {
      console.log('Edge download path error detected, will use fallback path');
      // Specific handling will be implemented in the download function
    }
    
    // Handle other Edge-specific errors as needed
  }

  /**
   * Creates a standardized error response object
   * @param {string} message - Error message
   * @param {string} [code=null] - Optional error code
   * @returns {Object} Standardized error response
   */
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

  /**
   * Creates a standardized error response using common error patterns
   * @param {Error} error - The error object
   * @param {string} operation - The operation that failed
   * @returns {Object} Standardized error response with pattern analysis
   */
  createStandardizedResponse(error, operation) {
    return createStandardizedErrorResponse(error, this.context, operation);
  }
}

// Export the ErrorHandler class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
  module.exports.default = ErrorHandler;
} else if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
} else if (typeof globalThis !== 'undefined') {
  globalThis.ErrorHandler = ErrorHandler;
}