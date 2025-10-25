const DEFAULT_CLOUD_FOLDERS = {
  'google-drive': ['YouTube Screenshot Helper'],
  'one-drive': ['YouTube Screenshot Helper'],
  'simple-cloud': []
};

const CLOUD_ROOT_LABELS = {
  'google-drive': 'My Drive',
  'one-drive': 'OneDrive',
  'simple-cloud': 'Simple Cloud'
};

const SIMPLE_CLOUD_SELECTION = {
  id: 'simple-cloud-root',
  name: 'Simple Cloud',
  path: 'Simple Cloud (No sign-in needed)'
};

const CLOUD_DESCRIPTIONS = {
  'simple-cloud': 'No sign-in required! Screenshots get instant shareable links that expire after 1 week.',
  'google-drive': 'Sign in once to save screenshots permanently to your Google Drive.',
  'one-drive': 'Sign in once to save screenshots permanently to your Microsoft OneDrive.'
};


class CloudStorageManager {
  constructor() {
    this.authTokens = {};
    this.folderSelections = {};
    this.initialized = false;
    this.initializePromise = null;
    this.ensureInitialized();
  }

  async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    if (!this.initializePromise) {
      this.initializePromise = this.initializeCloudStorage();
    }

    try {
      await this.initializePromise;
    } finally {
      this.initialized = true;
    }
  }

  async initializeCloudStorage() {
    try {
      if (window.CLOUD_CONFIG?.ready) {
        await window.CLOUD_CONFIG.ready.catch((error) => {
          console.warn('CloudStorageManager: Failed to hydrate cloud config before init', error);
        });
      }

      const [localData, syncData] = await Promise.all([
        chrome.storage.local.get(['cloudAuthTokens']),
        chrome.storage.sync.get(['cloudFolderSelections'])
      ]);

      this.authTokens = localData.cloudAuthTokens || {};
      this.folderSelections = syncData.cloudFolderSelections || {};

      if (this.authTokens.googleDrive && !this.authTokens['google-drive']) {
        this.authTokens['google-drive'] = this.authTokens.googleDrive;
        delete this.authTokens.googleDrive;
      }
      if (this.authTokens.oneDrive && !this.authTokens['one-drive']) {
        this.authTokens['one-drive'] = this.authTokens.oneDrive;
        delete this.authTokens.oneDrive;
      }
    } catch (error) {
      console.error('Failed to initialize cloud storage:', error);
      this.authTokens = {};
      this.folderSelections = {};
    }
  }

  async saveAuthTokens() {
    try {
      await chrome.storage.local.set({ cloudAuthTokens: this.authTokens });
    } catch (error) {
      console.error('Failed to save auth tokens:', error);
    }
  }

  async saveFolderSelections() {
    try {
      await chrome.storage.sync.set({ cloudFolderSelections: this.folderSelections });
    } catch (error) {
      console.error('Failed to save folder selections:', error);
    }
  }

  getSelectedFolder(service) {
    return this.folderSelections?.[service] || null;
  }

  async setSelectedFolder(service, folder) {
    await this.ensureInitialized();

    if (folder) {
      this.folderSelections[service] = folder;
    } else {
      delete this.folderSelections[service];
    }

    await this.saveFolderSelections();
    return this.getSelectedFolder(service);
  }

  isTokenValid(tokenInfo) {
    if (!tokenInfo || !tokenInfo.accessToken) {
      return false;
    }

    if (!tokenInfo.expiresAt) {
      return true;
    }

    return Date.now() + 60_000 < tokenInfo.expiresAt;
  }

  async ensureToken(service, interactive = true) {
    await this.ensureInitialized();

    if (window.CLOUD_CONFIG?.ready) {
      try {
        await window.CLOUD_CONFIG.ready;
      } catch (error) {
        console.warn('CloudStorageManager: Proceeding without hydrated cloud config', error);
      }
    }

    let tokenInfo = this.authTokens[service];
    if (this.isTokenValid(tokenInfo)) {
      return tokenInfo;
    }

    switch (service) {
      case 'google-drive':
        tokenInfo = await this.authenticateGoogleDrive({ interactive });
        break;
      case 'one-drive':
        tokenInfo = await this.authenticateOneDrive({ interactive });
        break;
      case 'simple-cloud':
        return null;
      default:
        throw new Error(`Unknown cloud service: ${service}`);
    }

    this.authTokens[service] = tokenInfo;
    await this.saveAuthTokens();
    return tokenInfo;
  }

  parseAuthResponse(url) {
    const hashFragment = url.split('#')[1] || '';
    const queryFragment = url.split('?')[1] || '';
    const params = new URLSearchParams(hashFragment || queryFragment);

    const accessToken = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in'), 10);
    const scope = params.get('scope');
    const tokenType = params.get('token_type');

    if (!accessToken) {
      return null;
    }

    const expiresAt = Number.isFinite(expiresIn)
      ? Date.now() + Math.max(expiresIn - 60, 0) * 1000
      : null;

    return {
      accessToken,
      expiresAt,
      scope,
      tokenType: tokenType || 'Bearer'
    };
  }

  dataUrlToBlob(dataUrl) {
    const [meta, base64] = dataUrl.split(',');
    const mimeMatch = meta.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(base64);
    const length = binary.length;
    const buffer = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
  }



  async authenticateGoogleDrive({ interactive = true } = {}) {
    if (!window.CLOUD_CONFIG || !window.CLOUD_CONFIG.GOOGLE_DRIVE_CLIENT_ID ||
        window.CLOUD_CONFIG.GOOGLE_DRIVE_CLIENT_ID.length === 0) {
      throw new Error('Google Drive needs configuration. Please set up your client ID in Settings, or use Simple Cloud for instant uploads!');
    }

    const redirectUri = chrome.identity.getRedirectURL();
    const clientId = window.CLOUD_CONFIG.GOOGLE_DRIVE_CLIENT_ID;
    const scopes = window.CLOUD_CONFIG.GOOGLE_DRIVE.scopes || ['https://www.googleapis.com/auth/drive.file'];

    const authUrl = `${window.CLOUD_CONFIG.GOOGLE_DRIVE.authUrl}` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&prompt=select_account`;

    try {
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive
      });

      const tokenInfo = this.parseAuthResponse(responseUrl);
      if (!tokenInfo) {
        throw new Error('Unable to sign in to Google Drive. Please try again.');
      }

      this.authTokens['google-drive'] = tokenInfo;
      await this.saveAuthTokens();

      return tokenInfo;
    } catch (error) {
      if (error?.message?.includes('Authorization page could not be loaded')) {
        throw new Error('Sign-in cancelled. No problem!');
      }
      throw error;
    }
  }

  async driveRequest(path, { method = 'GET', tokenInfo, query = '', headers = {}, body = null } = {}) {
    const token = tokenInfo?.accessToken;
    if (!token) {
      throw new Error('Missing Google Drive access token');
    }

    const url = `${window.CLOUD_CONFIG.GOOGLE_DRIVE.apiUrl}/${path}${query}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `${tokenInfo.tokenType || 'Bearer'} ${token}`,
        'Accept': 'application/json',
        ...headers
      },
      body
    });

    if (response.status === 401) {
      delete this.authTokens['google-drive'];
      await this.saveAuthTokens();
      throw new Error('Google Drive token expired');
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Drive request failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async findDriveFolderByName({ name, parentId = 'root', tokenInfo }) {
    const sanitizedName = name.replace(/'/g, "\\'");
    const parentClause = parentId === 'root'
      ? `'root' in parents`
      : `'${parentId}' in parents`;

    const q = `name='${sanitizedName}' and ${parentClause} and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const query = `?q=${encodeURIComponent(q)}&fields=files(id,name,parents)`;

    const data = await this.driveRequest('files', { tokenInfo, query });
    return data.files?.[0] || null;
  }

  async createDriveFolder({ name, parentId = 'root', tokenInfo }) {
    const payload = {
      name,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentId && parentId !== 'root') {
      payload.parents = [parentId];
    }

    const response = await fetch(`${window.CLOUD_CONFIG.GOOGLE_DRIVE.apiUrl}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `${tokenInfo.tokenType || 'Bearer'} ${tokenInfo.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create folder "${name}": ${text}`);
    }

    return response.json();
  }

  async ensureDriveFolderPath({ segments = [], baseFolderId = 'root', tokenInfo }) {
    let currentId = baseFolderId || 'root';

    for (const rawSegment of segments) {
      const segment = rawSegment.trim();
      if (!segment) continue;

      const existing = await this.findDriveFolderByName({ name: segment, parentId: currentId, tokenInfo });
      if (existing) {
        currentId = existing.id;
        continue;
      }

      const created = await this.createDriveFolder({ name: segment, parentId: currentId, tokenInfo });
      currentId = created.id;
    }

    return currentId;
  }

  async uploadToGoogleDrive(dataUrl, filename, folderPath = '') {
    const tokenInfo = await this.ensureToken('google-drive');

    const folderSelection = this.getSelectedFolder('google-drive');
    const baseFolderId = folderSelection?.id || 'root';
    const folderSegments = (folderPath || '').split('/').map(part => part.trim()).filter(Boolean);

    let parentId = baseFolderId;
    if (folderSegments.length > 0) {
      parentId = await this.ensureDriveFolderPath({ segments: folderSegments, baseFolderId, tokenInfo });
    }

    const metadata = {
      name: filename
    };

    if (parentId && parentId !== 'root') {
      metadata.parents = [parentId];
    } else if (baseFolderId && baseFolderId !== 'root' && folderSegments.length === 0) {
      metadata.parents = [baseFolderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: image/png\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      dataUrl.split(',')[1] +
      closeDelimiter;

    const response = await fetch(`${window.CLOUD_CONFIG.GOOGLE_DRIVE.uploadUrl}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Authorization': `${tokenInfo.tokenType || 'Bearer'} ${tokenInfo.accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body
    });

    if (response.status === 401) {
      delete this.authTokens['google-drive'];
      await this.saveAuthTokens();
      return this.uploadToGoogleDrive(dataUrl, filename, folderPath);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Drive upload failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async listGoogleDriveFolders(parentId = 'root', { pageSize = 100 } = {}) {
    const tokenInfo = await this.ensureToken('google-drive');
    const parentClause = parentId === 'root' ? `'root' in parents` : `'${parentId}' in parents`;
    const q = `${parentClause} and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const query = `?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=files(id,name,parents),nextPageToken&orderBy=name`;

    const response = await this.driveRequest('files', { tokenInfo, query });
    const folders = (response.files || []).map(file => ({
      id: file.id,
      name: file.name,
      path: null
    }));

    return {
      folders,
      nextPageToken: response.nextPageToken || null
    };
  }



  async authenticateOneDrive({ interactive = true } = {}) {
    if (!window.CLOUD_CONFIG || !window.CLOUD_CONFIG.ONEDRIVE_CLIENT_ID ||
        window.CLOUD_CONFIG.ONEDRIVE_CLIENT_ID.length === 0) {
      throw new Error('OneDrive needs configuration. Please set up your client ID in Settings, or use Simple Cloud for instant uploads!');
    }

    const redirectUri = chrome.identity.getRedirectURL();
    const clientId = window.CLOUD_CONFIG.ONEDRIVE_CLIENT_ID;
    const scopes = window.CLOUD_CONFIG.ONEDRIVE.scopes || ['Files.ReadWrite'];

    const authUrl = `${window.CLOUD_CONFIG.ONEDRIVE.authUrl}` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=fragment` +
      `&prompt=select_account`;

    try {
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive
      });

      const tokenInfo = this.parseAuthResponse(responseUrl);
      if (!tokenInfo) {
        throw new Error('Unable to sign in to OneDrive. Please try again.');
      }

      this.authTokens['one-drive'] = tokenInfo;
      await this.saveAuthTokens();

      return tokenInfo;
    } catch (error) {
      if (error?.message?.includes('Authorization page could not be loaded')) {
        throw new Error('Sign-in cancelled. No problem!');
      }
      throw error;
    }
  }

  async oneDriveRequest(path, { method = 'GET', tokenInfo, query = '', headers = {}, body = null } = {}) {
    const token = tokenInfo?.accessToken;
    if (!token) {
      throw new Error('Missing OneDrive access token');
    }

    let queryString = '';
    if (query instanceof URLSearchParams) {
      const serialized = query.toString();
      queryString = serialized ? `?${serialized}` : '';
    } else if (typeof query === 'string' && query.length > 0) {
      queryString = query.startsWith('?') ? query : `?${query}`;
    }

    const url = `${window.CLOUD_CONFIG.ONEDRIVE.apiUrl}/${path}${queryString}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `${tokenInfo.tokenType || 'Bearer'} ${token}`,
        'Accept': 'application/json',
        ...headers
      },
      body
    });

    if (response.status === 401) {
      delete this.authTokens['one-drive'];
      await this.saveAuthTokens();
      throw new Error('OneDrive token expired');
    }

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OneDrive request failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async findOneDriveFolder({ name, parentId = 'root', tokenInfo }) {
    const params = new URLSearchParams();
    params.set('$select', 'id,name,parentReference,folder');
    params.set('$top', '50');
    params.set('$filter', `folder ne null and name eq '${name.replace(/'/g, "''")}'`);

    const path = parentId === 'root' ? 'root/children' : `items/${parentId}/children`;
    const data = await this.oneDriveRequest(path, { tokenInfo, query: params });
    const items = data?.value || [];
    return items.find(item => item.folder) || null;
  }

  async createOneDriveFolder({ name, parentId = 'root', tokenInfo }) {
    const path = parentId === 'root' ? 'root/children' : `items/${parentId}/children`;
    const payload = {
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'fail'
    };

    return this.oneDriveRequest(path, {
      method: 'POST',
      tokenInfo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async ensureOneDriveFolderPath({ segments = [], baseFolderId = 'root', tokenInfo }) {
    let currentId = baseFolderId || 'root';

    for (const rawSegment of segments) {
      const segment = rawSegment.trim();
      if (!segment) continue;

      const existing = await this.findOneDriveFolder({ name: segment, parentId: currentId, tokenInfo });
      if (existing) {
        currentId = existing.id;
        continue;
      }

      const created = await this.createOneDriveFolder({ name: segment, parentId: currentId, tokenInfo });
      currentId = created?.id || currentId;
    }

    return currentId;
  }

  async listOneDriveFolders(parentId = 'root', { pageSize = 200 } = {}) {
    const tokenInfo = await this.ensureToken('one-drive');

    const params = new URLSearchParams();
    params.set('$select', 'id,name,parentReference,folder');
    params.set('$orderby', 'name');
    params.set('$top', String(pageSize));

    const path = parentId === 'root' ? 'root/children' : `items/${parentId}/children`;
    const response = await this.oneDriveRequest(path, { tokenInfo, query: params });
    const folders = (response?.value || []).filter(item => item.folder).map(item => ({
      id: item.id,
      name: item.name,
      path: item.parentReference?.path || ''
    }));

    return {
      folders,
      nextLink: response?.['@odata.nextLink'] || null
    };
  }

  async uploadToOneDrive(dataUrl, filename, folderPath = '') {
    const tokenInfo = await this.ensureToken('one-drive');

    const folderSelection = this.getSelectedFolder('one-drive');
    const baseFolderId = folderSelection?.id || 'root';
    const folderSegments = (folderPath || '').split('/').map(part => part.trim()).filter(Boolean);

    let parentId = baseFolderId;
    if (folderSegments.length > 0) {
      try {
        parentId = await this.ensureOneDriveFolderPath({ segments: folderSegments, baseFolderId, tokenInfo });
      } catch (error) {
        if (error.message && error.message.includes('OneDrive token expired')) {
          return this.uploadToOneDrive(dataUrl, filename, folderPath);
        }
        throw error;
      }
    }

    const blob = this.dataUrlToBlob(dataUrl);
    const encodedFilename = encodeURIComponent(filename);

    const uploadPath = parentId === 'root'
      ? `root:/${encodedFilename}:/content`
      : `items/${parentId}:/${encodedFilename}:/content`;

    const response = await fetch(`${window.CLOUD_CONFIG.ONEDRIVE.apiUrl}/${uploadPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `${tokenInfo.tokenType || 'Bearer'} ${tokenInfo.accessToken}`,
        'Content-Type': 'image/png'
      },
      body: blob
    });

    if (response.status === 401) {
      delete this.authTokens['one-drive'];
      await this.saveAuthTokens();
      return this.uploadToOneDrive(dataUrl, filename, folderPath);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OneDrive upload failed (${response.status}): ${text}`);
    }

    return response.json();
  }

  async uploadToSimpleCloud(dataUrl, filename) {
    const blob = this.dataUrlToBlob(dataUrl);
    const attempts = [
      {
        url: 'https://file.io',
        buildBody: () => {
          const formData = new FormData();
          formData.append('file', blob, filename);
          formData.append('expires', '1w');
          return formData;
        },
        parse: async (response) => {
          const json = await response.json().catch(() => ({}));
          if (json?.success && json?.link) {
            return {
              shareUrl: json.link,
              expiresAt: json.expiry || null
            };
          }
          if (response.ok) {
            console.warn('Simple Cloud (file.io) unexpected response', json);
          }
          return null;
        }
      },
      {
        url: 'https://tmpfiles.org/api/v1/upload',
        buildBody: () => {
          const formData = new FormData();
          formData.append('file', blob, filename);
          return formData;
        },
        parse: async (response) => {
          const json = await response.json().catch(() => ({}));
          const shareUrl = json?.data?.url || json?.data?.url_full;
          if ((json?.status === 'success' || json?.success === true) && shareUrl) {
            return {
              shareUrl,
              expiresAt: json?.data?.expiry || json?.data?.expires || null
            };
          }
          if (response.ok) {
            console.warn('Simple Cloud (tmpfiles) unexpected response', json);
          }
          return null;
        }
      }
    ];

    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt.url, {
          method: 'POST',
          body: attempt.buildBody()
        });

        if (!response.ok) {
          console.warn(`Simple Cloud endpoint ${attempt.url} returned`, response.status);
          continue;
        }

        const parsed = await attempt.parse(response);
        if (parsed?.shareUrl) {
          return {
            service: 'simple-cloud',
            shareUrl: parsed.shareUrl,
            expiresAt: parsed.expiresAt || null,
            message: 'Screenshot uploaded! Shareable link created (expires in 1 week)'
          };
        }
      } catch (error) {
        console.warn(`Simple Cloud upload failed via ${attempt.url}`, error);
      }
    }

    throw new Error('Simple Cloud upload failed. Check your internet connection and try again, or switch to Google Drive/OneDrive for reliable uploads.');
  }



  async uploadScreenshot({ service, dataUrl, filename, folderPath = '' }) {
    const normalizedService = this.normalizeServiceKey(service);
    await this.ensureDefaultFolder(normalizedService, { interactive: false });

    switch (normalizedService) {
      case 'google-drive':
        return this.uploadToGoogleDrive(dataUrl, filename, folderPath);
      case 'one-drive':
        return this.uploadToOneDrive(dataUrl, filename, folderPath);
      case 'simple-cloud':
        return this.uploadToSimpleCloud(dataUrl, filename);
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  }

  async listFolders(service, parentId = 'root') {
    switch (this.normalizeServiceKey(service)) {
      case 'google-drive':
        return this.listGoogleDriveFolders(parentId);
      case 'one-drive':
        return this.listOneDriveFolders(parentId);
      case 'simple-cloud':
        return {
          folders: [],
          nextPageToken: null
        };
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  }

  async uploadToCloud(dataUrl, filename, service, folderPath = '') {
    if (!service) {
      throw new Error('Cloud service is required');
    }

    switch (service) {
      case 'gdrive':
      case 'google-drive':
        return this.uploadToGoogleDrive(dataUrl, filename, folderPath);
      case 'onedrive':
      case 'one-drive':
        return this.uploadToOneDrive(dataUrl, filename, folderPath);
      case 'simple-cloud':
        return this.uploadToSimpleCloud(dataUrl, filename);
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  }

  isAuthenticated(service) {
    const key = this.normalizeServiceKey(service);
    if (key === 'simple-cloud') {
      return true;
    }
    return this.isTokenValid(this.authTokens[key]);
  }

  normalizeServiceKey(service) {
    switch (service) {
      case 'gdrive':
      case 'google-drive':
        return 'google-drive';
      case 'onedrive':
      case 'one-drive':
        return 'one-drive';
      case 'simple-cloud':
        return 'simple-cloud';
      default:
        return service;
    }
  }

  async clearAuthentication(service) {
    await this.ensureInitialized();
    const key = this.normalizeServiceKey(service);
    delete this.authTokens[key];
    await this.saveAuthTokens();
  }

  getRootLabel(service) {
    const key = this.normalizeServiceKey(service);
    return CLOUD_ROOT_LABELS[key] || 'Root';
  }

  getDefaultFolderSegments(service) {
    const key = this.normalizeServiceKey(service);
    return DEFAULT_CLOUD_FOLDERS[key] || null;
  }

  async ensureDefaultFolder(service, { interactive = true } = {}) {
    const key = this.normalizeServiceKey(service);
    if (!key || key === 'none') {
      return null;
    }

    await this.ensureInitialized();

    const existing = this.getSelectedFolder(key);
    if (existing?.id) {
      return existing;
    }

    if (key === 'simple-cloud') {
      await this.setSelectedFolder(key, { ...SIMPLE_CLOUD_SELECTION });
      return { ...SIMPLE_CLOUD_SELECTION };
    }

    const segments = this.getDefaultFolderSegments(key);
    if (!segments || segments.length === 0) {
      return null;
    }

    let tokenInfo = this.authTokens[key];
    if (!this.isTokenValid(tokenInfo)) {
      try {
        tokenInfo = await this.ensureToken(key, interactive);
      } catch (error) {
        console.warn(`Unable to ensure token for ${key}:`, error);
        return null;
      }
    }

    if (!tokenInfo) {
      return null;
    }

    let folderId = 'root';
    if (key === 'google-drive') {
      folderId = await this.ensureDriveFolderPath({
        segments,
        baseFolderId: 'root',
        tokenInfo
      });
    } else if (key === 'one-drive') {
      folderId = await this.ensureOneDriveFolderPath({
        segments,
        baseFolderId: 'root',
        tokenInfo
      });
    }

    const rootLabel = this.getRootLabel(key);
    const path = [rootLabel, ...segments].join(' / ');
    const folderInfo = {
      id: folderId,
      name: segments[segments.length - 1] || rootLabel,
      path
    };

    await this.setSelectedFolder(key, folderInfo);
    return folderInfo;
  }

  async createFolder(service, parentId = 'root', name) {
    const key = this.normalizeServiceKey(service);
    if (!name) {
      throw new Error('Folder name is required');
    }

    let tokenInfo = this.authTokens[key];
    if (!this.isTokenValid(tokenInfo)) {
      tokenInfo = await this.ensureToken(key, true);
    }

    switch (key) {
      case 'google-drive':
        return this.createDriveFolder({ name, parentId: parentId || 'root', tokenInfo });
      case 'one-drive':
        return this.createOneDriveFolder({ name, parentId: parentId || 'root', tokenInfo });
      case 'simple-cloud':
        throw new Error('Simple Cloud does not support nested folders');
      default:
        throw new Error(`Unsupported cloud service: ${service}`);
    }
  }
}

window.cloudStorageManager = new CloudStorageManager();
window.CLOUD_DESCRIPTIONS = CLOUD_DESCRIPTIONS;
window.CLOUD_ROOT_LABELS = CLOUD_ROOT_LABELS;
