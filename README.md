# 📸 YouTube Screenshot Helper

<div align="center">

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)

*Enhanced screenshot tool for YouTube and video sites - capture clean frames with a single keypress*

</div>

## ✨ Features

### 🎯 Core Functionality
- **🚀 One-Click Screenshots**: Capture high-quality video frames instantly
- **🎮 Smart Control Hiding**: Automatically hide video controls for clean screenshots
- **⌨️ Keyboard Shortcuts**: Customizable hotkeys (`Ctrl+Shift+S` or `Shift+Enter` in fullscreen)
- **🎨 Annotation Mode**: Add annotations and highlights to your screenshots
- **📱 Multi-Platform Support**: Works on YouTube, Vimeo, Twitch, and custom video sites

### 🎛️ Advanced Settings
- **🔧 Flexible Configuration**: Fullscreen-only mode, auto-hide controls, custom shortcuts
- **📁 Smart File Organization**: Automatic folder structure with customizable patterns
- **🏷️ Dynamic Filename Generation**: Include video title, channel, timestamp, and date
- **☁️ Cloud Integration**: Upload directly to Google Drive (configurable)
- **🌙 Theme Support**: Auto, light, or dark mode
- **📏 Quality Control**: Adjustable screenshot quality and capture delay

## 🚀 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link coming soon)
2. Click "Add to Chrome"
3. Grant necessary permissions

### Manual Installation (Developer Mode)
1. **Download**: Clone or download this repository
   ```bash
   git clone https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension.git
   ```

2. **Enable Developer Mode**: 
   - Open Chrome → Settings → Extensions
   - Toggle "Developer mode" (top right)

3. **Load Extension**:
   - Click "Load unpacked"
   - Select the extension folder
   - The extension icon should appear in your toolbar

## 🎮 Usage

### Quick Start
1. **Navigate** to any supported video site (YouTube, Vimeo, Twitch)
2. **Play** your video
3. **Capture** using:
   - Click the extension icon → "Capture Screenshot"
   - Press `Ctrl+Shift+S` (customizable)
   - Press `Shift+Enter` when in fullscreen mode

### Advanced Usage

#### 🎯 Popup Interface
- **Status Indicator**: Shows if the extension is active on current site
- **Quick Actions**: Instant screenshot capture and settings access
- **Page Info**: Current site, video status, and fullscreen detection
- **Quick Settings**: Toggle fullscreen-only, auto-hide, and annotation modes

#### ⚙️ Settings Page
Access via the extension popup → Settings button

**🎨 Screenshot Settings**
- Quality adjustment (0.1 - 1.0)
- Capture delay for slow systems
- Preview disable option

**📁 File Organization**
- Custom download paths
- Folder organization patterns:
  - `{channel}/{date}` - Group by channel and date
  - `{site}/{title}` - Group by site and video title
  - Custom patterns supported

**🏷️ Filename Templates**
Build filenames with multiple components:
- ✅ Site name (YouTube, Vimeo, etc.)
- ✅ Video title
- ✅ Channel/uploader name
- ✅ Playlist name
- ✅ Chapter information
- ✅ Timestamp
- ✅ Date and time
- 🔧 Custom separators

**☁️ Cloud Storage**
- Google Drive integration
- Automatic uploads after capture
- OAuth2 authentication

**⌨️ Keyboard Shortcuts**
- Customizable main shortcut
- Fullscreen-specific shortcuts
- Site override prevention

## 🌐 Supported Sites

### ✅ Fully Supported
- **YouTube** (youtube.com) - Full feature support
- **Vimeo** (vimeo.com) - Complete compatibility
- **Twitch** (twitch.tv) - Live streams and VODs

### 🔧 Custom Sites
Add any video site through the settings:
1. Go to Settings → Site Management
2. Add your domain (e.g., `example.com`)
3. Configure custom video selectors if needed

## 🛠️ Technical Details

### Architecture
```
📦 YouTube Screenshot Helper
├── 📜 manifest.json          # Extension configuration
├── 🎭 popup/                 # Extension popup interface
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── ⚙️ options/               # Settings page
│   ├── options.html
│   ├── options.js
│   └── options.css
├── 🔧 background/            # Service worker
│   └── background.js
├── 📄 content/               # Page interaction
│   ├── content.js
│   └── youtube.js
├── 🛠️ utils/                 # Core utilities
│   ├── storage.js            # Settings management
│   ├── screenshot.js         # Screenshot capture
│   ├── keyHandler.js         # Keyboard shortcuts
│   ├── cloudStorage.js       # Cloud integration
│   └── cloudConfig.js        # Cloud configuration
└── 🎨 styles/                # Styling
    └── content.css
```

### Key Components

#### 📸 Screenshot Manager
- Canvas-based image capture
- Video element detection with fallbacks
- Control hiding automation
- Quality optimization

#### ⌨️ Key Handler
- Event delegation and filtering
- Fullscreen detection
- Site-specific overrides
- Modifier key combinations

#### 💾 Storage Manager
- Chrome sync storage integration
- Default setting management
- Real-time updates
- Data validation

#### ☁️ Cloud Storage
- OAuth2 authentication flow
- Google Drive API integration
- Upload progress tracking
- Error handling and retry logic

### Permissions Required
- `activeTab` - Access current tab for screenshots
- `storage` - Save user preferences
- `downloads` - Save screenshot files
- `identity` - Cloud service authentication
- `scripting` - Inject content scripts
- `notifications` - Show capture confirmations

## 🔧 Configuration

### Environment Setup
For cloud storage features, configure your API keys:

1. **Copy configuration template**:
   ```javascript
   // utils/cloudConfig.js
   window.CLOUD_CONFIG = {
     GOOGLE_DRIVE_CLIENT_ID: 'your-client-id-here',
     // ... other settings
   };
   ```

2. **Google Drive Setup**:
   - Create project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Drive API
   - Create OAuth2 credentials
   - Add your extension ID to authorized origins

### Custom Site Integration
For advanced users adding custom video sites:

```javascript
// Add to enabledSites array in settings
enabledSites: [
  'youtube.com',
  'your-custom-site.com'
]

// Optional: Custom video selectors
videoSelectors: {
  'your-site.com': 'video.custom-player, .video-container video'
}
```

## 📊 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Fully Supported |
| Edge | 88+ | ✅ Fully Supported |
| Firefox | - | ❌ Not Supported (Manifest V3) |
| Safari | - | ❌ Not Supported |

## 🐛 Troubleshooting

### Common Issues

#### "No video found" Error
- **Cause**: Video player hasn't loaded or uses unsupported format
- **Solution**: 
  - Wait for video to fully load
  - Try refreshing the page
  - Add the site to custom sites in settings

#### Screenshots Are Black/Blank
- **Cause**: Hardware acceleration or DRM protection
- **Solution**:
  - Disable hardware acceleration in Chrome
  - Try on a different video
  - Use fullscreen mode

#### Keyboard Shortcut Not Working
- **Cause**: Conflicts with site shortcuts or browser shortcuts
- **Solution**:
  - Enable "Override site shortcuts" in settings
  - Choose a different key combination
  - Use the popup button instead

#### Educational Platform Issues
- **IIT Madras SEEK**: Extension waits up to 10 seconds for video detection
- **NPTEL/SWAYAM**: May require page refresh after video loads
- **Solution**: Be patient, try manual capture via popup

### Debug Mode
Enable debug mode in settings to see detailed console logs:
1. Open Settings → Advanced
2. Enable "Debug Mode"
3. Open browser console (F12)
4. Look for "YouTube Screenshot Helper" logs

## 🤝 Contributing

### Development Setup
1. **Fork** the repository
2. **Clone** your fork
3. **Load** extension in developer mode
4. **Make** your changes
5. **Test** thoroughly
6. **Submit** pull request

### Code Style
- Use modern JavaScript (ES6+)
- Follow existing naming conventions
- Add comments for complex logic
- Update documentation

### Adding New Features
1. **Create issue** describing the feature
2. **Discuss** implementation approach
3. **Implement** with proper error handling
4. **Add tests** and documentation
5. **Submit PR** with detailed description

## 📝 Changelog

### v1.1.0 (Current)
- ✨ Enhanced annotation mode functionality
- 🎓 Specialized support for educational platforms
- ☁️ Cloud storage integration with Google Drive
- 🌙 Dark mode and theme system
- 📁 Advanced file organization options
- 🔧 Improved settings interface
- 🐛 Bug fixes and performance improvements

### v1.0.0
- 🎉 Initial release
- 📸 Basic screenshot functionality
- ⌨️ Keyboard shortcut support
- 🎯 YouTube, Vimeo, Twitch support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

### Getting Help
- **📖 Documentation**: Check this README first
- **🐛 Bug Reports**: [Create an issue](https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension/issues)
- **💡 Feature Requests**: [Start a discussion](https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension/discussions)
- **❓ Questions**: Use GitHub Discussions

### Contact
- **Author**: PixelCode01
- **Repository**: [GitHub](https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension)
- **Issues**: [Bug Tracker](https://github.com/PixelCode01/YouTube-Screenshot-Helper-Extension/issues)

---

<div align="center">

**⭐ If you find this extension helpful, please consider giving it a star! ⭐**

*Made with ❤️ for the developer and student community*

</div>
