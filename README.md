# YouTube Screenshot Helper

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)

Take clutter-free screenshots with video controls automatically hidden. Save and organize captures into folders by channel, playlist, or video title for easy access.

## Overview

A browser extension that hides player controls, captures the current frame, and stores the result locally or in connected cloud storage. It includes configurable shortcuts, optional previews, and per-site enablement to fit most workflows without cluttering the UI.

## Key Capabilities

- One-tap capture from the popup, keyboard shortcut, or fullscreen overlay
- Optional hiding of on-screen controls before capture
- Templated filenames and optional folder organization inside Downloads
- Optional annotation workflow with drawing tools, text, and undo/redo
- Google Drive and OneDrive upload flows (Chromium-based browsers)
- Configurable screenshot quality, capture delay, and notification behavior

## Installation

### Chrome (manual install)

1. Clone or download the repository and extract it locally.
2. Open `chrome://extensions` and enable Developer Mode.
3. Choose **Load unpacked** and select the `chrome` directory inside this repo.

### Microsoft Edge

- [Install from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/ddamehdnkfbjjgpfelaapilddkpcjeop), or load the `edge` directory using the same Developer Mode flow as Chrome.

### Firefox (temporary load)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and choose `firefox/manifest.json`.
3. Repeat after browser restarts unless the build is signed through AMO.

- [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/youtube-screenshot-helper/).

Firefox uses a Manifest V2 background page. Cloud uploads remain disabled until `browser.identity` supports Manifest V3 OAuth flows.

## Daily Use

1. Navigate to any supported video site (YouTube, Vimeo, Twitch, or your configured custom domains).
2. Start playback.
3. Capture a frame by:
   - Pressing the configured shortcut (defaults to `Ctrl+Shift+S` or `Shift+Enter` in fullscreen).
   - Clicking the extension icon and choosing **Capture Screenshot**.
   - Using the fullscreen overlay action if the popup is pinned.

The extension pauses the video if necessary, hides controls when configured, captures the frame, then resumes playback and restores the UI.

## Configuration Highlights

- **Screenshot quality and delay:** Adjust JPEG/PNG quality and debounce capture on slower hardware.
- **Auto-hide controls:** Toggle per site to ensure overlays are hidden before capture.
- **Folder organization:** Select built-in patterns or create templates such as `{channel}/{date}`. Chromium browsers support nested folders; Edge may fall back to simplified paths.
- **Filename variables:** Insert title, channel, playlist, timestamp, site, date, or time tokens.
- **Annotation mode:** Enable an editable preview with drawing, text, crop, and undo actions. Final output can be saved locally or uploaded to configured cloud targets.
- **Notifications and silent downloads:** Control download shelf visibility and toast notifications per capture.

## Cloud Upload Setup

For Google Drive and OneDrive integration:

1. Create OAuth credentials through the respective cloud provider's developer console:
   - **Google Drive**: [Google Cloud Console](https://console.cloud.google.com/)
   - **OneDrive**: [Azure Portal](https://portal.azure.com/)

2. Configure the credentials in `utils/cloudConfig.js` for each browser bundle:

```javascript
window.CLOUD_CONFIG = {
  GOOGLE_DRIVE_CLIENT_ID: 'your-google-drive-client-id-here',
  ONEDRIVE_CLIENT_ID: 'your-onedrive-client-id-here',
  GOOGLE_DRIVE: {
    scopes: ['https://www.googleapis.com/auth/drive.file']
  },
  ONEDRIVE: {
    scopes: ['Files.ReadWrite']
  }
};
```
Chromium builds use `chrome.identity.getRedirectURL()` for OAuth redirects. Firefox currently disables identity-based cloud upload paths due to API limitations.

## Supported Permissions

- `activeTab`: Captures the current page content
- `downloads`: Saves screenshot files and manages download behavior
- `notifications`: Displays capture result notifications
- `scripting`: Injects capture scripts into video pages
- `storage`: Stores user preferences and settings
- `identity`: (Chromium only) Enables OAuth-based cloud uploads

All permissions are necessary for core functionality. No user data is transmitted to external servers except when explicitly using cloud upload features.

## Troubleshooting

| Issue | Possible cause | Recommended action |
|-------|----------------|--------------------|
| Video not detected | Player loads slowly or uses a custom wrapper | Wait for playback to start, then retry. Add the domain under custom sites if needed. |
| Blank captures | Hardware acceleration or DRM blocking | Disable hardware acceleration temporarily or capture in fullscreen. |
| Shortcut conflicts | Page or browser reserves the key combination | Change shortcuts in the options page or use the popup capture button. |
| Edge folder templates ignored | Edge restricts complex download paths | Use simple templates or rely on filenames only. |
| Firefox lacks cloud uploads | `browser.identity` OAuth flow unavailable | Enable cloud uploads only in Chromium-based builds until APIs stabilize. |

Enable debug mode from **Settings > Advanced** to expose detailed console logging when investigating capture or download issues.

## Developer Notes

- `chrome/`, `edge/`, and `firefox/` contain browser-specific manifests while sharing core logic across `content`, `background`, `popup`, `options`, and `utils` directories.
- The build scripts are placeholders; add bundling, linting, or packaging steps as needed for your workflow.

## Media Gallery

The repository hosts annotated screenshots that illustrate the popup UI, settings, and annotation workflow:

![Screenshot from 2025-06-22 20-26-14](https://github.com/user-attachments/assets/3a4986cd-2d0f-4f62-bc0f-32e229de7641)
![Screenshot from 2025-06-22 20-26-31](https://github.com/user-attachments/assets/d005c5dd-1288-4659-b040-f0f2bb9e5119)
![Screenshot from 2025-06-22 20-26-40](https://github.com/user-attachments/assets/3c1ac805-7572-455a-88f8-cf1019a5da18)
![Screenshot from 2025-06-22 20-26-49](https://github.com/user-attachments/assets/ef8adde1-6376-44c0-86e9-49f81f1e8612)
![Screenshot from 2025-06-22 20-26-55](https://github.com/user-attachments/assets/1ce232ba-096b-42a0-9374-32c1311fbd12)
![Screenshot from 2025-06-22 20-27-01](https://github.com/user-attachments/assets/8218b3f1-ef0a-4ee1-bf93-78607fd6a33a)
![Screenshot from 2025-06-22 20-27-07](https://github.com/user-attachments/assets/31bfc0b3-65ef-441f-b646-39081a2cb9f6)
![Screenshot from 2025-06-22 20-27-07-1](https://github.com/user-attachments/assets/8666d65e-1fc0-4f18-a462-86c671fe2e39)
![Screenshot from 2025-06-22 20-27-11](https://github.com/user-attachments/assets/1d482ea5-e572-4f66-85f7-b23929f83216)
![Screenshot from 2025-06-22 20-27-27](https://github.com/user-attachments/assets/3a31b0d5-7577-4944-a71c-8673ab1c9b8f)
![Screenshot from 2025-06-22 20-27-31](https://github.com/user-attachments/assets/cc621740-49a0-4166-a9b9-563d9dfa7a98)
![Screenshot from 2025-06-22 20-27-36](https://github.com/user-attachments/assets/e398e847-328f-4d7e-9955-99df90b6aa23)
![Screenshot from 2025-06-22 20-34-40](https://github.com/user-attachments/assets/4ed7f2c1-2926-4b86-acd5-5e095ba3cf6d)
![Screenshot from 2025-06-22 20-34-51](https://github.com/user-attachments/assets/6139e12d-2f32-4495-99f6-7ef99526fb10)
![Screenshot from 2025-06-22 20-35-16](https://github.com/user-attachments/assets/ab23b690-6ef4-440d-b06e-ca51b1d5349a)
![Screenshot from 2025-06-22 20-35-52](https://github.com/user-attachments/assets/a4e7043d-0ad9-45dd-bdfa-a287c0f1fdab)
![Screenshot from 2025-06-22 20-35-53](https://github.com/user-attachments/assets/096b4952-b3c9-4416-a11c-91d18e68930d)
![Screenshot from 2025-06-22 20-36-35](https://github.com/user-attachments/assets/c77c21f7-5f75-442d-80bd-4549771ac2d0)
![Screenshot from 2025-06-22 20-36-41](https://github.com/user-attachments/assets/23927108-afd2-4f5a-af2a-b1c1ae6bc573)
![Screenshot from 2025-06-22 20-36-46](https://github.com/user-attachments/assets/e5428c17-8978-4fa2-9224-44381db9b1b3)
![Screenshot from 2025-06-22 20-36-49](https://github.com/user-attachments/assets/f184f4f7-d267-4afe-82f5-6a4b5ee8951a)
![Screenshot from 2025-06-22 20-36-56](https://github.com/user-attachments/assets/0d57425f-994a-460d-91dd-1a7e3bae21e6)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
