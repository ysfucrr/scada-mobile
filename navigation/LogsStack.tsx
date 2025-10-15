import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import LogsScreen from '../screens/LogsScreen';

const Stack = createStackNavigator();

export default function LogsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="LogsList" 
        component={LogsScreen}
      />
    </Stack.Navigator>
  );
}