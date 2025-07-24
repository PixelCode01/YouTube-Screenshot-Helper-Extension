/**
 * Common error patterns and handling utilities for YouTube Screenshot Helper
 * This module provides standardized error patterns that can be used across different contexts
 */

/**
 * Common error patterns that occur in browser extensions
 */
const ERROR_PATTERNS = {
  EXTENSION_CONTEXT: {
    patterns: [
      'Extension context invalidated',
      'receiving end does not exist',
      'Could not establish connection'
    ],
    type: 'EXTENSION_CONTEXT',
    severity: 'HIGH',
    recovery: 'RELOAD_EXTENSION'
  },
  
  DOWNLOAD_PATH: {
    patterns: [
      'filename',
      'path',
      'Invalid filename',
      'path is not allowed',
      'Invalid file path'
    ],
    type: 'DOWNLOAD_PATH',
    severity: 'MEDIUM',
    recovery: 'FALLBACK_PATH'
  },
  
  BROWSER_API: {
    patterns: [
      'browser.downloads is not available',
      'browser.storage is not available',
      'browser.tabs is not available'
    ],
    type: 'BROWSER_API',
    severity: 'HIGH',
    recovery: 'POLYFILL_CHECK'
  },
  
  CONTENT_SCRIPT: {
    patterns: [
      'Cannot access contents of url',
      'Script injection failed',
      'Content script not loaded'
    ],
    type: 'CONTENT_SCRIPT',
    severity: 'MEDIUM',
    recovery: 'RETRY_INJECTION'
  },
  
  STORAGE: {
    patterns: [
      'storage quota exceeded',
      'storage not available',
      'QUOTA_BYTES_PER_ITEM quota exceeded'
    ],
    type: 'STORAGE',
    severity: 'MEDIUM',
    recovery: 'CLEAR_STORAGE'
  }
};

/**
 * Analyzes an error and returns its pattern information
 * @param {Error} error - The error to analyze
 * @returns {Object|null} Pattern information or null if no pattern matches
 */
function analyzeError(error) {
  const message = error.message || '';
  
  for (const [patternName, patternInfo] of Object.entries(ERROR_PATTERNS)) {
    if (patternInfo.patterns.some(pattern => message.includes(pattern))) {
      return {
        name: patternName,
        ...patternInfo,
        originalError: error
      };
    }
  }
  
  return null;
}

/**
 * Creates a standardized error response based on error analysis
 * @param {Error} error - The original error
 * @param {string} context - The context where the error occurred
 * @param {string} operation - The operation that failed
 * @returns {Object} Standardized error response
 */
function createStandardizedErrorResponse(error, context, operation) {
  const pattern = analyzeError(error);
  
  return {
    success: false,
    error: {
      message: error.message || 'Unknown error',
      context,
      operation,
      timestamp: new Date().toISOString(),
      pattern: pattern ? {
        type: pattern.type,
        severity: pattern.severity,
        recovery: pattern.recovery
      } : null,
      stack: error.stack
    }
  };
}

/**
 * Recovery strategies for different error patterns
 */
const RECOVERY_STRATEGIES = {
  RELOAD_EXTENSION: {
    description: 'Extension context was invalidated, reload required',
    action: 'reload',
    userMessage: 'Please reload the extension to continue'
  },
  
  FALLBACK_PATH: {
    description: 'Use fallback path for downloads',
    action: 'fallback',
    userMessage: 'Using simplified filename due to path restrictions'
  },
  
  POLYFILL_CHECK: {
    description: 'Check browser polyfill configuration',
    action: 'check_polyfill',
    userMessage: 'Browser compatibility issue detected'
  },
  
  RETRY_INJECTION: {
    description: 'Retry content script injection',
    action: 'retry',
    userMessage: 'Retrying operation...'
  },
  
  CLEAR_STORAGE: {
    description: 'Clear storage to free up space',
    action: 'clear_storage',
    userMessage: 'Storage limit reached, consider clearing old data'
  }
};

/**
 * Gets recovery strategy for an error pattern
 * @param {string} recoveryType - The recovery type from error pattern
 * @returns {Object|null} Recovery strategy or null if not found
 */
function getRecoveryStrategy(recoveryType) {
  return RECOVERY_STRATEGIES[recoveryType] || null;
}

// Make functions available globally for importScripts
if (typeof globalThis !== 'undefined') {
  globalThis.ERROR_PATTERNS = ERROR_PATTERNS;
  globalThis.analyzeError = analyzeError;
  globalThis.createStandardizedErrorResponse = createStandardizedErrorResponse;
  globalThis.RECOVERY_STRATEGIES = RECOVERY_STRATEGIES;
  globalThis.getRecoveryStrategy = getRecoveryStrategy;
}