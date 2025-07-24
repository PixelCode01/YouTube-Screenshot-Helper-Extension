# Design Document: Edge Compatibility for YouTube Screenshot Helper

## Overview

This design document outlines the approach for making the YouTube Screenshot Helper extension fully compatible with Microsoft Edge. The extension was originally developed for Chrome, and while an Edge version exists, it contains errors that need to be fixed. This document details the necessary changes to ensure the extension works seamlessly in Edge while maintaining all functionality available in the Chrome version.

## Architecture

The YouTube Screenshot Helper extension follows a standard browser extension architecture with the following components:

1. **Background Script**: Handles core functionality like screenshot downloading, settings management, and communication with content scripts.
2. **Content Scripts**: Injected into web pages to interact with video players and capture screenshots.
3. **Popup UI**: Provides quick access to extension features and settings.
4. **Options Page**: Allows users to configure extension settings.
5. **Browser Polyfill**: Ensures compatibility between different browser APIs.

The primary focus for Edge compatibility will be:
- Ensuring the browser polyfill correctly bridges Chrome and Edge APIs
- Fixing any Edge-specific issues in the background script
- Ensuring content script injection works properly in Edge
- Verifying the manifest.json has the correct Edge-specific settings

## Components and Interfaces

### Browser Polyfill

The current implementation shows significant differences between the Chrome and Edge versions:
- Chrome version: Simple mapping of `browser` to `chrome` namespace
- Edge version: Using a more comprehensive polyfill (likely Mozilla's webextension-polyfill)

**Design Decision**: 
- Replace the simple Chrome polyfill with the more comprehensive Mozilla webextension-polyfill in both versions
- This ensures consistent behavior across browsers and better handles Promise-based APIs

### Background Script

The background script in both versions is nearly identical, but there's a key difference in the `createKeepAliveAlarm` function:
- Chrome version: Uses async/await pattern
- Edge version: Uses callback pattern

**Design Decision**:
- Standardize on the async/await pattern for better readability and consistency
- Ensure all browser API calls use the polyfill correctly to handle Promise-based vs callback-based differences

### Content Scripts

Content scripts need to be properly injected into web pages in Edge. The current implementation uses the `browser.scripting.executeScript` API.

**Design Decision**:
- Verify that the scripting API works correctly in Edge with the polyfill
- Ensure paths to content scripts are correct in the Edge version
- Test injection on all supported video sites (YouTube, Vimeo, Twitch)

### Manifest.json

Both manifest files are nearly identical, with Edge having an additional permission (`alarms`).

**Design Decision**:
- Ensure both manifests include all necessary permissions
- Verify that Edge-specific settings in the manifest are correct
- Add any missing permissions to the Chrome version if they're actually needed there too

## Data Models

The extension uses Chrome's storage API to store user settings. The data model remains the same across browsers:

```javascript
{
  enabledSites: string[],
  fullscreenShortcut: string,
  fullscreenOnly: boolean,
  autoHideControls: boolean,
  uploadToCloud: boolean,
  annotationMode: boolean,
  cloudService: string,
  screenshotQuality: number,
  filenameTemplate: string,
  // ... other settings
}
```

**Design Decision**:
- No changes needed to the data model
- Ensure storage API calls work correctly in Edge through the polyfill

## Error Handling

The extension should gracefully handle any Edge-specific errors that may occur.

**Design Decision**:
- Add browser detection to provide browser-specific error handling where needed
- Implement try-catch blocks around Edge-specific functionality
- Add logging to help diagnose Edge-specific issues

## Testing Strategy

To ensure the extension works correctly in Edge, we'll implement the following testing strategy:

1. **Functional Testing**:
   - Test all core features in Edge (screenshot capture, settings management, etc.)
   - Verify keyboard shortcuts work correctly
   - Test on all supported video sites

2. **API Compatibility Testing**:
   - Test browser API calls that might differ between Chrome and Edge
   - Verify the polyfill correctly handles these differences

3. **UI Testing**:
   - Verify popup UI displays correctly in Edge
   - Verify options page displays correctly in Edge
   - Check for any visual glitches or layout issues

4. **Performance Testing**:
   - Verify the extension doesn't cause performance issues in Edge
   - Check memory usage and CPU utilization

## Implementation Plan

The implementation will focus on the following areas:

1. **Browser Polyfill**:
   - Update the Chrome version to use the same comprehensive polyfill as Edge
   - Ensure the polyfill is correctly loaded in all contexts

2. **Background Script**:
   - Standardize the `createKeepAliveAlarm` function to use async/await
   - Test all background script functionality in Edge

3. **Content Scripts**:
   - Verify content script injection works correctly in Edge
   - Test on all supported video sites

4. **Manifest.json**:
   - Ensure both manifests include all necessary permissions
   - Add the `alarms` permission to Chrome if needed

5. **Testing**:
   - Implement the testing strategy outlined above
   - Fix any issues discovered during testing