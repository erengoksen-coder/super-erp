// Game utility functions for Red Alert 2 style mobile RTS game

import { COSTS, UNIT_STATS, BUILDING_STATS, GAME_BALANCE } from '../constants/GameConstants';

export interface Unit {
  id: string;
  type: 'soldier' | 'tank' | 'engineer';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  owner: 'player' | 'enemy';
  isSelected: boolean;
}

export interface Building {
  id: string;
  type: 'powerplant' | 'barracks' | 'warfactory' | 'orerefinery';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  owner: 'player' | 'enemy';
  isOperational: boolean;
}

export interface GameState {
  credits: number;
  power: number;
  maxPower: number;
  buildings: Building[];
  units: Unit[];
  selectedUnit: Unit | null;
  selectedBuilding: string | null;
}

export class GameLogic {
  // Resource management
  static canAfford(credits: number, itemCost: number): boolean {
    return credits >= itemCost;
  }

  static spendCredits(currentCredits: number, cost: number): number {
    return Math.max(0, currentCredits - cost);
  }

  static generateCredits(currentCredits: number): number {
    return currentCredits + GAME_BALANCE.CREDIT_INCOME_RATE;
  }

  // Power management
  static calculatePowerGeneration(buildings: Building[]): number {
    return buildings
      .filter(b => b.type === 'powerplant' && b.isOperational)
      .reduce((total, building) => total + BUILDING_STATS.POWER_PLANT.powerOutput, 0);
  }

  static calculatePowerConsumption(buildings: Building[]): number {
    let consumption = 0;
    buildings.forEach(building => {
      if (building.isOperational) {
        switch (building.type) {
          case 'barracks':
            consumption += BUILDING_STATS.BARRACKS.powerConsumption;
            break;
          case 'warfactory':
            consumption += BUILDING_STATS.WAR_FACTORY.powerConsumption;
            break;
          case 'orerefinery':
            consumption += BUILDING_STATS.ORE_REFINERY.powerConsumption;
            break;
        }
      }
    });
    return consumption;
  }

  // Unit management
  static createUnit(type: 'soldier' | 'tank' | 'engineer', x: number, y: number): Unit {
    const stats = UNIT_STATS[type.toUpperCase() as keyof typeof UNIT_STATS];
    return {
      id: `unit_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      health: stats.health,
      maxHealth: stats.health,
      owner: 'player',
      isSelected: false,
    };
  }

  static moveUnit(unit: Unit, targetX: number, targetY: number): Unit {
    return {
      ...unit,
      x: targetX,
      y: targetY,
    };
  }

  static isUnitInRange(attacker: Unit, target: Unit): boolean {
    const range = UNIT_STATS[attacker.type.toUpperCase() as keyof typeof UNIT_STATS].range;
    const distance = Math.sqrt(
      Math.pow(attacker.x - target.x, 2) + Math.pow(attacker.y - target.y, 2)
    );
    return distance <= range;
  }

  static attackUnit(attacker: Unit, target: Unit): Unit {
    const damage = UNIT_STATS[attacker.type.toUpperCase() as keyof typeof UNIT_STATS].damage;
    const newHealth = Math.max(0, target.health - damage);
    return {
      ...target,
      health: newHealth,
    };
  }

  // Building management
  static createBuilding(type: Building['type'], x: number, y: number): Building {
    const stats = BUILDING_STATS[type.toUpperCase() as keyof typeof BUILDING_STATS];
    return {
      id: `building_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      health: stats.health,
      maxHealth: stats.health,
      owner: 'player',
      isOperational: false, // Requires construction time
    };
  }

  static completeBuildingConstruction(building: Building): Building {
    return {
      ...building,
      isOperational: true,
    };
  }

  static canPlaceBuilding(x: number, y: number, buildings: Building[], buildingType: string, credits: number): boolean {
    // Check if position is valid (not overlapping other buildings)
    const hasOverlap = buildings.some(building => 
      Math.abs(building.x - x) < 40 && Math.abs(building.y - y) < 40
    );

    if (hasOverlap) return false;

    // Check if player has enough credits
    const buildingCost = COSTS[buildingType.toUpperCase() as keyof typeof COSTS];
    return this.canAfford(credits, buildingCost);
  }

  // Combat calculations
  static calculateDamage(attacker: Unit, target: Unit): number {
    const attackerDamage = UNIT_STATS[attacker.type.toUpperCase() as keyof typeof UNIT_STATS].damage;
    
    // Apply armor calculations
    let damageMultiplier = 1.0;
    
    if (target.type === 'tank' && attacker.type === 'soldier') {
      damageMultiplier = 0.5; // Soldiers do less damage to tanks
    } else if (target.type === 'soldier' && attacker.type === 'tank') {
      damageMultiplier = 1.5; // Tanks do more damage to soldiers
    }

    return Math.floor(attackerDamage * damageMultiplier);
  }

  // Pathfinding (simplified)
  static findPath(startX: number, startY: number, endX: number, endY: number): Array<{x: number, y: number}> {
    // Simple direct path - will be enhanced with A* algorithm
    const path = [];
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      path.push({ x, y });
    }
    
    return path;
  }

  // Game state validation
  static isGameOver(gameState: GameState): { isOver: boolean, winner?: 'player' | 'enemy' } {
    const playerBuildings = gameState.buildings.filter(b => b.owner === 'player');
    const enemyBuildings = gameState.buildings.filter(b => b.owner === 'enemy');

    if (playerBuildings.length === 0) {
      return { isOver: true, winner: 'enemy' };
    }

    if (enemyBuildings.length === 0) {
      return { isOver: true, winner: 'player' };
    }

    return { isOver: false };
  }

  // AI logic (basic)
  static getAIAction(gameState: GameState): string {
    const enemyBuildings = gameState.buildings.filter(b => b.owner === 'enemy');
    const enemyUnits = gameState.units.filter(u => u.owner === 'enemy');
    
    // Simple AI: build units if credits available, attack if strong enough
    if (gameState.credits >= COSTS.SOLDIER && enemyUnits.length < 10) {
      return 'build_soldier';
    }
    
    if (gameState.credits >= COSTS.TANK && enemyUnits.length < 5) {
      return 'build_tank';
    }
    
    if (enemyUnits.length >= 3) {
      return 'attack';
    }
    
    return 'wait';
  }
}