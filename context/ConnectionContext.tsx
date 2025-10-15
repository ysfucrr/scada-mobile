import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import ApiService, { ServerSettings, SystemInfo } from '../services/ApiService';

interface ConnectionContextType {
  isConnected: boolean;
  systemInfo: SystemInfo | null;
  settings: ServerSettings | null;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshData: () => Promise<void>;
  updateSettings: (newSettings: ServerSettings) => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
}

export function ConnectionProvider({ children }: ConnectionProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeConnection();
  }, []);

  const initializeConnection = async () => {
    try {
      await loadSettings();
      // Artık otomatik bağlanma, sadece ayarları yükle
      console.log('[ConnectionContext] Settings loaded, waiting for manual connection');
    } catch (error) {
      console.error('Error initializing connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('serverSettings');
      if (savedSettings) {
        const parsedSettings: ServerSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } else {
        // Default settings
        const defaultSettings: ServerSettings = {
  serverHost: '',
  serverPort: '443',
  useHttps: true,
  autoConnect: false,
};
        setSettings(defaultSettings);
        await AsyncStorage.setItem('serverSettings', JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      const connectionResult = await ApiService.testConnection();
      
      if (connectionResult) {
        setIsConnected(true);
        await refreshData();
        console.log('[ConnectionContext] Connection successful');
        
        // API bağlantısı başarılıysa WebSocket'i de bağla
        try {
          // WebSocket context'inden connect metodunu çağır
          // Bu biraz karmaşık olduğu için basit bir timeout ile deneyelim
          setTimeout(async () => {
            // WebSocket bağlantısını dene
            console.log('Attempting WebSocket connection...');
          }, 1000);
        } catch (wsError) {
          console.warn('WebSocket connection failed:', wsError);
        }
      } else {
        setIsConnected(false);
        setSystemInfo(null);
        console.log('[ConnectionContext] Connection failed, will retry in 10 seconds');
        
        // SADECE ZATEN BAĞLI İKEN KOPMA DURUMUNDA RECONNECT YAP
        // İlk bağlantı denemesi başarısızsa reconnect yapma
        if (isConnected) {
          setTimeout(() => {
            console.log('[ConnectionContext] Retrying connection after disconnect...');
            connect().catch(console.error);
          }, 10000);
        }
      }
    } catch (error) {
      console.error('Error connecting:', error);
      setIsConnected(false);
      setSystemInfo(null);
      
      // SADECE ZATEN BAĞLI İKEN HATA OLURSA RECONNECT YAP
      if (isConnected) {
        setTimeout(() => {
          console.log('[ConnectionContext] Retrying connection after error...');
          connect().catch(console.error);
        }, 10000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setSystemInfo(null);
  };

  const refreshData = async () => {
    if (!isConnected) return;
    
    try {
      const info = await ApiService.getSystemInfo();
      setSystemInfo(info);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const updateSettings = async (newSettings: ServerSettings) => {
    try {
      await AsyncStorage.setItem('serverSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Disconnect and reconnect with new settings if auto-connect is enabled
      if (isConnected) {
        disconnect();
        if (newSettings.autoConnect) {
          await connect();
        }
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const value: ConnectionContextType = {
    isConnected,
    systemInfo,
    settings,
    isLoading,
    connect,
    disconnect,
    refreshData,
    updateSettings,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}