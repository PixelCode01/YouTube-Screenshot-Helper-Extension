/**
 * Browser utilities for consistent browser detection across all contexts
 * This module provides a simple interface to the browser detection functionality
 * that works in all extension contexts (background, content, popup, options)
 */

// Import the main browser detector
import { browserDetector } from './browserDetector.js';

/**
 * Simple browser detection functions for easy use across the extension
 */
export const BrowserUtils = {
  /**
   * Check if running in Microsoft Edge
   * @returns {boolean} True if Edge browser
   */
  isEdge() {
    return browserDetector.isEdge();
  },

  /**
   * Check if running in Google Chrome
   * @returns {boolean} True if Chrome browser
   */
  isChrome() {
    return browserDetector.isChrome();
  },

  /**
   * Get the browser name
   * @returns {string} Browser name (Edge, Chrome, or Unknown)
   */
  getBrowserName() {
    return browserDetector.getBrowserName();
  },

  /**
   * Get the browser version
   * @returns {string} Browser version string
   */
  getBrowserVersion() {
    return browserDetector.getBrowserVersion();
  },

  /**
   * Get complete browser information
   * @returns {Object} Complete browser info object
   */
  getBrowserInfo() {
    return browserDetector.getBrowserInfo();
  },

  /**
   * Check if browser supports a specific feature
   * @param {string} feature - Feature to check
   * @returns {boolean} True if feature is supported
   */
  supportsFeature(feature) {
    return browserDetector.supportsFeature(feature);
  },

  /**
   * Get browser-specific limitations
   * @returns {Object} Object describing browser limitations
   */
  getBrowserLimitations() {
    return browserDetector.getBrowserLimitations();
  },

  /**
   * Get browser-specific configuration for a context
   * @param {string} context - Context where config is needed
   * @returns {Object} Browser-specific configuration
   */
  getBrowserSpecificConfig(context) {
    return browserDetector.getBrowserSpecificConfig(context);
  },

  /**
   * Log browser information for debugging
   */
  logBrowserInfo() {
    browserDetector.logBrowserInfo();
  },

  /**
   * Get the singleton browser detector instance
   * @returns {Object} Browser detector instance
   */
  getDetector() {
    return browserDetector;
  }
};

// Legacy compatibility functions for backward compatibility
export const isEdgeBrowser = () => BrowserUtils.isEdge();
export const isChromeBrowser = () => BrowserUtils.isChrome();
export const getBrowserName = () => BrowserUtils.getBrowserName();

// Make available globally for non-module contexts
if (typeof window !== 'undefined') {
  window.BrowserUtils = BrowserUtils;
  window.isEdgeBrowser = isEdgeBrowser;
  window.isChromeBrowser = isChromeBrowser;
  window.getBrowserName = getBrowserName;
}

// Default export
export default BrowserUtils;