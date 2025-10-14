import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface User {
  id: string;
  username: string;
  permissionLevel: 'read' | 'readwrite' | 'admin';
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Login kullanıcı
  async login(credentials: LoginCredentials): Promise<{ success: boolean; message?: string; user?: User }> {
    try {
      const response = await ApiService.post('/api/mobile-users/login', {
        username: credentials.username,
        password: credentials.password
      });

      if (response.success && response.user) {
        this.currentUser = response.user;

        // Beni hatırla seçildiyse kullanıcı bilgilerini kaydet
        if (credentials.rememberMe) {
          await AsyncStorage.setItem('savedUsername', credentials.username);
          await AsyncStorage.setItem('savedPassword', credentials.password);
          await AsyncStorage.setItem('rememberMe', 'true');
        } else {
          // Beni hatırla seçili değilse temizle
          await this.clearSavedCredentials();
        }

        return { success: true, user: response.user };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Connection error. Please check your network.' 
      };
    }
  }

  // Kayıtlı kullanıcı bilgileriyle otomatik login
  async autoLogin(): Promise<{ success: boolean; message?: string; user?: User }> {
    try {
      const rememberMe = await AsyncStorage.getItem('rememberMe');
      if (rememberMe !== 'true') {
        return { success: false, message: 'No saved credentials' };
      }

      const savedUsername = await AsyncStorage.getItem('savedUsername');
      const savedPassword = await AsyncStorage.getItem('savedPassword');

      if (!savedUsername || !savedPassword) {
        return { success: false, message: 'No saved credentials' };
      }

      // Önce kullanıcının hala geçerli olup olmadığını kontrol et
      const verifyResponse = await ApiService.post('/api/mobile-users/verify', {
        username: savedUsername
      });

      if (!verifyResponse.success || !verifyResponse.valid) {
        // Kullanıcı artık geçerli değil, kayıtlı bilgileri temizle
        await this.clearSavedCredentials();
        return { success: false, message: 'User account is no longer valid' };
      }

      // Kullanıcı geçerli, login yap
      return await this.login({
        username: savedUsername,
        password: savedPassword,
        rememberMe: true
      });
    } catch (error) {
      console.error('Auto login error:', error);
      return { success: false, message: 'Auto login failed' };
    }
  }

  // Logout
  async logout(): Promise<void> {
    this.currentUser = null;
    // Sadece oturum bilgisini temizle, beni hatırla bilgilerini koru
    // Böylece kullanıcı tekrar giriş yapmak istediğinde bilgileri dolu gelir
  }

  // Kayıtlı kullanıcı bilgilerini temizle
  async clearSavedCredentials(): Promise<void> {
    await AsyncStorage.removeItem('savedUsername');
    await AsyncStorage.removeItem('savedPassword');
    await AsyncStorage.removeItem('rememberMe');
  }

  // Kayıtlı kullanıcı bilgilerini getir (login formunu doldurmak için)
  async getSavedCredentials(): Promise<{ username?: string; rememberMe: boolean }> {
    try {
      const savedUsername = await AsyncStorage.getItem('savedUsername');
      const rememberMe = await AsyncStorage.getItem('rememberMe') === 'true';
      
      return {
        username: savedUsername || undefined,
        rememberMe
      };
    } catch (error) {
      console.error('Error getting saved credentials:', error);
      return { rememberMe: false };
    }
  }

  // Mevcut kullanıcıyı getir
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Kullanıcının yetkisi var mı kontrol et
  hasPermission(requiredLevel: 'read' | 'readwrite' | 'admin'): boolean {
    if (!this.currentUser) return false;

    const levels = ['read', 'readwrite', 'admin'];
    const userLevelIndex = levels.indexOf(this.currentUser.permissionLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  }

  // Login durumunu kontrol et
  async isLoggedIn(): Promise<boolean> {
    try {
      const rememberMe = await AsyncStorage.getItem('rememberMe');
      const savedUsername = await AsyncStorage.getItem('savedUsername');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      
      return rememberMe === 'true' && !!savedUsername && !!savedPassword;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  // Basitleştirilmiş login metodu (LoginScreen için)
  async simpleLogin(username: string, password: string, rememberMe: boolean): Promise<boolean> {
    const result = await this.login({ username, password, rememberMe });
    return result.success;
  }

  // Basitleştirilmiş autoLogin metodu (LoginScreen için)
  async simpleAutoLogin(): Promise<boolean> {
    const result = await this.autoLogin();
    return result.success;
  }
}

export default AuthService.getInstance();