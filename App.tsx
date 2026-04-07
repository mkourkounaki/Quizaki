import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from './src/context/GameContext';
import { GameScreens } from './src/screens/GameScreens';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <StatusBar style="dark" />
        <GameScreens />
      </GameProvider>
    </SafeAreaProvider>
  );
}
