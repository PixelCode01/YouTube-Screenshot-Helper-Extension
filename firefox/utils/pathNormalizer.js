

class PathNormalizer {
  constructor() {

    this.browserDetector = (typeof window !== 'undefined' && window.browserDetector) || 
                          this.createFallbackDetector();
    this.isEdge = this.browserDetector.isEdge();
    this.isFirefox = typeof this.browserDetector.isFirefox === 'function'
      ? this.browserDetector.isFirefox()
      : false;
    this.maxPathLength = this.isEdge ? 200 : (this.isFirefox ? 255 : 260);
    this.maxSegmentLength = 50;
    this.invalidChars = /[<>:"|?*\x00-\x1f]/g;
    this.reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
  }

  
  createFallbackDetector() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const isEdge = ua.includes('Edg/');
    const isFirefox = ua.includes('Firefox/');
    
    return {
      isEdge: () => isEdge,
      isFirefox: () => isFirefox,
      isChrome: () => ua.includes('Chrome/') && !isEdge,
      getBrowserName: () => {
        if (isEdge) return 'Edge';
        if (isFirefox) return 'Firefox';
        return ua.includes('Chrome/') ? 'Chrome' : 'Unknown';
      }
    };
  }

  
  normalizePath(filename, folderPath = '', customPath = '') {
    try {
      const pathParts = [];
      

      if (customPath) {
        const normalizedCustomPath = this.normalizePathSegment(customPath);
        if (normalizedCustomPath) {
          pathParts.push(normalizedCustomPath);
        }
      }


      if (folderPath) {
        const normalizedFolderPath = this.normalizePathSegment(folderPath);
        if (normalizedFolderPath) {
          pathParts.push(normalizedFolderPath);
        }
      }


      const normalizedFilename = this.normalizeFilename(filename);
      pathParts.push(normalizedFilename);


      const fullPath = pathParts.join('/');
      

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

  
  normalizePathSegment(segment) {
    if (!segment || typeof segment !== 'string') {
      return '';
    }


    let normalized = segment.replace(/^[\/\\]+|[\/\\]+$/g, '');
    

    normalized = normalized.replace(/\\/g, '/');
    

    const parts = normalized.split('/').map(part => {
      return this.sanitizeSegment(part);
    }).filter(part => part.length > 0);


    if (this.isEdge && parts.length > 3) {
      parts.splice(3);
    }

    return parts.join('/');
  }

  
  normalizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return `screenshot-${Date.now()}.png`;
    }


    const lastDotIndex = filename.lastIndexOf('.');
    let name = filename;
    let extension = '.png';

    if (lastDotIndex > 0) {
      name = filename.substring(0, lastDotIndex);
      extension = filename.substring(lastDotIndex);
    }


    name = this.sanitizeSegment(name);
    

    if (!name) {
      name = `screenshot-${Date.now()}`;
    }


    const maxNameLength = this.maxSegmentLength - extension.length;
    if (name.length > maxNameLength) {
      name = name.substring(0, maxNameLength);
    }

    return name + extension;
  }

  
  sanitizeSegment(segment) {
    if (!segment) return '';


    let sanitized = segment.replace(this.invalidChars, '_');
    

    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
    

    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
    

    const upperSegment = sanitized.toUpperCase();
    if (this.reservedNames.includes(upperSegment)) {
      sanitized = `_${sanitized}`;
    }


    if (sanitized.length > this.maxSegmentLength) {
      sanitized = sanitized.substring(0, this.maxSegmentLength);
    }

    return sanitized;
  }

  
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
      browser: this.isEdge ? 'Edge' : (this.isFirefox ? 'Firefox' : 'Chrome')
    };
  }
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = PathNormalizer;
  module.exports.default = PathNormalizer;
} else if (typeof window !== 'undefined') {
  window.PathNormalizer = PathNormalizer;
} else if (typeof globalThis !== 'undefined') {
  globalThis.PathNormalizer = PathNormalizer;
}