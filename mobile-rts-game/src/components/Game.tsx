import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Phaser from 'phaser';

interface GameProps {
  onGameReady?: (game: Phaser.Game) => void;
}

const { width, height } = Dimensions.get('window');

class RTSGameScene extends (Phaser as any).Scene {
  private selectedUnit: any = null;
  private buildings: any[] = [];gs: any[] = [];
  private units: any[] = [];
  private enemyUnits: any[] = [];
  private enemyBuildings: any[] = [];
  private resources: any = {
    credits: 1000,
    power: 0,
    maxPower: 100
  };
  private projectiles: any[] = [];
  private explosions: any[] = [];
  private aiActionTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'RTSGame' });
  }

  preload() {
    // Placeholder assets - will be replaced with actual game assets
    (this.load as any).image('ground', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    (this.load as any).image('powerplant', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    (this.load as any).image('barracks', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    (this.load as any).image('warfactory', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    (this.load as any).image('soldier', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    (this.load as any).image('tank', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  create() {
    // Create grid-based map
    this.createGrid();
    
    // Initialize UI
    this.createUI();
    
    // Create enemy base
    this.createEnemyBase();
    
    // Touch controls
    this.setupTouchControls();
    
    // Start game loop
    this.setupGameLoop();
    
    // Start AI
    this.startAI();
  }

  private createGrid() {
    const tileSize = 32;
    const mapWidth = Math.ceil(width / tileSize);
    const mapHeight = Math.ceil(height / tileSize);
    
    // Create ground tiles
    for (let x = 0; x < mapWidth; x++) {
      for (let y = 0; y < mapHeight; y++) {
        const ground = (this.add as any).image(x * tileSize, y * tileSize, 'ground');
        ground.setOrigin(0, 0);
        ground.setDisplaySize(tileSize, tileSize);
      }
    }
  }

  private createUI() {
    // Resource display
    (this.add as any).text(10, 10, `Credits: ${this.resources.credits}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 }
    }).setScrollFactor(0);
    
    (this.add as any).text(10, 35, `Power: ${this.resources.power}/${this.resources.maxPower}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 }
    }).setScrollFactor(0);
  }

  private setupTouchControls() {
    (this.input as any).on('pointerdown', (pointer: any) => {
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      
      // Check if clicking on a unit
      const clickedUnit = this.units.find((unit: any) => 
        Math.abs(unit.x - worldX) < 20 && Math.abs(unit.y - worldY) < 20
      );
      
      if (clickedUnit) {
        this.selectUnit(clickedUnit);
      } else {
        // Move selected unit to clicked position
        if (this.selectedUnit) {
          this.moveUnit(this.selectedUnit, worldX, worldY);
        } else {
          // Try to place building
          const selectedBuilding = (this as any).selectedBuilding;
          if (selectedBuilding) {
            this.placeBuilding(worldX, worldY, selectedBuilding);
          }
        }
      }
    });
  }

  private setupGameLoop() {
    // Resource generation
    (this.time as any).addEvent({
      delay: 1000, // Every second
      callback: () => {
        this.resources.credits += 10;
        this.updateUI();
      },
      callbackScope: this,
      loop: true
    });
  }

  private selectUnit(unit: any) {
    // Deselect previous unit
    if (this.selectedUnit) {
      this.selectedUnit.setTint(0xffffff);
    }
    
    this.selectedUnit = unit;
    unit.setTint(0x00ff00); // Highlight selected unit
  }

  private moveUnit(unit: any, targetX: number, targetY: number) {
    // Simple movement - will be enhanced with pathfinding
    (this.tweens as any).add({
      targets: unit,
      x: targetX,
      y: targetY,
      duration: 1000,
      ease: 'Linear'
    });
  }

  private updateUI() {
    // Update resource display
    // This would be enhanced with proper UI components
  }

  private placeBuilding(x: number, y: number, buildingType: string) {
    const costs: { [key: string]: number } = {
      'powerplant': 100,
      'barracks': 150,
      'warfactory': 200
    };

    const cost = costs[buildingType];
    if (this.resources.credits >= cost) {
      this.resources.credits -= cost;

      // Create building
      let building: any;
      if (buildingType === 'powerplant') {
        building = (this.add as any).rectangle(x, y, 40, 40, 0x4a90e2);
        this.resources.maxPower += 50;
        this.resources.power += 50;
      } else if (buildingType === 'barracks') {
        building = (this.add as any).rectangle(x, y, 40, 40, 0x50e3c2);
        this.resources.power -= 10;
      } else if (buildingType === 'warfactory') {
        building = (this.add as any).rectangle(x, y, 60, 40, 0xe24a4a);
        this.resources.power -= 20;
      }

      if (building) {
        building.setOrigin(0.5);
        this.buildings.push(building);
        this.updateUI();
      }
    }
  }

  // Building methods
  public buildPowerPlant(x: number, y: number) {
    if (this.resources.credits >= 100) {
      this.resources.credits -= 100;
      this.resources.maxPower += 50;
      this.resources.power += 50;
      
      const powerPlant = (this.add as any).image(x, y, 'powerplant');
      this.buildings.push(powerPlant);
      this.updateUI();
    }
  }

  public buildBarracks(x: number, y: number) {
    if (this.resources.credits >= 150) {
      this.resources.credits -= 150;
      
      const barracks = (this.add as any).image(x, y, 'barracks');
      this.buildings.push(barracks);
      this.updateUI();
    }
  }

  public createSoldier() {
    if (this.resources.credits >= 50) {
      this.resources.credits -= 50;
      
      const soldier = (this.add as any).image(100, 100, 'soldier');
      soldier.setInteractive();
      this.units.push(soldier);
      this.updateUI();
    }
  }

  public createTank() {
    if (this.resources.credits >= 200) {
      this.resources.credits -= 200;
      
      const tank = (this.add as any).image(150, 100, 'tank');
      tank.setInteractive();
      this.units.push(tank);
      this.updateUI();
    }
  }

  private createEnemyBase() {
    // Create enemy base at opposite side of map
    const enemyX = width - 200;
    const enemyY = height - 200;

    // Enemy power plant
    const enemyPower = (this.add as any).rectangle(enemyX, enemyY, 40, 40, 0xff4444);
    enemyPower.setOrigin(0.5);
    this.enemyBuildings.push(enemyPower);

    // Enemy barracks
    const enemyBarracks = (this.add as any).rectangle(enemyX + 60, enemyY, 40, 40, 0xff6666);
    enemyBarracks.setOrigin(0.5);
    this.enemyBuildings.push(enemyBarracks);

    // Create initial enemy units
    this.createEnemySoldier(enemyX, enemyY - 50);
    this.createEnemySoldier(enemyX + 60, enemyY - 50);
  }

  private createEnemySoldier(x: number, y: number) {
    const enemy = (this.add as any).circle(x, y, 10, 0xff0000);
    enemy.setData('type', 'soldier');
    enemy.setData('health', 100);
    enemy.setData('maxHealth', 100);
    enemy.setData('damage', 10);
    enemy.setData('speed', 1);
    enemy.setData('lastShot', 0);
    this.enemyUnits.push(enemy);
  }

  private startAI() {
    this.aiActionTimer = (this.time as any).addEvent({
      delay: 2000, // Every 2 seconds
      callback: this.updateAI,
      callbackScope: this,
      loop: true
    });
  }

  private updateAI() {
    // Simple AI behavior
    this.enemyUnits.forEach(enemy => {
      // Find nearest player unit
      let nearestPlayerUnit: any = null;
      let minDistance = Infinity;

      this.units.forEach(unit => {
        const distance = Math.sqrt(
          Math.pow(unit.x - enemy.x, 2) + Math.pow(unit.y - enemy.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestPlayerUnit = unit;
        }
      });

      if (nearestPlayerUnit && minDistance < 300) {
        // Attack if in range
        this.enemyAttack(nearestPlayerUnit, enemy);
      } else if (nearestPlayerUnit) {
        // Move towards player
        const angle = Math.atan2(nearestPlayerUnit.y - enemy.y, nearestPlayerUnit.x - enemy.x);
        const speed = enemy.getData('speed');
        
        enemy.x += Math.cos(angle) * speed;
        enemy.y += Math.sin(angle) * speed;
      }
    });
  }

  private enemyAttack(target: any, attacker: any) {
    const now = Date.now();
    const lastShot = attacker.getData('lastShot') || 0;
    const fireRate = 1000; // 1 second between shots

    if (now - lastShot < fireRate) return;

    const range = 100;
    const distance = Math.sqrt(
      Math.pow(target.x - attacker.x, 2) + Math.pow(target.y - attacker.y, 2)
    );

    if (distance <= range) {
      // Create projectile
      const projectile = (this.add as any).circle(attacker.x, attacker.y, 3, 0xffff00);
      projectile.setData('target', target);
      projectile.setData('damage', attacker.getData('damage'));
      projectile.setData('owner', 'enemy');
      this.projectiles.push(projectile);

      // Animate projectile
      (this.tweens as any).add({
        targets: projectile,
        x: target.x,
        y: target.y,
        duration: 300,
        onComplete: () => {
          this.handleProjectileHit(projectile);
        }
      });

      attacker.setData('lastShot', now);
    }
  }

  private handleProjectileHit(projectile: any) {
    const target = projectile.getData('target');
    const damage = projectile.getData('damage');
    const owner = projectile.getData('owner');

    if (target && owner === 'enemy') {
      // Check if target is player unit
      const playerUnitIndex = this.units.findIndex(unit => unit === target);
      if (playerUnitIndex !== -1) {
        // Apply damage (for simplicity, destroy instantly)
        this.createExplosion(target.x, target.y);
        target.destroy();
        this.units.splice(playerUnitIndex, 1);
      }
    }

    // Remove projectile
    projectile.destroy();
    const projectileIndex = this.projectiles.indexOf(projectile);
    if (projectileIndex !== -1) {
      this.projectiles.splice(projectileIndex, 1);
    }
  }

  private createExplosion(x: number, y: number) {
    const explosion = (this.add as any).circle(x, y, 20, 0xff6600, 0.8);
    (this.tweens as any).add({
      targets: explosion,
      radius: 40,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        explosion.destroy();
      }
    });
  }

  update() {
    // Update projectiles
    this.projectiles.forEach((projectile: any, index: number) => {
      // Check collision with player units
      this.units.forEach((unit: any) => {
        const distance = Math.sqrt(
          Math.pow(unit.x - projectile.x, 2) + Math.pow(unit.y - projectile.y, 2)
        );
        
        if (distance < 15) {
          this.createExplosion(projectile.x, projectile.y);
          unit.destroy();
          this.units = this.units.filter((u: any) => u !== unit);
          projectile.destroy();
          this.projectiles.splice(index, 1);
        }
      });
    });

    // Check win/lose conditions
    if (this.units.length === 0 && this.buildings.length > 0) {
      console.log('Game Over - Enemy Wins!');
    }
    
    if (this.enemyUnits.length === 0 && this.enemyBuildings.length > 0) {
      console.log('Victory - Player Wins!');
    }
  }
}

const Game: React.FC<GameProps> = ({ onGameReady }) => {
    const gameRef = useRef<any>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !game) {
      const phaserConfig: any = {
        type: Phaser.AUTO,
        width: width,
        height: height,
        parent: 'game-container',
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: [RTSGameScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        backgroundColor: '#2d5a2d'
      };

      const newGame = new Phaser.Game(phaserConfig);
      setGame(newGame);

      if (onGameReady) {
        onGameReady(newGame);
      }
    }

    return () => {
      if (game) {
        game.destroy(true);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View ref={gameRef as any} id="game-container" style={styles.gameContainer} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gameContainer: {
    flex: 1,
  }
});

export default Game;