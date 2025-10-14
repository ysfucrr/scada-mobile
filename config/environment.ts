import Constants from 'expo-constants';

// Default values based on the .env.local file from the main project
const ENV = {
  development: {
    API_URL: 'http://localhost:3000',
    SERVICE_PORT: '3001',
    WS_URL: 'ws://localhost:3001',
  },
  production: {
    API_URL: 'http://localhost:3000',
    SERVICE_PORT: '3001', 
    WS_URL: 'ws://localhost:3001',
  }
};

const getEnvVars = () => {
  // What is __DEV__ ?
  // This variable is set to true when react-native is running in Dev mode.
  // __DEV__ is true when run locally, but false when published.
  if (__DEV__) {
    return ENV.development;
  } else {
    return ENV.production;
  }
};

export default getEnvVars();