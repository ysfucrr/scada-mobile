import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ServerSettings } from '../services/ApiService';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface RegisterSubscription {
  analyzerId: string | number;
  address: number;
  dataType: string;
  scale?: number;
  byteOrder?: string;
  bit?: number;
  registerId?: string;
}

interface RegisterValue {
  registerId: string;
  analyzerId: string | number;
  address: number;
  value: any;
  timestamp: number;
  dataType: string;
  bit?: number;
}

interface WebSocketContextType {
  socket: Socket | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  registerValues: Map<string, RegisterValue>;
  watchRegister: (register: RegisterSubscription, callback: (value: any) => void) => void;
  unwatchRegister: (register: RegisterSubscription, callback: (value: any) => void) => void;
  writeRegister: (registerId: string, value: number) => Promise<any>;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Register değerlerini cache'lemek için AsyncStorage kullan
const REGISTER_CACHE_KEY = 'register_values_cache';

// Cache'den değer oku
const getCachedValue = async (key: string): Promise<any> => {
  try {
    const cache = await AsyncStorage.getItem(REGISTER_CACHE_KEY);
    if (cache) {
      const parsedCache = JSON.parse(cache);
      return parsedCache[key];
    }
    return null;
  } catch {
    return null;
  }
};

// Cache'e değer yaz
const setCachedValue = async (key: string, value: any): Promise<void> => {
  try {
    const cache = await AsyncStorage.getItem(REGISTER_CACHE_KEY);
    const parsedCache = cache ? JSON.parse(cache) : {};
    parsedCache[key] = value;
    await AsyncStorage.setItem(REGISTER_CACHE_KEY, JSON.stringify(parsedCache));
  } catch (error) {
    console.error('Error caching register value:', error);
  }
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [registerValues, setRegisterValues] = useState<Map<string, RegisterValue>>(new Map());
  
  const listenerMapRef = useRef(new Map());
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Uygulama başlatıldığında otomatik bağlan
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // API bağlantısının kurulmasını bekle
        await connect();
      } catch (error) {
        console.error('Initial WebSocket connection failed:', error);
      }
    };

    initializeWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const getRegisterKey = (register: RegisterSubscription): string => {
    return register.dataType === 'boolean' && typeof register.bit === 'number'
      ? `${register.analyzerId}-${register.address}-bit${register.bit}`
      : `${register.analyzerId}-${register.address}`;
  };

  const connect = useCallback(async () => {
    try {
      // Mevcut bağlantıyı kapat
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Ayarları yükle
      const savedSettings = await AsyncStorage.getItem('serverSettings');
      if (!savedSettings) {
        throw new Error('No server settings found');
      }

      const settings: ServerSettings = JSON.parse(savedSettings);
      // Cloud Bridge (port 443) her zaman HTTPS/WSS kullanır
      const isCloudBridge = settings.serverPort === '443';
      const protocol = isCloudBridge ? 'wss' : (settings.useHttps ? 'wss' : 'ws');
      const httpProtocol = isCloudBridge ? 'https' : (settings.useHttps ? 'https' : 'http');
      const socketURL = `${httpProtocol}://${settings.serverHost}:${settings.serverPort}`;
      console.log(`[SocketIO] Connecting to: ${socketURL}`);
      setConnectionState('connecting');

      const newSocket = io(socketURL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        timeout: 20000,
        path: '/socket.io/',
        forceNew: true,
        query: {
          type: 'mobile', // Mobil uygulama olduğunu belirt
          clientId: 'mobile-app-' + Date.now() // Benzersiz bir istemci ID'si oluştur
        }
      });

      newSocket.on('connect', () => {
        console.log('[SocketIO] Connected to mobile');
        setIsConnected(true);
        setConnectionState('connected');
        
        // Mevcut abonelikleri yeniden gönder
        for (const [key, data] of listenerMapRef.current.entries()) {
          if (data.callbacks.length > 0) {
            console.log(`[SocketIO] Resubscribing to: ${key}`);
            newSocket.emit('watch-register', data.register);
          }
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.warn(`[SocketIO] Disconnected: ${reason}`);
        setIsConnected(false);
        setConnectionState('disconnected');
        
        // Otomatik yeniden bağlanma
        if (reason !== 'io client disconnect') {
          scheduleReconnect();
        }
      });

      newSocket.on('connect_error', (err) => {
        console.error('[SocketIO] Connection Error:', err.message);
        setIsConnected(false);
        setConnectionState('disconnected');
        
        // Otomatik yeniden bağlanma
        scheduleReconnect();
      });

      newSocket.on('register-value', (data: RegisterValue) => {
        const key = data.dataType === 'boolean' && typeof data.bit === 'number'
          ? `${data.analyzerId}-${data.address}-bit${data.bit}`
          : `${data.analyzerId}-${data.address}`;
          
        // Değeri cache'le
        setCachedValue(key, data.value);
        
        // Register values map'ini güncelle
        setRegisterValues(prev => {
          const newMap = new Map(prev);
          newMap.set(key, data);
          return newMap;
        });
          
        const listeners = listenerMapRef.current.get(key);
        if (listeners && listeners.callbacks) {
          listeners.callbacks.forEach((callback: (value: any) => void) => {
            callback(data.value);
          });
        }
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setConnectionState('disconnected');
      setIsConnected(false);
      throw error;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('[SocketIO] Attempting to reconnect...');
      connect().catch(error => {
        console.error('[SocketIO] Reconnection failed:', error);
        // 15 saniye sonra tekrar dene
        scheduleReconnect();
      });
    }, 15000) as any; // 15 saniye bekle
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionState('disconnected');
    }
  }, []);

  const watchRegister = useCallback(async (register: RegisterSubscription, callback: (value: any) => void) => {
    const key = getRegisterKey(register);

    // Cache'den son değeri al ve hemen callback'e gönder
    const cachedValue = await getCachedValue(key);
    if (cachedValue !== null && cachedValue !== undefined) {
      callback(cachedValue);
    }

    const listeners = listenerMapRef.current.get(key);

    if (listeners) {
      // Aynı callback'i iki kez eklemeyi önle
      if (!listeners.callbacks.includes(callback)) {
        listeners.callbacks.push(callback);
      }
    } else {
      // Bu register için ilk abonelik
      listenerMapRef.current.set(key, { register, callbacks: [callback] });
      if (socketRef.current && socketRef.current.connected) {
        console.log(`[SocketIO] Sending new watch request for: ${key}`);
        socketRef.current.emit('watch-register', register);
        console.log(`[SocketIO] Details of register being watched: ${JSON.stringify(register)}`);
      }
    }
  }, []);

  const unwatchRegister = useCallback((register: RegisterSubscription, callback: (value: any) => void) => {
    const key = getRegisterKey(register);
    const listeners = listenerMapRef.current.get(key);

    console.log(`[SocketIO] unwatchRegister called for: ${key}`);
    console.log(`[SocketIO] Listeners found:`, listeners ? 'YES' : 'NO');
    
    if (listeners) {
      const beforeCount = listeners.callbacks.length;
      listeners.callbacks = listeners.callbacks.filter((cb: any) => cb !== callback);
      const afterCount = listeners.callbacks.length;
      
      console.log(`[SocketIO] Callbacks before: ${beforeCount}, after: ${afterCount}`);

      if (listeners.callbacks.length === 0) {
        // Bu register için artık dinleyici yok
        listenerMapRef.current.delete(key);
        if (socketRef.current && socketRef.current.connected) {
          console.log(`[SocketIO] Sending unwatch request for: ${key}`);
          socketRef.current.emit('unwatch-register', register);
          console.log(`[SocketIO] Unwatch request sent successfully`);
        } else {
          console.log(`[SocketIO] Cannot send unwatch - socket not connected`);
        }
      } else {
        console.log(`[SocketIO] Still ${listeners.callbacks.length} callbacks remaining, not sending unwatch`);
      }
    } else {
      console.log(`[SocketIO] No listeners found for key: ${key}`);
    }
  }, []);

  const writeRegister = useCallback(async (registerId: string, value: number) => {
    try {
      const savedSettings = await AsyncStorage.getItem('serverSettings');
      if (!savedSettings) {
        throw new Error('No server settings found');
      }

      const settings: ServerSettings = JSON.parse(savedSettings);
      // Cloud Bridge (port 443) her zaman HTTPS kullanır
      const isCloudBridge = settings.serverPort === '443';
      const protocol = isCloudBridge ? 'https' : (settings.useHttps ? 'https' : 'http');
      const apiUrl = `${protocol}://${settings.serverHost}:${settings.serverPort}`;

      const response = await fetch(`${apiUrl}/api/mobile/registers/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registerId, value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send write request');
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('[WebSocketContext] Write Register Error:', error);
      throw error;
    }
  }, []);

  const value: WebSocketContextType = {
    socket,
    connectionState,
    isConnected,
    registerValues,
    watchRegister,
    unwatchRegister,
    writeRegister,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}