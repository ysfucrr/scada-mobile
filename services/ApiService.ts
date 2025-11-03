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
}

class ApiService {
  private baseUrl: string = '';
  private apiUrl: string = '';
  private settings: ServerSettings | null = null;
  private useCloudBridge: boolean = false;
  private selectedAgentId: string | null = null;
 
  async initialize(preserveAgentId: boolean = true) {
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
    
    // Cloud Bridge her zaman HTTPS kullanır
    const protocol = this.useCloudBridge ? 'https' : (this.settings.useHttps ? 'https' : 'http');
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
      await this.initialize();
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Response'un content-encoding başlığını kontrol et
      const contentEncoding = response.headers.get('content-encoding');
      const contentLength = response.headers.get('content-length');
      
      // Sıkıştırılmış boyut (byte)
      const compressedSize = contentLength ? parseInt(contentLength) : null;
      
      // Sıkıştırma formatı ve boyut bilgisi
      console.log(`Response received with encoding: ${contentEncoding || 'none'}`);
      
      const jsonData = await response.json();
      
      // Tahmini ham JSON boyutu (yaklaşık hesaplama)
      const rawSize = JSON.stringify(jsonData).length;
      
      if (compressedSize !== null) {
        console.log(`Compressed size: ${(compressedSize / 1024).toFixed(2)} KB`);
        const compressionRatio = ((1 - compressedSize / rawSize) * 100).toFixed(2);
        console.log(`Raw JSON size: ${(rawSize / 1024).toFixed(2)} KB`);
        console.log(`Compression ratio: ${compressionRatio}%`);
      } else {
        console.log(`Raw JSON size: ${(rawSize / 1024).toFixed(2)} KB`);
        console.log(`Compressed size: Not available (streaming response)`);
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
    
    // Cloud Bridge her zaman WSS (WebSocket Secure) kullanır
    const protocol = this.useCloudBridge ? 'wss' : (this.settings.useHttps ? 'wss' : 'ws');
    
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
      await this.initialize();
      
      let data;
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap
        data = await this.fetchViaCloudBridge('/consumption-widgets');
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
      
      console.log(`Loaded ${data.widgets.length} consumption widgets`);
      return data.widgets;
    } catch (error) {
      console.error('Error fetching consumption widgets:', error);
      return [];
    }
  }

  async getTrendLogComparison(trendLogId: string, timeFilter: 'month' | 'year'): Promise<any> {
    try {
      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden istek yap - mobile comparison endpoint'ini kullan
        const path = `/trend-logs/${trendLogId}/comparison?timeFilter=${timeFilter}`;
        return await this.fetchViaCloudBridge(path);
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
        return data;
      }
    } catch (error) {
      console.error('Error fetching trend log comparison:', error);
      return null;
    }
  }

  async getBillings(): Promise<any[]> {
    try {
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

}

export default new ApiService();