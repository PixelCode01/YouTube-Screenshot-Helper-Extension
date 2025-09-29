


import { browserDetector } from './browserDetector.js';


export const BrowserUtils = {
  
  isEdge() {
    return browserDetector.isEdge();
  },

  
  isChrome() {
    return browserDetector.isChrome();
  },

  
  getBrowserName() {
    return browserDetector.getBrowserName();
  },

  
  getBrowserVersion() {
    return browserDetector.getBrowserVersion();
  },

  
  getBrowserInfo() {
    return browserDetector.getBrowserInfo();
  },

  
  supportsFeature(feature) {
    return browserDetector.supportsFeature(feature);
  },

  
  getBrowserLimitations() {
    return browserDetector.getBrowserLimitations();
  },

  
  getBrowserSpecificConfig(context) {
    return browserDetector.getBrowserSpecificConfig(context);
  },

  
  logBrowserInfo() {
    browserDetector.logBrowserInfo();
  },

  
  getDetector() {
    return browserDetector;
  }
};


export const isEdgeBrowser = () => BrowserUtils.isEdge();
export const isChromeBrowser = () => BrowserUtils.isChrome();
export const getBrowserName = () => BrowserUtils.getBrowserName();


if (typeof window !== 'undefined') {
  window.BrowserUtils = BrowserUtils;
  window.isEdgeBrowser = isEdgeBrowser;
  window.isChromeBrowser = isChromeBrowser;
  window.getBrowserName = getBrowserName;
}


export default BrowserUtils;