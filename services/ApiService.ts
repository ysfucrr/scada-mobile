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
 
  async initialize() {
    // Load selected agent ID from storage
    try {
      const agentId = await AsyncStorage.getItem('selectedAgentId');
      if (agentId) {
        this.selectedAgentId = agentId;
        console.log(`[ApiService] Loaded selected agent ID: ${agentId}`);
      }
    } catch (error) {
      console.error('[ApiService] Error loading agent ID:', error);
    }
    await this.loadSettings();
    this.updateUrls();
    
    // Cloud Bridge kullanımını kontrol et - sadece 443 portu için
    // Artık her zaman HTTPS kullanıyoruz
    this.useCloudBridge = this.settings?.serverPort === '443';
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

  // Update the selected agent ID
  async setSelectedAgentId(agentId: string | null) {
    this.selectedAgentId = agentId;
    console.log(`[ApiService] Set selected agent ID to: ${agentId}`);
    
    if (agentId) {
      await AsyncStorage.setItem('selectedAgentId', agentId);
    } else {
      await AsyncStorage.removeItem('selectedAgentId');
    }
  }
  
  // Get the current selected agent ID
  getSelectedAgentId(): string | null {
    return this.selectedAgentId;
  }

  // Cloud Bridge üzerinden veri çekmek için yeni metod
  async fetchViaCloudBridge(path: string, method = 'GET', body?: any) {
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
      const requestBody = {
        method,
        path: fullPath,
        body: body || {},
        // Include agent ID if available and relevant (for authentication and data requests)
        agentId: this.selectedAgentId
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
  async post(path: string, body: any): Promise<any> {
    try {
      await this.initialize();
      
      if (this.useCloudBridge) {
        // Cloud Bridge üzerinden POST isteği
        return await this.fetchViaCloudBridge(path, 'POST', body);
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

}

export default new ApiService();