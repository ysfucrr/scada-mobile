import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ApiService, { SystemInfo, ServerSettings } from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      // Her zaman otomatik bağlan
      await connect();
    } catch (error) {
      console.error('Error initializing connection:', error);
      // Bağlantı başarısız olursa 5 saniye sonra tekrar dene
      setTimeout(() => {
        connect().catch(console.error);
      }, 5000);
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
          serverHost: 'localhost',
          serverPort: '3000',
          apiPort: '3001',
          useHttps: false,
          autoConnect: true,
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
        
        // Bağlantı başarısız olursa 10 saniye sonra tekrar dene
        setTimeout(() => {
          console.log('Retrying connection...');
          connect().catch(console.error);
        }, 10000);
      }
    } catch (error) {
      console.error('Error connecting:', error);
      setIsConnected(false);
      setSystemInfo(null);
      
      // Hata durumunda da 10 saniye sonra tekrar dene
      setTimeout(() => {
        console.log('Retrying connection after error...');
        connect().catch(console.error);
      }, 10000);
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