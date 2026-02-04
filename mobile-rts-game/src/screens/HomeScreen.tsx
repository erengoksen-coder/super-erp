import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import Game from '../components/Game';

const { width, height } = Dimensions.get('window');

interface GameState {
  credits: number;
  power: number;
  maxPower: number;
  selectedBuilding: string | null;
}

const HomeScreen: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    credits: 1000,
    power: 0,
    maxPower: 100,
    selectedBuilding: null
  });

  const [isPaused, setIsPaused] = useState(false);
  const gameRef = useRef<any>(null);

  const handleGameReady = (game: any) => {
    gameRef.current = game;
    console.log('Game ready!');
  };

  const handleBuildingSelect = (buildingType: string) => {
    setGameState(prev => ({ ...prev, selectedBuilding: buildingType }));
  };

  const handleBuildStructure = () => {
    if (!gameRef.current || !gameState.selectedBuilding) return;

    const scene = gameRef.current.scene.getScene('RTSGame');
    if (!scene) return;

    // Build at center of screen for demo
    const centerX = width / 2;
    const centerY = height / 2;

    switch (gameState.selectedBuilding) {
      case 'powerplant':
        scene.buildPowerPlant(centerX, centerY);
        break;
      case 'barracks':
        scene.buildBarracks(centerX, centerY);
        break;
    }

    setGameState(prev => ({ ...prev, selectedBuilding: null }));
  };

  const handleCreateUnit = (unitType: string) => {
    if (!gameRef.current) return;

    const scene = gameRef.current.scene.getScene('RTSGame');
    if (!scene) return;

    switch (unitType) {
      case 'soldier':
        scene.createSoldier();
        break;
      case 'tank':
        scene.createTank();
        break;
    }
  };

  return (
    <View style={styles.container}>
      {/* Game Canvas */}
      <View style={styles.gameArea}>
        <Game onGameReady={handleGameReady} />
      </View>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        {/* Resources Display */}
        <View style={styles.resourceBar}>
          <Text style={styles.resourceText}>💰 {gameState.credits}</Text>
          <Text style={styles.resourceText}>⚡ {gameState.power}/{gameState.maxPower}</Text>
        </View>

        {/* Building Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buildings</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buildingButton,
                gameState.selectedBuilding === 'powerplant' && styles.selectedButton,
                gameState.credits < 100 && styles.disabledButton
              ]}
              onPress={() => handleBuildingSelect('powerplant')}
              disabled={gameState.credits < 100}
            >
              <Text style={styles.buttonText}>⚡ Power</Text>
              <Text style={styles.costText}>$100</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buildingButton,
                gameState.selectedBuilding === 'barracks' && styles.selectedButton,
                gameState.credits < 150 && styles.disabledButton
              ]}
              onPress={() => handleBuildingSelect('barracks')}
              disabled={gameState.credits < 150}
            >
              <Text style={styles.buttonText}>🏠 Barracks</Text>
              <Text style={styles.costText}>$150</Text>
            </TouchableOpacity>
          </View>
          
          {gameState.selectedBuilding && (
            <TouchableOpacity
              style={[styles.buildButton, styles.buildConfirmButton]}
              onPress={handleBuildStructure}
            >
              <Text style={styles.buildButtonText}>Build {gameState.selectedBuilding}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unit Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.unitButton,
                gameState.credits < 50 && styles.disabledButton
              ]}
              onPress={() => handleCreateUnit('soldier')}
              disabled={gameState.credits < 50}
            >
              <Text style={styles.buttonText}>🚶 Soldier</Text>
              <Text style={styles.costText}>$50</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.unitButton,
                gameState.credits < 200 && styles.disabledButton
              ]}
              onPress={() => handleCreateUnit('tank')}
              disabled={gameState.credits < 200}
            >
              <Text style={styles.buttonText}>🚗 Tank</Text>
              <Text style={styles.costText}>$200</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Game Controls */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.pauseButton]}
            onPress={() => setIsPaused(!isPaused)}
          >
            <Text style={styles.buttonText}>
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  gameArea: {
    flex: 3,
    backgroundColor: '#2d5a2d',
  },
  controlPanel: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    padding: 10,
    borderTopWidth: 2,
    borderTopColor: '#444',
  },
  resourceBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  resourceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buildingButton: {
    backgroundColor: '#4a90e2',
  },
  unitButton: {
    backgroundColor: '#e24a4a',
  },
  selectedButton: {
    backgroundColor: '#50e3c2',
    borderWidth: 2,
    borderColor: '#fff',
  },
  disabledButton: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  costText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  buildButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buildConfirmButton: {
    backgroundColor: '#50e3c2',
  },
  buildButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pauseButton: {
    backgroundColor: '#ffa500',
  },
});

export default HomeScreen;