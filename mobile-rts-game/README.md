# Mobile RTS Game - Red Alert 2 Style

## Project Overview
Red Alert 2 tarzı gerçek zamanlı strateji (RTS) mobil oyunu geliştirme projesi.

## Red Alert 2 Core Mechanics Analysis

### 1. Resource Management
- **Ore Collection**: Mining vehicles collect ore from ore fields
- **Power Management**: Buildings require power from power plants
- **Credits Economy**: Primary currency for building and units

### 2. Base Building System
- **Construction Yard**: Main building for construction
- **Power Plants**: Provide power for base operations
- **Production Buildings**: Barracks (infantry), War Factory (vehicles)
- **Refineries**: Process ore into credits
- **Defense Structures**: Pillboxes, turrets, walls

### 3. Unit Production
- **Infantry Units**: Basic soldiers, engineers, special units
- **Vehicle Units**: Tanks, APCs, mining vehicles
- **Air Units**: Fighter jets, helicopters (limited)
- **Naval Units**: Ships, submarines (water maps)

### 4. Faction System
- **Allies**: Advanced technology, air superiority, chronoshift
- **Soviets**: Heavy armor, tesla technology, brute force

### 5. Combat Mechanics
- **Real-time combat**: Units fight automatically when in range
- **Damage types**: Anti-infantry, anti-armor, anti-air
- **Special abilities**: Chronoshift, iron curtain, nuclear strike
- **Terrain effects**: Cover, movement speed modifiers

## Mobile Adaptation Strategy

### Technical Stack
- **React Native**: Cross-platform mobile development
- **Phaser.js**: 2D game engine integration
- **TypeScript**: Type safety
- **Redux/Zustand**: State management

### Mobile Optimizations
- **Touch Controls**: Drag, tap, multi-touch gestures
- **Simplified UI**: Larger buttons, clearer visual feedback
- **Auto-management**: Optional auto-collect, auto-defend features
- **Quick matches**: 5-15 minute game sessions

### Features for Mobile
1. **Quick Start**: Fast matching and game initialization
2. **Smart Camera**: Auto-follow important events
3. **Simplified Economy**: Less resource micro-management
4. **AI Assist**: Build recommendations, auto-scouting
5. **Social Features**: Clans, leaderboards, friend battles

## Development Phases

### Phase 1: Core Engine (Week 1-2)
- [ ] React Native + Phaser setup
- [ ] Basic game loop and rendering
- [ ] Touch control system
- [ ] Simple map system

### Phase 2: Base Building (Week 3-4)
- [ ] Building placement system
- [ ] Power management
- [ ] Resource collection
- [ ] Basic UI

### Phase 3: Units & Combat (Week 5-6)
- [ ] Unit creation system
- [ ] Movement and pathfinding
- [ ] Combat mechanics
- [ ] AI behavior

### Phase 4: Polish & Balance (Week 7-8)
- [ ] Visual effects and sounds
- [ ] Game balance tweaks
- [ ] Performance optimization
- [ ] Testing and bug fixes

## Game Design Document Outline

### Core Loop
1. **Early Game**: Build base, collect resources, scout
2. **Mid Game**: Build army, defend raids, limited attacks
3. **Late Game**: Full-scale battles, superweapons, victory

### Victory Conditions
- **Annihilation**: Destroy all enemy buildings
- **Economic Victory**: Control X% of resources
- **Time Limit**: Most points when timer expires

### Monetization (if applicable)
- **Cosmetics**: Skins for buildings and units
- **Battle Pass**: Seasonal rewards
- **Speed-ups**: Reduce build times (optional)

## Next Steps
1. Initialize React Native project
2. Set up Phaser integration
3. Create basic game framework
4. Implement core mechanics testing