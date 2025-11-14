import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ServerSettings {
  serverHost: string;
  serverPort: string;
  apiPort?: string; // İsteğe bağlı hale getirdik
  useHttps: boolean;
  autoConnect: boolean;
}

export interface RegisterData {
  _id: string;
  name: string;
  analyzerId: string | number;
  analyzerName?: string;
  address: number;
  dataType: string;
  scale?: number;
  byteOrder?: string;
  bit?: number;
  unit?: string;
  description?: string;
  value?: any;
  timestamp?: string;
  status?: 'active' | 'inactive' | 'error';
  buildingId?: string;
  buildingName?: string;
  registerType?: 'read' | 'write';
  offset?: number;
  displayMode?: string;
  scaleUnit?: string;
  controlType?: 'dropdown' | 'button' | 'numeric';
  dropdownOptions?: Array<{label: string, value: number | string}>;
  onValue?: number | string;
  offValue?: number | string;
}

export interface AnalyzerData {
  _id: string;
  name: string;
  type: 'tcp' | 'serial';
  host?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  isActive: boolean;
}

export interface SystemInfo {
  status: string;
  uptime: number;
  activeRegisters: number;
  alarms: number;
  lastUpdate: string;
  mongodb?: {
    dbStats: {
      db: string;
      collections: number;
      views: number;
      objects: number;
      dataSize: number;
      storageSize: number;
      indexes: number;
      indexSize: number;
    };
    collectionStats: Array<{
      name: string;
      size: number;
      count: number;
    }>;
  };
  system?: {
    totalMemory: string;
    freeMemory: string;
    usedMemory: string;
    memoryUsagePercent: string;
    cpuCount: number;
    cpuModel: string;
    uptime: number;
    platform: string;
    hostname: string;
    diskIOSpeeds: {
      read: number;
      write: number;
    };
  };
}

class ApiService {
  private baseUrl: string = '';
  private apiUrl: string = '';
  private settings: ServerSettings | null = null;
  private useCloudBridge: boolean = false;
  private selectedAgentId: string | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  // Demo modu kontrolü
  private async isDemoMode(): Promise<boolean> {
    try {
      const demoMode = await AsyncStorage.getItem('demoMode');
      return demoMode === 'true';
    } catch (error) {
      return false;
    }
  }
 
  async initialize(preserveAgentId: boolean = true, force: boolean = false): Promise<void> {
    // Eğer zaten initialize edilmişse ve force değilse, mevcut promise'i dön
    if (this.isInitialized && !force && this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Eğer zaten bir initialization devam ediyorsa, onu bekle
    if (this.initializationPromise && !force) {
      return this.initializationPromise;
    }
    
    // Yeni initialization promise oluştur
    this.initializationPromise = this._doInitialize(preserveAgentId).then(() => {
      this.isInitialized = true;
    });
    
    return this.initializationPromise;
  }
  
  private async _doInitialize(preserveAgentId: boolean = true) {
    console.log('[ApiService] Initializing service');
    
    // Store the current agentId if we want to preserve it
    const currentAgentId = preserveAgentId ? this.selectedAgentId : null;
    console.log(`[ApiService] Initialize with preserveAgentId=${preserveAgentId}, current=${currentAgentId}`);
    
    // Get the saved agent ID from storage
    const savedAgentId = await AsyncStorage.getItem('selectedAgentId');
    
    // Determine which agent ID to use (priority: current > saved > null)
    const effectiveAgentId = currentAgentId || savedAgentId || null;
    
    if (effectiveAgentId) {
      console.log(`[ApiService] Using agent ID during init: ${effectiveAgentId}`);
      this.selectedAgentId = effectiveAgentId;
    } else {
      console.log('[ApiService] No agent ID available, using null');
      this.selectedAgentId = null;
    }
    
    // Load server settings
    await this.loadSettings();
    this.updateUrls();
    
    // Cloud Bridge kullanımını kontrol et - sadece 443 portu için
    // Artık her zaman HTTPS kullanıyoruz
    this.useCloudBridge = this.settings?.serverPort === '443';
    
    console.log(`[ApiService] Initialization complete. Cloud Bridge: ${this.useCloudBridge}, Base URL: ${this.baseUrl}, AgentID: ${this.selectedAgentId}`);
  }

  private async loadSettings(): Promise<void> {
    try {
      const savedSettings = await AsyncStorage.getItem('serverSettings');
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
      } else {
        // Default settings
        this.settings = {
  serverHost: '',
  serverPort: '443',
  useHttps: true,
  autoConnect: false,
};
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      throw new Error('Failed to load server settings');
    }
  }

  private updateUrls(): void {
    if (!this.settings) return;
    
    // Apple App Transport Security (ATS) gereği her zaman HTTPS kullan
    const protocol = 'https';
    this.baseUrl = `${protocol}://${this.settings.serverHost}:${this.settings.serverPort}`;
    
    // Cloud Bridge modunda veya apiPort tanımlanmadığında, serverPort kullan
    if (this.useCloudBridge || !this.settings.apiPort) {
      this.apiUrl = this.baseUrl;
    } else {
      this.apiUrl = `${protocol}://${this.settings.serverHost}:${this.settings.apiPort}`;
    }
  }

  // Update the selected agent ID and force reconnection
  async setSelectedAgentId(agentId: string | null) {
    // First clear all existing connections if agent ID is changing
    const isChanging = this.selectedAgentId !== agentId;
    if (isChanging && this.selectedAgentId) {
      console.log(`[ApiService] Agent ID changing from ${this.selectedAgentId} to ${agentId}, resetting connections`);
      
      // Clear any caches or pending requests
      await this._clearConnectionCache();
    }
    
    this.selectedAgentId = agentId;
    console.log(`[ApiService] Set selected agent ID to: ${agentId}`);
    
    if (agentId) {
      await AsyncStorage.setItem('selectedAgentId', agentId);
    } else {
      await AsyncStorage.removeItem('selectedAgentId');
    }
    
    // Force re-initialization if agent changed
    if (isChanging) {
      this.isInitialized = false; // Reset initialization flag
      this.initializationPromise = null; // Clear existing promise
      await this.initialize(true, true); // Force re-initialization
      console.log(`[ApiService] Reinitialized service for new agent: ${agentId}`);
      
      // Signal to the app that the agent has changed
      await AsyncStorage.setItem('agent_changed_event', Date.now().toString());
    }
  }
  
  // Helper method to clear any connection caches
  private async _clearConnectionCache() {
    console.log(`[ApiService] Clearing connection cache and resetting state`);
    
    // Use the resetConnection method from WebSocketContext if available
    try {
      // Import WebSocket context functionality
      const { useWebSocket } = require('../context/WebSocketContext');
      
      // This approach uses AsyncStorage to coordinate reset
      // We'll store a reset request that the WebSocketContext can detect
      await AsyncStorage.setItem('ws_connection_reset_request', 'true');
      await AsyncStorage.setItem('ws_connection_reset_timestamp', Date.now().toString());
      
      console.log('[ApiService] WebSocket reset request saved, connection will reset');
      
      // Also directly clear the register values cache
      try {
        await AsyncStorage.removeItem('register_values_cache');
        console.log('[ApiService] Register values cache cleared directly');
      } catch (cacheError) {
        console.warn('[ApiService] Error clearing register cache:', cacheError);
      }
      
    } catch (error) {
      // Fallback to basic disconnect if context not available
      console.warn('[ApiService] Using fallback WebSocket disconnect:', error);
      
      try {
        const io = require('socket.io-client');
        
        if (typeof io.disconnect === 'function') {
          io.disconnect();
          console.log('[ApiService] Disconnected existing Socket.IO connections');
        }
      } catch (ioError) {
        console.warn('[ApiService] Error in fallback WebSocket disconnection:', ioError);
      }
    }
  }
  
  // Get the current selected agent ID
  getSelectedAgentId(): string | null {
    return this.selectedAgentId;
  }

  // Cloud Bridge üzerinden veri çekmek için yeni metod
  // Use this explicit parameter instead of this.selectedAgentId
  async fetchViaCloudBridge(path: string, method = 'GET', body?: any, explicitAgentId?: string) {
    try {
      if (!this.settings) {
        await this.loadSettings();
      }
      
      // Cloud Bridge her zaman HTTPS kullanır
      const protocol = 'https';
      const url = `${protocol}://${this.settings?.serverHost}:${this.settings?.serverPort}/api/proxy`;
      
      // Cloud Bridge formatında istek gövdesi oluştur
      // Normalize the path - don't add /api/mobile prefix to paths that already have it
      const fullPath = path.startsWith('/api/') ? path : `/api/mobile${path}`;
      
      // Use explicitAgentId if provided, otherwise fall back to this.selectedAgentId
      // This ensures we always have the correct agent ID from the most recent context
      const agentIdToUse = explicitAgentId || this.selectedAgentId;
      
      console.log(`[ApiService] fetchViaCloudBridge using agent ID: ${agentIdToUse} for path: ${path}`);
      
      const requestBody = {
        method,
        path: fullPath,
        body: body || {},
        // ÖNEMLİ: Her zaman doğru agent ID'yi gönder
        targetAgentId: agentIdToUse
      };
      
      console.log(`Cloud Bridge proxy request to: ${url}`, requestBody);
      console.log(`Full request details:`, {
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      // Response body'yi bir kere oku (hata durumunda da kullanılabilir)
      const jsonData = await response.json();
      
      if (!response.ok) {
        // Try to extract error message from response
        const errorMessage = jsonData.error || jsonData.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      // Response'un content-encoding başlığını kontrol et
      const contentEncoding = response.headers.get('content-encoding');
      const contentLength = response.headers.get('content-length');
      
      // Sıkıştırılmış boyut (byte)
      const compressedSize = contentLength ? parseInt(contentLength) : null;
      
      // Sıkıştırma formatı ve boyut bilgisi
      console.log(`Response received with encoding: ${contentEncoding || 'none'}`);
      
      // Tahmini ham JSON boyutu (yaklaşık hesaplama)
      const rawSize = JSON.stringify(jsonData).length;
      
      if (compressedSize !== null) {
        console.log(`Compressed size: ${(compressedSize / 1024).toFixed(2)} KB`);
        const compressionRatio = ((1 - compressedSize / rawSize) * 100).toFixed(2);
        console.log(`Raw JSON size: ${(rawSize / 1024).toFixed(2)} KB`);
        console.log(`Compression ratio: ${compressionRatio}%`);
      } else {
        // Cloud Bridge üzerinden gelen response'larda Content-Length olmayabilir
        // Ancak response zaten compressed (br encoding görüyoruz)
        // Bu durumda sadece raw size göster, compression bilgisini de belirt
        console.log(`Raw JSON size: ${(rawSize / 1024).toFixed(2)} KB`);
        if (contentEncoding) {
          console.log(`Compressed size: Not available (response is ${contentEncoding} encoded but Content-Length header missing)`);
          console.log(`Note: Response is compressed by server, but size info not available via Cloud Bridge`);
        } else {
          console.log(`Compressed size: Not available (streaming response)`);
        }
      }
      
      return jsonData;
    } catch (error) {
      console.error(`API Error via Cloud Bridge (${path}):`, error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      let url;
      if (this.useCloudBridge) {
        // Cloud Bridge health endpoint kontrolü - her zaman HTTPS
        url = `https://${this.settings?.serverHost}:${this.settings?.serverPort}/health`;
      } else {
        // Normal SCADA API kontrolü
        url = `${this.baseUrl}/api/mobile/system-info`;
      }
      
      console.log(`Testing connection to: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getSystemInfo(): Promise<SystemInfo | null> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo system info');
        return {
          status: 'online',
          uptime: 86400,
          activeRegisters: 1,
          alarms: 0,
          lastUpdate: new Date().toISOString(),
          mongodb: {
            dbStats: {
              db: 'scada-demo',
              collections: 5,
              views: 0,
              objects: 1250,
              dataSize: 50, // 50 MB (will be multiplied by 1024*1024 in HomeScreen)
              storageSize: 64, // 64 MB
              indexes: 8,
              indexSize: 10485760, // 10 MB
            },
            collectionStats: [
              { name: 'registers', size: 31457280, count: 500 },
              { name: 'trendLogs', size: 15728640, count: 200 },
              { name: 'billings', size: 4194304, count: 50 },
              { name: 'users', size: 524288, count: 10 },
              { name: 'systemLogs', size: 1048576, count: 1000 },
            ],
          },
          system: {
            totalMemory: '16.00',
            freeMemory: '8.50',
            usedMemory: '7.50',
            memoryUsagePercent: '46.88',
            cpuCount: 8,
            cpuModel: 'Intel Core i7-9700K',
            uptime: 86400, // 1 day in seconds
            platform: 'Linux',
            hostname: 'demo-scada-server',
            diskIOSpeeds: {
              read: 250.5,
              write: 180.3,
            },
          },
        };
      }

      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        return await this.fetchViaCloudBridge('/system-info');
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/mobile/system-info`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching system info:', error);
      return null;
    }
  }

  async getRegisters(): Promise<RegisterData[]> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo register');
        return [{
          _id: 'demo-register-1',
          name: 'Demo Temperature Sensor',
          analyzerId: 'demo-analyzer-1',
          analyzerName: 'Demo Analyzer',
          address: 1001,
          dataType: 'float',
          scale: 1,
          byteOrder: 'BE',
          unit: '°C',
          description: 'Demo temperature sensor for testing',
          status: 'active',
          buildingId: 'demo-building-1',
          buildingName: 'Demo Building',
          registerType: 'read',
          offset: 0,
          displayMode: 'decimal',
          value: 25.5,
          timestamp: new Date().toISOString(),
        }];
      }

      await this.initialize();
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        data = await this.fetchViaCloudBridge('/registers');
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/mobile/registers`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }
      
      if (!data.success || !data.registers) {
        console.warn('No registers found in response:', data);
        return [];
      }
      
      // Building'lerden gelen register'ları formatla
      const formattedRegisters: RegisterData[] = data.registers.map((register: any) => ({
        _id: register._id,
        name: register.name,
        analyzerId: register.analyzerId,
        analyzerName: register.analyzerName,
        address: register.address,
        dataType: register.dataType,
        scale: register.scale,
        byteOrder: register.byteOrder,
        bit: register.bit,
        unit: register.unit,
        description: register.description,
        status: register.status,
        buildingId: register.buildingId,
        buildingName: register.buildingName,
        registerType: register.registerType,
        offset: register.offset,
        displayMode: register.displayMode,
        controlType: register.controlType,
        dropdownOptions: register.dropdownOptions,
        onValue: register.onValue,
        offValue: register.offValue,
      }));
      
      console.log(`Loaded ${formattedRegisters.length} registers from buildings`);
      return formattedRegisters;
    } catch (error) {
      console.error('Error fetching registers:', error);
      return [];
    }
  }

  async getAnalyzers(): Promise<AnalyzerData[]> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo analyzer');
        return [{
          _id: 'demo-analyzer-1',
          name: 'Demo Analyzer',
          type: 'tcp',
          host: 'demo.local',
          port: 502,
          isActive: true,
        }];
      }

      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        return await this.fetchViaCloudBridge('/analyzers');
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/mobile/analyzers`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching analyzers:', error);
      return [];
    }
  }

  async getTrendLogs(analyzerId?: string): Promise<any[]> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo trend log');
        return [{
          _id: 'demo-trendlog-1',
          name: 'Demo Trend Log',
          registerId: 'demo-register-1',
          registerName: 'Demo Temperature Sensor',
          analyzerId: 'demo-analyzer-1',
          analyzerName: 'Demo Analyzer',
          unit: '°C',
          frequency: 'hourly',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }

      await this.initialize();
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        const path = analyzerId ? `/trend-logs?analyzerId=${analyzerId}` : '/trend-logs';
        data = await this.fetchViaCloudBridge(path);
      } else {
        // Doğrudan SCADA API'sine istek yap
        const url = analyzerId
          ? `${this.baseUrl}/api/mobile/trend-logs?analyzerId=${analyzerId}`
          : `${this.baseUrl}/api/mobile/trend-logs`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }
      
      if (!data.success || !data.trendLogs) {
        console.warn('No trend logs found in response:', data);
        return [];
      }
      
      console.log(`Loaded ${data.trendLogs.length} trend logs`);
      return data.trendLogs;
    } catch (error) {
      console.error('Error fetching trend logs:', error);
      return [];
    }
  }

  async getTrendLogEntries(trendLogId: string, options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    // Demo modu kontrolü
    if (await this.isDemoMode()) {
      console.log('[ApiService] Demo mode: returning demo trend log entries');
      return {
        success: true,
        entries: [
          {
            _id: 'demo-entry-1',
            value: 25.5,
            timestamp: new Date().toISOString(),
            timestampMs: Date.now(),
          },
          {
            _id: 'demo-entry-2',
            value: 26.0,
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            timestampMs: Date.now() - 60 * 60 * 1000,
          },
          {
            _id: 'demo-entry-3',
            value: 25.8,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            timestampMs: Date.now() - 2 * 60 * 60 * 1000,
          },
        ],
        dataFormat: 'standard',
      };
    }

    // Kullanıcının belirttiği orijinal seçenekleri koru
    const effectiveOptions = { ...options };
    
    // Sıkıştırma ve veri formatı optimizasyonu sayesinde
    // performans iyileştirildiğinden sınırlama kaldırıldı
    try {
      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        let path = `/trend-logs/${trendLogId}`;
        const params = new URLSearchParams();
        
        if (effectiveOptions.limit) params.append('limit', effectiveOptions.limit.toString());
        if (effectiveOptions.startDate) params.append('startDate', effectiveOptions.startDate);
        if (effectiveOptions.endDate) params.append('endDate', effectiveOptions.endDate);
        
        if (params.toString()) {
          path += `?${params.toString()}`;
        }
        
        const result = await this.fetchViaCloudBridge(path);
        
        // Trend log verileri için boyut bilgilerini özel olarak logla
        if (result) {
          // Entries kontrolü - farklı format olabilir
          const entries = result.entries || result.data || result;
          const dataFormat = result.dataFormat || 'standard';
          
          if (Array.isArray(entries)) {
            const entryCount = entries.length;
            console.log(`[TREND LOG] Received ${entryCount} entries (format: ${dataFormat})`);
            
            // Veri boyutu hesaplamaları
            const rawDataSize = JSON.stringify(entries).length;
            console.log(`[TREND LOG] Raw data size: ${(rawDataSize / 1024).toFixed(2)} KB`);
            
            if (dataFormat === 'compact') {
              // Tahmini eski format boyutu (her kayıt için ortalama 120 byte)
              const estimatedOldSize = entryCount * 120;
              const compressionRatio = ((1 - rawDataSize / estimatedOldSize) * 100).toFixed(2);
              
              console.log(`[TREND LOG] Estimated old format: ${(estimatedOldSize / 1024).toFixed(2)} KB`);
              console.log(`[TREND LOG] Compression ratio: ${compressionRatio}%`);
            }
            
            // İlk ve son entry tarihlerini göster
            if (entryCount > 0) {
              const firstEntry = entries[0];
              const lastEntry = entries[entryCount - 1];
              
              // Compact format için tarih alanını kontrol et
              const firstDate = firstEntry.timestamp || firstEntry.t || firstEntry.time || 'N/A';
              const lastDate = lastEntry.timestamp || lastEntry.t || lastEntry.time || 'N/A';
              
              // Tarih formatını kontrol et ve uygun şekilde göster
              if (firstDate !== 'N/A' && lastDate !== 'N/A') {
                // Eğer Unix timestamp ise (number), Date'e çevir
                const formatDate = (date: any) => {
                  if (typeof date === 'number') {
                    return new Date(date).toISOString();
                  }
                  return date;
                };
                
                console.log(`[TREND LOG] Date range: ${formatDate(firstDate)} to ${formatDate(lastDate)}`);
              } else {
                console.log(`[TREND LOG] Date range: Unable to determine`);
              }
            }
          } else {
            console.log(`[TREND LOG] Unexpected data format:`, typeof entries);
          }
        }
        
        return result;
      } else {
        // Doğrudan SCADA API'sine istek yap
        let url = `${this.baseUrl}/api/mobile/trend-logs/${trendLogId}`;
        const params = new URLSearchParams();
        
        if (effectiveOptions.limit) params.append('limit', effectiveOptions.limit.toString());
        if (effectiveOptions.startDate) params.append('startDate', effectiveOptions.startDate);
        if (effectiveOptions.endDate) params.append('endDate', effectiveOptions.endDate);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching trend log entries:', error);
      return null;
    }
  }

  async getRegisterValue(registerId: string): Promise<number | null> {
    try {
      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap - registers endpoint farklı olduğu için
        const data = await this.fetchViaCloudBridge(`/registers/${registerId}`);
        return data.value;
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/registers/${registerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.value;
      }
    } catch (error) {
      console.error('Error fetching register value:', error);
      return null;
    }
  }

  getWebSocketUrl(): string {
    if (!this.settings) return '';
    
    // Apple App Transport Security (ATS) gereği her zaman WSS (WebSocket Secure) kullan
    const protocol = 'wss';
    
    // Add agent ID as query parameter if available
    let url = '';
    if (this.useCloudBridge || !this.settings.apiPort) {
      // Cloud Bridge için Socket.IO server HTTPS portu ile aynı olmalı
      url = `${protocol}://${this.settings.serverHost}:${this.settings.serverPort}`;
    } else {
      // Normal SCADA WebSocket bağlantısı
      url = `${protocol}://${this.settings.serverHost}:${this.settings.apiPort}`;
    }
    
    // Include agent ID as query parameter if available
    if (this.selectedAgentId) {
      url += `?agentId=${encodeURIComponent(this.selectedAgentId)}`;
    }
    
    return url;
  }

  async getCurrentSettings(): Promise<ServerSettings | null> {
    try {
      const savedSettings = await AsyncStorage.getItem('serverSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
      return null;
    } catch (error) {
      console.error('Error getting current settings:', error);
      return null;
    }
  }

  getLoadedSettings(): ServerSettings | null {
    return this.settings;
  }

  async getWidgets(): Promise<any[]> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo widget with registers');
        return [{
          _id: 'demo-widget-1',
          title: 'Demo Temperature Widget',
          name: 'Demo Temperature Widget',
          registers: [
            {
              id: 'demo-register-1',
              label: 'Temperature',
              value: 25.5,
              scaleUnit: '°C',
              analyzerId: 'demo-analyzer-1',
              address: 1001,
              dataType: 'float',
              isLive: true,
            },
            {
              id: 'demo-register-2',
              label: 'Humidity',
              value: 65.2,
              scaleUnit: '%',
              analyzerId: 'demo-analyzer-1',
              address: 1002,
              dataType: 'float',
              isLive: true,
            },
          ],
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }

      await this.initialize();
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        data = await this.fetchViaCloudBridge('/widgets');
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/mobile/widgets`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }
      
      if (!data.success || !data.widgets) {
        console.warn('No widgets found in response:', data);
        return [];
      }
      
      console.log(`Loaded ${data.widgets.length} widgets`);
      return data.widgets;
    } catch (error) {
      console.error('Error fetching widgets:', error);
      return [];
    }
  }

  // Fetch available agents from the server
  async getAvailableAgents(): Promise<any[]> {
    try {
      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge - access agents endpoint directly, not through the proxy
        // This is a server endpoint, not an agent endpoint
        const url = `${this.baseUrl}/api/mobile/agents`;
        
        console.log(`[ApiService] Fetching agents directly from: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result && result.agents && Array.isArray(result.agents)) {
          console.log(`[ApiService] Retrieved ${result.agents.length} available agents`);
          return result.agents;
        } else {
          console.warn('[ApiService] Invalid agents response format:', result);
          return [];
        }
      } else {
        // Direct API endpoint for standalone mode
        const response = await fetch(`${this.baseUrl}/api/mobile/agents`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.agents && Array.isArray(data.agents)) {
          return data.agents;
        } else {
          return [];
        }
      }
    } catch (error) {
      console.error('[ApiService] Error fetching available agents:', error);
      return [];
    }
  }

  // Generic POST method for API calls
  async post(path: string, body: any, agentId?: string): Promise<any> {
    try {
      await this.initialize();
      
      // Log the agent ID before making the request
      console.log(`[ApiService] POST request to ${path} with agent: ${agentId || this.selectedAgentId}`);
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden POST isteği - explicitly pass the agentId parameter
        return await this.fetchViaCloudBridge(path, 'POST', body, agentId);
      } else {
        // Doğrudan SCADA API'sine POST isteği
        const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
      }
    } catch (error) {
      console.error(`POST Error (${path}):`, error);
      throw error;
    }
  }

  async getConsumptionWidgets(): Promise<any[]> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo consumption widget');
        return [{
          _id: 'demo-consumption-widget-1',
          title: 'Demo Energy Consumption',
          name: 'Demo Energy Consumption',
          trendLogId: 'demo-trendlog-1',
          size: { width: 300, height: 200 },
          appearance: {
            fontFamily: 'default',
            textColor: '#FFFFFF',
            backgroundColor: '#1E88E5',
            opacity: 1,
          },
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }

      await this.initialize();
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        data = await this.fetchViaCloudBridge('/consumption-widgets');
        
        // Consumption widget verileri için boyut bilgilerini logla (trend log entries ve billing gibi)
        if (data && data.success && data.widgets && Array.isArray(data.widgets)) {
          const widgetCount = data.widgets.length;
          const dataFormat = data.dataFormat || 'standard';
          console.log(`[CONSUMPTION-WIDGET] Received ${widgetCount} widgets (format: ${dataFormat})`);
          
          // Veri boyutu hesaplamaları
          const rawDataSize = JSON.stringify(data.widgets).length;
          console.log(`[CONSUMPTION-WIDGET] Raw data size: ${(rawDataSize / 1024).toFixed(2)} KB`);
          
          if (dataFormat === 'compact') {
            // Tahmini eski format boyutu (her widget için ortalama 300 byte)
            const estimatedOldSize = widgetCount * 300;
            const compressionRatio = ((1 - rawDataSize / estimatedOldSize) * 100).toFixed(2);
            
            console.log(`[CONSUMPTION-WIDGET] Estimated old format: ${(estimatedOldSize / 1024).toFixed(2)} KB`);
            console.log(`[CONSUMPTION-WIDGET] Compression ratio: ${compressionRatio}%`);
          }
          
          // Compact format'tan normal formata dönüştür (eğer compact ise)
          if (dataFormat === 'compact' && data.widgets) {
            const expandedWidgets = data.widgets.map((widget: any) => ({
              _id: widget._id,
              title: widget.t,
              trendLogId: widget.tlid,
              size: widget.s,
              appearance: widget.a,
              createdAt: widget.ct ? new Date(widget.ct).toISOString() : null,
              updatedAt: widget.ut ? new Date(widget.ut).toISOString() : null
            }));
            
            console.log(`Loaded ${expandedWidgets.length} consumption widgets`);
            return expandedWidgets;
          }
        }
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/mobile/consumption-widgets`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }
      
      if (!data.success || !data.widgets) {
        console.warn('No consumption widgets found in response:', data);
        return [];
      }
      
      // Consumption widget verileri için boyut bilgilerini logla (trend log entries ve billing gibi)
      if (data.widgets && Array.isArray(data.widgets)) {
        const widgetCount = data.widgets.length;
        const dataFormat = data.dataFormat || 'standard';
        console.log(`[CONSUMPTION-WIDGET] Received ${widgetCount} widgets (format: ${dataFormat})`);
        
        // Veri boyutu hesaplamaları
        const rawDataSize = JSON.stringify(data.widgets).length;
        console.log(`[CONSUMPTION-WIDGET] Raw data size: ${(rawDataSize / 1024).toFixed(2)} KB`);
        
        if (dataFormat === 'compact') {
          // Tahmini eski format boyutu (her widget için ortalama 300 byte)
          const estimatedOldSize = widgetCount * 300;
          const compressionRatio = ((1 - rawDataSize / estimatedOldSize) * 100).toFixed(2);
          
          console.log(`[CONSUMPTION-WIDGET] Estimated old format: ${(estimatedOldSize / 1024).toFixed(2)} KB`);
          console.log(`[CONSUMPTION-WIDGET] Compression ratio: ${compressionRatio}%`);
        }
      }
      
      // Compact format'tan normal formata dönüştür (eğer compact ise)
      if (data.dataFormat === 'compact' && data.widgets) {
        const expandedWidgets = data.widgets.map((widget: any) => ({
          _id: widget._id,
          title: widget.t,
          trendLogId: widget.tlid,
          size: widget.s,
          appearance: widget.a,
          createdAt: widget.ct ? new Date(widget.ct).toISOString() : null,
          updatedAt: widget.ut ? new Date(widget.ut).toISOString() : null
        }));
        
        console.log(`Loaded ${expandedWidgets.length} consumption widgets`);
        return expandedWidgets;
      }
      
      console.log(`Loaded ${data.widgets.length} consumption widgets`);
      return data.widgets;
    } catch (error) {
      console.error('Error fetching consumption widgets:', error);
      return [];
    }
  }

  async getTrendLogComparison(trendLogId: string, timeFilter: 'month' | 'year'): Promise<any> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo trend log comparison');
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const previousYear = currentYear - 1;
        
        // Monthly comparison data
        const previousMonthValue = 850.5; // kWh
        const currentMonthValue = 920.3; // kWh
        const previousMonthTimestamp = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const currentMonthTimestamp = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyPercentageChange = ((currentMonthValue - previousMonthValue) / previousMonthValue) * 100;
        
        // Yearly comparison data
        const previousYearTotal = 10250.5; // kWh
        const currentYearTotal = 11280.3; // kWh
        const yearlyPercentageChange = ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100;
        
        // Generate monthly data for both years
        const currentYearMonthly: any[] = [];
        const previousYearMonthly: any[] = [];
        
        for (let month = 0; month < 12; month++) {
          // Current year - generate realistic values
          const currentMonthValue = 850 + (Math.random() * 200); // 850-1050 kWh range
          currentYearMonthly.push({
            month: month + 1,
            value: Math.round(currentMonthValue * 10) / 10,
            timestamp: new Date(currentYear, month, 1),
          });
          
          // Previous year - slightly lower values
          const previousMonthValue = 800 + (Math.random() * 180); // 800-980 kWh range
          previousYearMonthly.push({
            month: month + 1,
            value: Math.round(previousMonthValue * 10) / 10,
            timestamp: new Date(previousYear, month, 1),
          });
        }
        
        if (timeFilter === 'month') {
          return {
            success: true,
            comparison: {
              previousValue: previousMonthValue,
              currentValue: currentMonthValue,
              previousTimestamp: previousMonthTimestamp,
              currentTimestamp: currentMonthTimestamp,
              percentageChange: monthlyPercentageChange,
              timeFilter: 'month',
            },
            monthlyData: {
              currentYear: currentYearMonthly,
              previousYear: previousYearMonthly,
              currentYearLabel: currentYear,
              previousYearLabel: previousYear,
            },
            trendLog: {
              _id: 'demo-trendlog-1',
              registerId: 'demo-register-1',
              analyzerId: 'demo-analyzer-1',
              period: 'interval',
              interval: 3600,
            },
          };
        } else {
          // Year filter
          return {
            success: true,
            comparison: {
              previousValue: previousYearTotal,
              currentValue: currentYearTotal,
              previousTimestamp: new Date(previousYear, 0, 1),
              currentTimestamp: new Date(currentYear, 0, 1),
              percentageChange: yearlyPercentageChange,
              timeFilter: 'year',
            },
            monthlyData: {
              currentYear: currentYearMonthly,
              previousYear: previousYearMonthly,
              currentYearLabel: currentYear,
              previousYearLabel: previousYear,
            },
            trendLog: {
              _id: 'demo-trendlog-1',
              registerId: 'demo-register-1',
              analyzerId: 'demo-analyzer-1',
              period: 'interval',
              interval: 3600,
            },
          };
        }
      }

      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap - mobile comparison endpoint'ini kullan
        const path = `/trend-logs/${trendLogId}/comparison?timeFilter=${timeFilter}`;
        const data = await this.fetchViaCloudBridge(path);
        
        // Trend log comparison verileri için boyut bilgilerini logla
        if (data && data.success) {
          const dataFormat = data.dataFormat || 'standard';
          console.log(`[TREND-LOG-COMPARISON] Received comparison data (format: ${dataFormat})`);
          
          // Veri boyutu hesaplamaları
          const rawDataSize = JSON.stringify(data).length;
          console.log(`[TREND-LOG-COMPARISON] Raw data size: ${(rawDataSize / 1024).toFixed(2)} KB`);
          
          if (dataFormat === 'compact') {
            // Tahmini eski format boyutu (comparison + monthlyData + trendLog için ortalama 2 KB)
            const estimatedOldSize = 2048;
            const compressionRatio = ((1 - rawDataSize / estimatedOldSize) * 100).toFixed(2);
            
            console.log(`[TREND-LOG-COMPARISON] Estimated old format: ${(estimatedOldSize / 1024).toFixed(2)} KB`);
            console.log(`[TREND-LOG-COMPARISON] Compression ratio: ${compressionRatio}%`);
          }
          
          // Compact format'tan normal formata dönüştür (eğer compact ise)
          if (dataFormat === 'compact') {
            const expandedData = {
              success: data.success,
              comparison: data.c ? {
                previousValue: data.c.pv,
                currentValue: data.c.cv,
                previousTimestamp: typeof data.c.pt === 'number' ? new Date(data.c.pt) : data.c.pt,
                currentTimestamp: typeof data.c.ct === 'number' ? new Date(data.c.ct) : data.c.ct,
                percentageChange: data.c.pc,
                timeFilter: data.c.tf
              } : null,
              monthlyData: data.md ? {
                currentYear: data.md.cy.map((m: any) => ({
                  month: m.m,
                  value: m.v,
                  timestamp: typeof m.t === 'number' ? new Date(m.t) : m.t
                })),
                previousYear: data.md.py.map((m: any) => ({
                  month: m.m,
                  value: m.v,
                  timestamp: typeof m.t === 'number' ? new Date(m.t) : m.t
                })),
                currentYearLabel: data.md.cyl,
                previousYearLabel: data.md.pyl
              } : null,
              trendLog: data.tl ? {
                _id: data.tl._id,
                registerId: data.tl.rid,
                analyzerId: data.tl.aid,
                period: data.tl.p,
                interval: data.tl.i
              } : null
            };
            
            return expandedData;
          }
        }
        
        return data;
      } else {
        // Doğrudan SCADA API'sine istek yap - mobile comparison endpoint'ini kullan
        const url = `${this.baseUrl}/api/mobile/trend-logs/${trendLogId}/comparison?timeFilter=${timeFilter}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Trend log comparison verileri için boyut bilgilerini logla
        if (data && data.success) {
          const dataFormat = data.dataFormat || 'standard';
          console.log(`[TREND-LOG-COMPARISON] Received comparison data (format: ${dataFormat})`);
          
          // Veri boyutu hesaplamaları
          const rawDataSize = JSON.stringify(data).length;
          console.log(`[TREND-LOG-COMPARISON] Raw data size: ${(rawDataSize / 1024).toFixed(2)} KB`);
          
          if (dataFormat === 'compact') {
            // Tahmini eski format boyutu (comparison + monthlyData + trendLog için ortalama 2 KB)
            const estimatedOldSize = 2048;
            const compressionRatio = ((1 - rawDataSize / estimatedOldSize) * 100).toFixed(2);
            
            console.log(`[TREND-LOG-COMPARISON] Estimated old format: ${(estimatedOldSize / 1024).toFixed(2)} KB`);
            console.log(`[TREND-LOG-COMPARISON] Compression ratio: ${compressionRatio}%`);
          }
          
          // Compact format'tan normal formata dönüştür (eğer compact ise)
          if (dataFormat === 'compact') {
            const expandedData = {
              success: data.success,
              comparison: data.c ? {
                previousValue: data.c.pv,
                currentValue: data.c.cv,
                previousTimestamp: typeof data.c.pt === 'number' ? new Date(data.c.pt) : data.c.pt,
                currentTimestamp: typeof data.c.ct === 'number' ? new Date(data.c.ct) : data.c.ct,
                percentageChange: data.c.pc,
                timeFilter: data.c.tf
              } : null,
              monthlyData: data.md ? {
                currentYear: data.md.cy.map((m: any) => ({
                  month: m.m,
                  value: m.v,
                  timestamp: typeof m.t === 'number' ? new Date(m.t) : m.t
                })),
                previousYear: data.md.py.map((m: any) => ({
                  month: m.m,
                  value: m.v,
                  timestamp: typeof m.t === 'number' ? new Date(m.t) : m.t
                })),
                currentYearLabel: data.md.cyl,
                previousYearLabel: data.md.pyl
              } : null,
              trendLog: data.tl ? {
                _id: data.tl._id,
                registerId: data.tl.rid,
                analyzerId: data.tl.aid,
                period: data.tl.p,
                interval: data.tl.i
              } : null
            };
            
            return expandedData;
          }
        }
        
        return data;
      }
    } catch (error) {
      console.error('Error fetching trend log comparison:', error);
      return null;
    }
  }

  // Tüm consumption widget'lar için comparison verilerini tek seferde getirir
  async getConsumptionWidgetComparisons(trendLogIds: string[]): Promise<any> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo consumption widget comparisons');
        
        // Generate demo monthly data for yearly view (12 months)
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;
        
        // Generate 12 months of data for both years
        const generateMonthlyData = (year: number, baseValue: number) => {
          return Array.from({ length: 12 }, (_, monthIndex) => {
            // Random variation between 80% and 120% of base value
            const variation = 0.8 + (Math.random() * 0.4);
            const monthValue = (baseValue / 12) * variation;
            return {
              month: monthIndex + 1,
              value: Math.round(monthValue * 10) / 10,
              timestamp: new Date(year, monthIndex, 15)
            };
          });
        };
        
        const previousYearMonthlyData = generateMonthlyData(previousYear, 10250.5);
        const currentYearMonthlyData = generateMonthlyData(currentYear, 11280.3);
        
        // Demo data döndür
        return {
          success: true,
          data: trendLogIds.map(id => ({
            trendLogId: id,
            success: true,
            monthly: {
              previousValue: 850.5,
              currentValue: 920.3,
              previousTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              currentTimestamp: new Date(),
              percentageChange: 8.2,
              timeFilter: 'month'
            },
            yearly: {
              comparison: {
                previousValue: 10250.5,
                currentValue: 11280.3,
                previousTimestamp: new Date(previousYear, 0, 1),
                currentTimestamp: new Date(currentYear, 0, 1),
                percentageChange: 10.0,
                timeFilter: 'year'
              },
              monthlyData: {
                currentYear: currentYearMonthlyData,
                previousYear: previousYearMonthlyData,
                currentYearLabel: currentYear,
                previousYearLabel: previousYear
              }
            },
            trendLog: {
              _id: id,
              registerId: 'demo-register-1',
              analyzerId: 'demo-analyzer-1',
              period: 'interval',
              interval: 3600
            }
          }))
        };
      }

      await this.initialize();
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        data = await this.fetchViaCloudBridge('/consumption-widgets/comparisons', 'POST', { trendLogIds });
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/mobile/consumption-widgets/comparisons`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trendLogIds }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }
      
      if (!data.success) {
        console.warn('Failed to fetch consumption widget comparisons:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to fetch consumption widget comparisons'
        };
      }

      // Compact format'tan normal formata dönüştür
      if (data.dataFormat === 'compact' && data.data) {
        const expandedData = data.data.map((item: any) => {
          if (!item.s) {
            return {
              trendLogId: item.tid,
              success: false,
              error: item.e
            };
          }

          return {
            trendLogId: item.tid,
            success: true,
            monthly: item.m ? {
              previousValue: item.m.pv,
              currentValue: item.m.cv,
              previousTimestamp: typeof item.m.pt === 'number' ? new Date(item.m.pt) : item.m.pt,
              currentTimestamp: typeof item.m.ct === 'number' ? new Date(item.m.ct) : item.m.ct,
              percentageChange: item.m.pc,
              timeFilter: item.m.tf
            } : null,
            yearly: item.y ? {
              comparison: item.y.c ? {
                previousValue: item.y.c.pv,
                currentValue: item.y.c.cv,
                previousTimestamp: typeof item.y.c.pt === 'number' ? new Date(item.y.c.pt) : item.y.c.pt,
                currentTimestamp: typeof item.y.c.ct === 'number' ? new Date(item.y.c.ct) : item.y.c.ct,
                percentageChange: item.y.c.pc,
                timeFilter: item.y.c.tf
              } : null,
              monthlyData: item.y.md ? {
                currentYear: item.y.md.cy.map((m: any) => ({
                  month: m.m,
                  value: m.v,
                  timestamp: typeof m.t === 'number' ? new Date(m.t) : m.t
                })),
                previousYear: item.y.md.py.map((m: any) => ({
                  month: m.m,
                  value: m.v,
                  timestamp: typeof m.t === 'number' ? new Date(m.t) : m.t
                })),
                currentYearLabel: item.y.md.cyl,
                previousYearLabel: item.y.md.pyl
              } : null
            } : null,
            trendLog: item.tl ? {
              _id: item.tl._id,
              registerId: item.tl.rid,
              analyzerId: item.tl.aid,
              period: item.tl.p,
              interval: item.tl.i
            } : null
          };
        });

        return {
          success: true,
          data: expandedData
        };
      }

      return data;
    } catch (error) {
      console.error('Error fetching consumption widget comparisons:', error);
      return {
        success: false,
        error: 'Failed to fetch consumption widget comparisons'
      };
    }
  }

  async getBillings(): Promise<any[]> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo billing with trend logs');
        
        const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const createdAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        
        return [{
          _id: 'demo-billing-1',
          name: 'Demo Energy Billing',
          price: 0.15, // $0.15 per kWh
          currency: 'USD',
          trendLogs: [
            {
              id: 'demo-trendlog-1',
              analyzerId: 'demo-analyzer-1',
              registerId: 'demo-register-1',
              analyzerName: 'Demo Energy Meter',
              firstValue: 1250.5, // kWh - starting value
              currentValue: 1580.8, // kWh - current value (330.3 kWh used)
            },
          ],
          startTime: startTime.toISOString(),
          createdAt: createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }

      await this.initialize();
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        data = await this.fetchViaCloudBridge('/billings');
      } else {
        // Doğrudan SCADA API'sine istek yap
        const response = await fetch(`${this.baseUrl}/api/mobile/billings`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }
      
      if (!data.success || !data.billings) {
        console.warn('No billings found in response:', data);
        return [];
      }
      
      // Billing verileri için boyut bilgilerini logla (trend log entries gibi)
      if (data.billings && Array.isArray(data.billings)) {
        const billingCount = data.billings.length;
        const dataFormat = data.dataFormat || 'standard';
        console.log(`[BILLING] Received ${billingCount} billings (format: ${dataFormat})`);
        
        // Veri boyutu hesaplamaları
        const rawDataSize = JSON.stringify(data.billings).length;
        console.log(`[BILLING] Raw data size: ${(rawDataSize / 1024).toFixed(2)} KB`);
        
        if (dataFormat === 'compact') {
          // Tahmini eski format boyutu (her billing için ortalama 500 byte, her trend log için 200 byte)
          let estimatedOldSize = 0;
          data.billings.forEach((billing: any) => {
            estimatedOldSize += 500; // Base billing size
            if (billing.tl && Array.isArray(billing.tl)) {
              estimatedOldSize += billing.tl.length * 200; // Trend logs
            }
          });
          const compressionRatio = ((1 - rawDataSize / estimatedOldSize) * 100).toFixed(2);
          
          console.log(`[BILLING] Estimated old format: ${(estimatedOldSize / 1024).toFixed(2)} KB`);
          console.log(`[BILLING] Compression ratio: ${compressionRatio}%`);
        }
        
        // Response'un content-encoding başlığını kontrol et (Cloud Bridge üzerinden geliyorsa)
        // Cloud Bridge üzerinden gelen response'larda Content-Length header'ı olmayabilir
        // Bu durumda sadece raw size gösterilir
        if (this.useCloudBridge) {
          console.log(`[BILLING] Data received via Cloud Bridge (compression handled by server)`);
        }
      }
      
      // Compact format'tan normal formata dönüştür (eğer compact ise)
      if (data.dataFormat === 'compact' && data.billings) {
        const expandedBillings = data.billings.map((billing: any) => ({
          _id: billing._id,
          name: billing.n,
          price: billing.p,
          currency: billing.c,
          trendLogs: billing.tl.map((tl: any) => ({
            id: tl.id,
            analyzerId: tl.aid,
            analyzerName: tl.an,
            registerId: tl.rid,
            firstValue: tl.fv,
            currentValue: tl.cv
          })),
          startTime: billing.st ? new Date(billing.st).toISOString() : null,
          createdAt: billing.ct ? new Date(billing.ct).toISOString() : null,
          updatedAt: billing.ut ? new Date(billing.ut).toISOString() : null
        }));
        
        console.log(`Loaded ${expandedBillings.length} billings`);
        return expandedBillings;
      }
      
      console.log(`Loaded ${data.billings.length} billings`);
      return data.billings;
    } catch (error) {
      console.error('Error fetching billings:', error);
      return [];
    }
  }

  async getSystemLogs(options?: {
    level?: string;
    source?: string;
    search?: string;
    limit?: number;
  }): Promise<any> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo system log');
        return {
          logs: [{
            level: 'INFO',
            source: 'Demo System',
            message: 'Demo log entry - System is running in demo mode',
            timestamp: new Date().toISOString(),
            data: {},
          }],
          total: 1,
          filtered: 1,
          returned: 1,
        };
      }

      await this.initialize();
      
      // Query parametrelerini oluştur
      const params = new URLSearchParams();
      if (options?.level) params.append('level', options.level);
      if (options?.source) params.append('source', options.source);
      if (options?.search) params.append('search', options.search);
      if (options?.limit) params.append('limit', options.limit.toString());
      
      const queryString = params.toString();
      const path = `/system-logs${queryString ? `?${queryString}` : ''}`;
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        data = await this.fetchViaCloudBridge(path);
      } else {
        // Doğrudan SCADA API'sine istek yap
        const url = `${this.baseUrl}/api/mobile/system-logs${queryString ? `?${queryString}` : ''}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        data = await response.json();
      }
      
      if (!data.success || !data.logs) {
        console.warn('No system logs found in response:', data);
        return {
          logs: [],
          total: 0,
          filtered: 0,
          returned: 0
        };
      }
      
      console.log(`Loaded ${data.returned} system logs (${data.filtered} filtered from ${data.total} total)`);
      return data;
    } catch (error) {
      console.error('Error fetching system logs:', error);
      return {
        logs: [],
        total: 0,
        filtered: 0,
        returned: 0
      };
    }
  }

  async getPeriodicReports(): Promise<any[]> {
    try {
      // Demo modu kontrolü
      if (await this.isDemoMode()) {
        console.log('[ApiService] Demo mode: returning demo periodic reports');
        
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const createdAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        return [
          {
            _id: 'demo-report-1',
            description: 'Daily Energy Consumption Report',
            frequency: 'daily',
            schedule: {
              hour: 9,
              minute: 0,
            },
            format: 'pdf',
            last24HoursOnly: true,
            trendLogs: [
              { id: 'demo-trendlog-1', label: 'Demo Energy Meter' },
            ],
            active: true,
            createdAt: createdAt.toISOString(),
            updatedAt: now.toISOString(),
            lastSent: yesterday.toISOString(),
          },
          {
            _id: 'demo-report-2',
            description: 'Weekly System Summary Report',
            frequency: 'weekly',
            schedule: {
              dayOfWeek: 1, // Monday
              hour: 10,
              minute: 0,
            },
            format: 'pdf',
            last24HoursOnly: false,
            trendLogs: [
              { id: 'demo-trendlog-1', label: 'Demo Energy Meter' },
            ],
            active: true,
            createdAt: createdAt.toISOString(),
            updatedAt: now.toISOString(),
            lastSent: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            _id: 'demo-report-3',
            description: 'Monthly Billing Report',
            frequency: 'monthly',
            schedule: {
              dayOfMonth: 1,
              hour: 8,
              minute: 30,
            },
            format: 'pdf',
            last24HoursOnly: false,
            trendLogs: [
              { id: 'demo-trendlog-1', label: 'Demo Energy Meter' },
            ],
            active: false,
            createdAt: createdAt.toISOString(),
            updatedAt: now.toISOString(),
            lastSent: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      }

      await this.initialize();
      let data;
      if (this.useCloudBridge) {
        data = await this.fetchViaCloudBridge('/periodic-reports');
      } else {
        const response = await fetch(`${this.baseUrl}/api/mobile/periodic-reports`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
      }
      if (!data.success || !data.reports) {
        console.warn('No periodic reports found in response:', data);
        return [];
      }
      console.log(`Loaded ${data.reports.length} periodic reports`);
      return data.reports;
    } catch (error) {
      console.error('Error fetching periodic reports:', error);
      return [];
    }
  }

}

export default new ApiService();