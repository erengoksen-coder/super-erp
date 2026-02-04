import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../src/screens/HomeScreen';
import { StatusBar } from 'react-native';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2c2c2c',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Mobile RTS Game' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;