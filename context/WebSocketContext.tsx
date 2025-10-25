import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
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
  disconnect: () => Promise<void>;
  resetConnection: () => Promise<void>;
  selectAgent: (agentId: string, agentName?: string) => Promise<boolean>; // New method for agent selection
  clearAllRegisterValues: () => void; // New method to clear register values
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

  // Uygulama başlatıldığında otomatik bağlan ve reset kontrolü yap
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        // Check if there was a reset request
        const resetRequest = await AsyncStorage.getItem('ws_connection_reset_request');
        
        if (resetRequest === 'true') {
          console.log('[SocketIO] Reset request detected, clearing all data and reconnecting');
          
          // Clear the request flag
          await AsyncStorage.removeItem('ws_connection_reset_request');
          
          // Clear all register values and reset state
          await AsyncStorage.removeItem(REGISTER_CACHE_KEY);
          setRegisterValues(new Map());
          listenerMapRef.current.clear();
          
          // Force disconnect if already connected
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            
            // Don't clear listenerMapRef.current here anymore
            // We'll preserve it for the reconnection
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // API bağlantısının kurulmasını bekle
        await connect();
      } catch (error) {
        console.error('Initial WebSocket connection failed:', error);
      }
    };

    initializeWebSocket();

    // Set up a listener for agent changes
    const checkForAgentChanges = async () => {
      try {
        const intervalId = setInterval(async () => {
          const agentChanged = await AsyncStorage.getItem('agent_changed_event');
          if (agentChanged) {
            const timestamp = parseInt(agentChanged);
            const now = Date.now();
            // Only reset if the change was recent (last 10 seconds)
            if (now - timestamp < 10000) {
              console.log('[SocketIO] Agent change detected, reconnecting WebSocket');
              
              // Store the current subscriptions before disconnecting
              const currentSubscriptions = new Map(listenerMapRef.current);
              console.log(`[SocketIO] Preserving ${currentSubscriptions.size} subscriptions before reconnect`);
              
              // Clean up the agent change marker
              await AsyncStorage.removeItem('agent_changed_event');
              
              // Disconnect from current socket
              await disconnect();
              
              // Small delay to ensure disconnect completes
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Reconnect with the new agent ID
              await connect();
              
              // After reconnection, restore subscriptions with the new agent
              if (socketRef.current && socketRef.current.connected) {
                console.log(`[SocketIO] Restoring ${currentSubscriptions.size} watch subscriptions with new agent`);
                
                // First reestablish the listener map
                listenerMapRef.current = currentSubscriptions;
                
                // Then send watch requests to the new agent for each subscription
                for (const [key, data] of currentSubscriptions.entries()) {
                  if (data.callbacks.length > 0) {
                    console.log(`[SocketIO] Re-subscribing to: ${key} with new agent`);
                    socketRef.current.emit('watch-register', data.register);
                  }
                }
              }
            }
          }
        }, 5000);
        
        return () => clearInterval(intervalId);
      } catch (error) {
        console.error('Error checking for agent changes:', error);
        return () => {};
      }
    };

    const cleanupPromise = checkForAgentChanges();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      cleanupPromise.then(cleanupFn => {
        if (typeof cleanupFn === 'function') {
          cleanupFn();
        }
      });
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

      // Önce tüm register değerlerini temizle
      await AsyncStorage.removeItem(REGISTER_CACHE_KEY);
      
      // Register values map'ini sıfırla
      setRegisterValues(new Map());
      
      // ÖNEMLİ: Abonelikler korunacak, aşağıda yeniden kullanılacak
      // Bu satırı kaldırdık: listenerMapRef.current.clear();
      // Böylece agent değiştiğinde abonelikler kaybolmaz

      const settings: ServerSettings = JSON.parse(savedSettings);
      // Cloud Bridge (port 443) her zaman HTTPS/WSS kullanır
      const isCloudBridge = settings.serverPort === '443';
      const protocol = isCloudBridge ? 'wss' : (settings.useHttps ? 'wss' : 'ws');
      const httpProtocol = isCloudBridge ? 'https' : (settings.useHttps ? 'https' : 'http');
      const socketURL = `${httpProtocol}://${settings.serverHost}:${settings.serverPort}`;
      console.log(`[SocketIO] Connecting to: ${socketURL}`);
      setConnectionState('connecting');

      // Seçili agent ID'sini al
      const selectedAgentId = await AsyncStorage.getItem('selectedAgentId');
      console.log(`[SocketIO] Connecting with selected agent ID: ${selectedAgentId || 'none'}`);

      // Cihaz bilgilerini topla - React Native Platform API kullanarak
      const deviceInfo = {
        platform: Platform.OS === 'ios' ? 'iOS' : 'Android', // Platform adını düzgün formatla
        model: 'React Native App', // Genel model adı
        appVersion: '1.0.0', // Sabit versiyon
        osVersion: Platform.Version ? String(Platform.Version) : 'Unknown', // OS versiyonu
      };

      console.log(`[SocketIO] Device info:`, deviceInfo);

      const newSocket = io(socketURL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        timeout: 20000,
        path: '/socket.io/',
        forceNew: true,
        query: {
          type: 'mobile', // Mobil uygulama olduğunu belirt
          clientId: 'mobile-app-' + Date.now(), // Benzersiz bir istemci ID'si oluştur
          agentId: selectedAgentId || undefined, // Seçili agent ID'si
          // Cihaz bilgilerini query parametresi olarak gönder
          platform: deviceInfo.platform,
          model: deviceInfo.model,
          appVersion: deviceInfo.appVersion,
          osVersion: deviceInfo.osVersion
        }
      });

      newSocket.on('connect', async () => {
        console.log('[SocketIO] Connected to mobile');
        setIsConnected(true);
        setConnectionState('connected');
        
        // Mevcut abonelikleri yeniden gönder - agent ID'yi açıkça belirterek
        const agentId = await AsyncStorage.getItem('selectedAgentId');
        console.log(`[SocketIO] Connected with agent ID: ${agentId || 'none'}, restoring subscriptions`);
        
        // Eğer seçili bir agent ID varsa, socket üzerinden select-agent olayını gönder
        if (agentId) {
          console.log(`[SocketIO] Sending explicit agent selection: ${agentId}`);
          newSocket.emit('select-agent', { agentId });
          
          // Yanıtı bekle
          const selectionResult = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.warn('[SocketIO] Agent selection timed out');
              resolve({ success: false });
            }, 2000);
            
            newSocket.once('agent-selected', (response) => {
              clearTimeout(timeout);
              console.log(`[SocketIO] Agent selection response:`, response);
              resolve(response);
            });
          });
          
          console.log(`[SocketIO] Agent selection result:`, selectionResult);
        }
        
        // Kısa bir bekle - server'ın bağlantıyı tamamen kabul etmesi için
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Tüm abonelikleri yeniden gönder
        for (const [key, data] of listenerMapRef.current.entries()) {
          if (data.callbacks.length > 0) {
            console.log(`[SocketIO] Resubscribing to: ${key} with agent: ${agentId || 'default'}`);
            // Explicit watch request with the register information
            newSocket.emit('watch-register', {
              ...data.register,
              // Force including the current agent ID if needed
              _agentId: agentId // This is just for logging, doesn't affect routing
            });
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
  
  // Agent seçimini belirtmek için yeni bir metod
  const selectAgent = useCallback(async (agentId: string, agentName?: string): Promise<boolean> => {
    try {
      console.log(`[SocketIO] Selecting agent: ${agentId} (${agentName || 'Unknown'})`);
      
      // Agent ID'sini AsyncStorage'a kaydet
      await AsyncStorage.setItem('selectedAgentId', agentId);
      
      // Agent adını da kaydedelim
      if (agentName) {
        await AsyncStorage.setItem('selectedAgentName', agentName);
      }
      
      // Eğer socket bağlıysa, select-agent olayını gönder
      if (socketRef.current && socketRef.current.connected) {
        console.log(`[SocketIO] Sending select-agent event to server for: ${agentId}`);
        
        // Server'a select-agent isteği gönder ve yanıtı bekle
        const result = await new Promise<{success: boolean, error?: string}>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('[SocketIO] Agent selection timed out');
            resolve({ success: false, error: 'Timeout' });
          }, 2000);
          
          socketRef.current!.emit('select-agent', { agentId });
          
          socketRef.current!.once('agent-selected', (response) => {
            clearTimeout(timeout);
            console.log(`[SocketIO] Agent selection response:`, response);
            resolve(response);
          });
        });
        
        // Seçim başarısızsa, durumu bildir
        if (!result.success) {
          console.error(`[SocketIO] Agent selection failed: ${result.error || 'Unknown error'}`);
          return false;
        }
        
        // Agent değişikliğini bildir - bu WebSocketContext'in yeniden bağlanmasını sağlar
        await AsyncStorage.setItem('agent_changed_event', Date.now().toString());
        
        // Tüm register değerlerini temizle
        clearAllRegisterValues();
        
        console.log(`[SocketIO] Agent selected successfully: ${agentId}`);
        return true;
      } else {
        console.log(`[SocketIO] Socket not connected, saving agent selection for later: ${agentId}`);
        
        // Socket bağlı değilse, sadece agent_changed_event'i kaydet - bağlandığında kontrol edilecek
        await AsyncStorage.setItem('agent_changed_event', Date.now().toString());
        return true; // Şimdilik başarılı sayalım, bağlanınca işlenecek
      }
    } catch (error) {
      console.error('Error selecting agent:', error);
      return false;
    }
  }, []);
  
  // Tüm register değerlerini temizle
  const clearAllRegisterValues = useCallback(() => {
    console.log('[SocketIO] Clearing all register values');
    setRegisterValues(new Map());
    AsyncStorage.removeItem(REGISTER_CACHE_KEY).catch(err => {
      console.error('[SocketIO] Error clearing register cache:', err);
    });
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

  // Bağlantıyı kapat ve tüm verileri temizle
  const disconnect = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Socket bağlantısını kapat
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionState('disconnected');
    }

    // Tüm register değerlerini temizle
    await AsyncStorage.removeItem(REGISTER_CACHE_KEY);
    
    // Register values map'ini sıfırla
    setRegisterValues(new Map());
    
    // Listener map'i temizle
    listenerMapRef.current.clear();
    
    // We're not clearing the listener map here anymore, just the values cache
    // listenerMapRef.current will be preserved or reset by the caller as needed
    
    console.log('[SocketIO] Disconnected and register values cleared, subscriptions preserved');
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
      } else {
        console.log(`[SocketIO] Socket not connected, queuing watch for: ${key} until connection`);
        // Still add to listener map, it will be sent when connection is established
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

  // Tüm register verilerini ve bağlantıyı sıfırla
  const resetConnection = useCallback(async () => {
    console.log('[SocketIO] Resetting connection and clearing all data');
    
    // Store the current subscriptions before disconnecting
    const currentSubscriptions = new Map(listenerMapRef.current);
    console.log(`[SocketIO] Preserving ${currentSubscriptions.size} subscriptions before reset`);
    
    // Disconnect and clear data
    await disconnect();
    
    // Small delay to ensure disconnect completes
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Reset the listener map to the stored subscriptions
    listenerMapRef.current = currentSubscriptions;
    
    // Reconnect with the new agent ID
    await connect();
    
    console.log('[SocketIO] Connection reset complete with new agent');
  }, [connect, disconnect]);

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
    resetConnection,
    selectAgent,
    clearAllRegisterValues,
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