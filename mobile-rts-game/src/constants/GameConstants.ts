import { StyleSheet, Dimensions } from 'react-native';

// Game constants based on Red Alert 2 mechanics
export const GAME_CONFIG = {
  TILE_SIZE: 32,
  GRID_WIDTH: Math.ceil(Dimensions.get('window').width / 32),
  GRID_HEIGHT: Math.ceil(Dimensions.get('window').height / 32),
  MAX_UNITS: 100,
  MAX_BUILDINGS: 50,
};

// Resource costs (based on Red Alert 2)
export const COSTS = {
  POWER_PLANT: 100,
  BARRACKS: 150,
  WAR_FACTORY: 200,
  ORE_REFINERY: 150,
  SOLDIER: 50,
  TANK: 200,
  ENGINEER: 100,
  APC: 150,
};

// Unit stats
export const UNIT_STATS = {
  SOLDIER: {
    health: 100,
    damage: 10,
    range: 80,
    speed: 2,
    armor: 'light',
  },
  TANK: {
    health: 300,
    damage: 30,
    range: 120,
    speed: 1.5,
    armor: 'heavy',
  },
  ENGINEER: {
    health: 75,
    damage: 0,
    range: 50,
    speed: 2.5,
    armor: 'none',
    special: 'capture',
  },
};

// Building stats
export const BUILDING_STATS = {
  POWER_PLANT: {
    health: 200,
    powerOutput: 50,
    buildTime: 3000,
  },
  BARRACKS: {
    health: 300,
    powerConsumption: 10,
    buildTime: 5000,
  },
  WAR_FACTORY: {
    health: 400,
    powerConsumption: 20,
    buildTime: 7000,
  },
  ORE_REFINERY: {
    health: 250,
    powerConsumption: 15,
    buildTime: 6000,
  },
};

// Game balance constants
export const GAME_BALANCE = {
  STARTING_CREDITS: 1000,
  CREDIT_INCOME_RATE: 10, // per second
  MAX_POWER_CONSUMPTION: 100,
  BUILDING_PLACEMENT_RANGE: 200,
  UNIT_SELECTION_RANGE: 50,
};

// Colors for UI
export const COLORS = {
  ALLIES_BLUE: '#4a90e2',
  SOVIET_RED: '#e24a4a',
  NEUTRAL_GRAY: '#666666',
  SELECTED_GREEN: '#50e3c2',
  ENEMY_RED: '#ff4444',
  POWER_YELLOW: '#ffa500',
  CREDITS_GOLD: '#ffd700',
};

export const styles = StyleSheet.create({
  // Game UI Styles
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
    backgroundColor: COLORS.ALLIES_BLUE,
  },
  unitButton: {
    backgroundColor: COLORS.SOVIET_RED,
  },
  selectedButton: {
    backgroundColor: COLORS.SELECTED_GREEN,
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
    backgroundColor: COLORS.SELECTED_GREEN,
  },
  buildButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pauseButton: {
    backgroundColor: COLORS.POWER_YELLOW,
  },
});