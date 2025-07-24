/**
 * Path normalization utility for YouTube Screenshot Helper
 * Provides consistent path handling across Chrome and Edge browsers
 */

class PathNormalizer {
  constructor() {
    // Import browser detector if available, otherwise fallback to basic detection
    this.browserDetector = (typeof window !== 'undefined' && window.browserDetector) || 
                          this.createFallbackDetector();
    this.isEdge = this.browserDetector.isEdge();
    this.maxPathLength = this.isEdge ? 200 : 260; // Edge has stricter limits
    this.maxSegmentLength = 50;
    this.invalidChars = /[<>:"|?*\x00-\x1f]/g;
    this.reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
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
   * Normalizes a complete file path for download
   * @param {string} filename - The base filename
   * @param {string} [folderPath] - Optional folder path
   * @param {string} [customPath] - Optional custom download path
   * @returns {Object} Normalized path result
   */
  normalizePath(filename, folderPath = '', customPath = '') {
    try {
      const pathParts = [];
      
      // Add custom path if provided
      if (customPath) {
        const normalizedCustomPath = this.normalizePathSegment(customPath);
        if (normalizedCustomPath) {
          pathParts.push(normalizedCustomPath);
        }
      }

      // Add folder path if provided
      if (folderPath) {
        const normalizedFolderPath = this.normalizePathSegment(folderPath);
        if (normalizedFolderPath) {
          pathParts.push(normalizedFolderPath);
        }
      }

      // Normalize filename
      const normalizedFilename = this.normalizeFilename(filename);
      pathParts.push(normalizedFilename);

      // Join path parts
      const fullPath = pathParts.join('/');
      
      // Check if path exceeds limits
      if (fullPath.length > this.maxPathLength) {
        return this.createFallbackPath(filename);
      }

      return {
        success: true,
        path: fullPath,
        fallback: false,
        originalLength: fullPath.length,
        maxLength: this.maxPathLength
      };

    } catch (error) {
      console.error('PathNormalizer: Error normalizing path:', error);
      return this.createFallbackPath(filename);
    }
  }

  /**
   * Normalizes a path segment (folder or custom path)
   * @param {string} segment - Path segment to normalize
   * @returns {string} Normalized segment
   */
  normalizePathSegment(segment) {
    if (!segment || typeof segment !== 'string') {
      return '';
    }

    // Remove leading/trailing slashes and backslashes
    let normalized = segment.replace(/^[\/\\]+|[\/\\]+$/g, '');
    
    // Convert backslashes to forward slashes
    normalized = normalized.replace(/\\/g, '/');
    
    // Split into parts and normalize each part
    const parts = normalized.split('/').map(part => {
      return this.sanitizeSegment(part);
    }).filter(part => part.length > 0);

    // Limit depth for Edge compatibility
    if (this.isEdge && parts.length > 3) {
      parts.splice(3); // Keep only first 3 levels
    }

    return parts.join('/');
  }

  /**
   * Normalizes a filename
   * @param {string} filename - Filename to normalize
   * @returns {string} Normalized filename
   */
  normalizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return `screenshot-${Date.now()}.png`;
    }

    // Extract extension
    const lastDotIndex = filename.lastIndexOf('.');
    let name = filename;
    let extension = '.png'; // Default extension

    if (lastDotIndex > 0) {
      name = filename.substring(0, lastDotIndex);
      extension = filename.substring(lastDotIndex);
    }

    // Sanitize the name part
    name = this.sanitizeSegment(name);
    
    // Ensure we have a valid name
    if (!name) {
      name = `screenshot-${Date.now()}`;
    }

    // Limit filename length
    const maxNameLength = this.maxSegmentLength - extension.length;
    if (name.length > maxNameLength) {
      name = name.substring(0, maxNameLength);
    }

    return name + extension;
  }

  /**
   * Sanitizes a single path segment
   * @param {string} segment - Segment to sanitize
   * @returns {string} Sanitized segment
   */
  sanitizeSegment(segment) {
    if (!segment) return '';

    // Remove invalid characters
    let sanitized = segment.replace(this.invalidChars, '_');
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
    
    // Trim whitespace and dots
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
    
    // Check for reserved names
    const upperSegment = sanitized.toUpperCase();
    if (this.reservedNames.includes(upperSegment)) {
      sanitized = `_${sanitized}`;
    }

    // Limit segment length
    if (sanitized.length > this.maxSegmentLength) {
      sanitized = sanitized.substring(0, this.maxSegmentLength);
    }

    return sanitized;
  }

  /**
   * Creates a fallback path when normalization fails or path is too long
   * @param {string} originalFilename - Original filename for reference
   * @returns {Object} Fallback path result
   */
  createFallbackPath(originalFilename) {
    const timestamp = Date.now();
    const extension = this.extractExtension(originalFilename) || '.png';
    const fallbackFilename = `screenshot-${timestamp}${extension}`;

    return {
      success: true,
      path: fallbackFilename,
      fallback: true,
      reason: 'Path too long or normalization failed',
      originalFilename
    };
  }

  /**
   * Extracts file extension from filename
   * @param {string} filename - Filename to extract extension from
   * @returns {string} File extension including dot
   */
  extractExtension(filename) {
    if (!filename || typeof filename !== 'string') {
      return '.png';
    }

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
      return filename.substring(lastDotIndex);
    }

    return '.png';
  }

  /**
   * Validates if a path is safe for the current browser
   * @param {string} path - Path to validate
   * @returns {Object} Validation result
   */
  validatePath(path) {
    const issues = [];

    if (!path || typeof path !== 'string') {
      issues.push('Path is empty or invalid');
    } else {
      if (path.length > this.maxPathLength) {
        issues.push(`Path too long: ${path.length} > ${this.maxPathLength}`);
      }

      if (this.invalidChars.test(path)) {
        issues.push('Path contains invalid characters');
      }

      const segments = path.split('/');
      if (this.isEdge && segments.length > 4) {
        issues.push('Path too deep for Edge (max 4 levels)');
      }

      segments.forEach((segment, index) => {
        if (segment.length > this.maxSegmentLength) {
          issues.push(`Segment ${index} too long: ${segment.length} > ${this.maxSegmentLength}`);
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues,
      path,
      browser: this.isEdge ? 'Edge' : 'Chrome'
    };
  }
}

// Export for use in extension context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PathNormalizer;
  module.exports.default = PathNormalizer;
} else if (typeof window !== 'undefined') {
  window.PathNormalizer = PathNormalizer;
} else if (typeof globalThis !== 'undefined') {
  globalThis.PathNormalizer = PathNormalizer;
}