import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import RegistersScreen from '../screens/RegistersScreen';

const Stack = createStackNavigator();

export default function RegistersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="RegistersList" 
        component={RegistersScreen}
      />
    </Stack.Navigator>
  );
}