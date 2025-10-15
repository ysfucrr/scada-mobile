import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AuthService from '../services/AuthService';
import { useConnection } from '../context/ConnectionContext';

const { width } = Dimensions.get('window');

// Theme configuration
const theme = {
  colors: {
    primary: '#1E88E5',
    primaryDark: '#1565C0',
    secondary: '#00ACC1',
    background: '#F5F8FA',
    card: '#FFFFFF',
    border: '#E0E0E0',
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    gradient: ['#1E88E5', '#1976D2'] as [string, string],
    success: '#4CAF50',
    error: '#F44336',
  },
};

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps = {}) {
  const { connect } = useConnection();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      // Sadece kayıtlı kullanıcı bilgilerini form'a doldur
      // Otomatik login yapmayı App.tsx'e bırak
      const savedCredentials = await AuthService.getSavedCredentials();
      if (savedCredentials && savedCredentials.username) {
        setUsername(savedCredentials.username);
        setRememberMe(savedCredentials.rememberMe);
        console.log('[LoginScreen] Loaded saved credentials for form');
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }

    setIsLoading(true);
    try {
      const success = await AuthService.simpleLogin(username, password, rememberMe);
      if (success) {
        // Login başarılı olduktan sonra ConnectionContext'i güncelle
        await connect();
        console.log('[LoginScreen] Login successful, connection context updated');
        
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        Alert.alert('Login Failed', 'Invalid username or password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#F5F8FA', '#E3F2FD']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Modern Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={theme.colors.gradient as [string, string, ...string[]]}
                  style={styles.logoGradient}
                >
                  <MaterialCommunityIcons 
                    name="shield-check" 
                    size={60} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
              </View>
              <Text style={styles.title}>SCADA Mobile</Text>
              <Text style={styles.subtitle}>Industrial Control System</Text>
            </View>

            {/* Modern Form Container */}
            <View style={styles.formContainer}>
              <BlurView
                intensity={100}
                tint="light"
                style={styles.blurContainer}
              >
                <View style={styles.formContent}>
                  {/* Username Input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons 
                        name="account-outline" 
                        size={22} 
                        color={theme.colors.text.secondary} 
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <MaterialCommunityIcons 
                        name="lock-outline" 
                        size={22} 
                        color={theme.colors.text.secondary} 
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                      >
                        <MaterialCommunityIcons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={22}
                          color={theme.colors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Remember Me */}
                  <View style={styles.rememberContainer}>
                    <Text style={styles.rememberText}>Remember Me</Text>
                    <Switch
                      value={rememberMe}
                      onValueChange={setRememberMe}
                      trackColor={{ 
                        false: theme.colors.border, 
                        true: theme.colors.primary + '50' 
                      }}
                      thumbColor={rememberMe ? theme.colors.primary : '#f4f3f4'}
                      ios_backgroundColor={theme.colors.border}
                    />
                  </View>

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#BDBDBD', '#9E9E9E'] as [string, string] : theme.colors.gradient as [string, string]}
                      style={styles.loginButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons 
                            name="login" 
                            size={24} 
                            color="#FFFFFF" 
                            style={styles.loginIcon}
                          />
                          <Text style={styles.loginButtonText}>Sign In</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Security Badge */}
                  <View style={styles.securityBadge}>
                    <MaterialCommunityIcons 
                      name="shield-lock-outline" 
                      size={16} 
                      color={theme.colors.success} 
                    />
                    <Text style={styles.securityText}>Secure Connection</Text>
                  </View>
                </View>
              </BlurView>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    letterSpacing: 0.5,
  },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  blurContainer: {
    borderRadius: 24,
  },
  formContent: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 248, 250, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  rememberText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loginIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  securityBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '500',
  },
});