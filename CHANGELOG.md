# Changelog

All notable changes to this project will be documented in this file.

## [7.0.0-releasebeta] - 2024-12-19

### Added
- **Enemy Persistence and Pursuit System**: Intelligent enemy behavior where enemies can pursue players after fleeing based on narrative context
- **AI-Driven Enemy Pursuit Logic**: AI determines if enemies should chase players based on enemy type, environment, distance, and purpose
- **Enhanced Enemy Stats Generation**: Improved randomization system ensuring varied enemy stats instead of uniform values
- **Attack Bonus Validation**: Guaranteed non-negative attack bonuses for all enemies with proper scaling
- **Threat Level UI Display**: Visual threat level indicators in combat modal with color-coded badges
- **Combat Page Enemy Clearing**: Automatic enemy clearing from sceneState when combat ends or player flees

### Changed
- **Enemy Stats Randomization**: Fixed uniform stats issue by improving seed-based randomization with proper variation ranges
- **Attack Bonus Calculation**: Enhanced attack bonus formula to ensure values are never negative with better scaling
- **Threat Level Multipliers**: Updated threat level multipliers to provide balanced stat progression without negative values
- **Enemy Pursuit Behavior**: Replaced hard-coded enemy clearing with AI-driven pursuit decisions based on narrative context
- **Combat Modal UI**: Added threat level display with appropriate color coding (green for low, yellow for medium, red for high/extreme)

### Fixed
- **Enemy Stats Uniformity**: Fixed issue where all enemies had identical stats (all 8s) by improving randomization algorithm
- **Negative Attack Bonuses**: Resolved attack bonus calculation allowing negative values by implementing proper validation
- **Enemy Persistence Bug**: Fixed enemies remaining in sceneState after player flees, causing them to reappear
- **Missing Threat Level UI**: Added threat level display in combat modal for better player awareness
- **Enemy Respawn Logic**: Improved enemy clearing logic to work consistently across modal popup and combat page flee scenarios

### Technical Improvements
- **Enhanced Randomization**: Improved seed-based stat generation with better variation ranges (8-20 instead of fixed values)
- **Attack Bonus Validation**: Added Math.max(0, ...) validation to ensure attack bonuses are never negative
- **Pursuit Detection Logic**: Smart detection of player flee actions using multiple keyword patterns
- **Context-Aware AI Prompting**: Enhanced AI prompts with detailed guidance on enemy pursuit behavior and factors
- **Comprehensive Logging**: Added detailed console logging for enemy generation, pursuit decisions, and stat validation

### UI/UX Enhancements
- **Threat Level Indicators**: Clear visual threat level badges in combat modal with intuitive color coding
- **Enemy Information Display**: Enhanced enemy details showing threat level alongside other combat information
- **Consistent Styling**: Unified threat level display across modal header and details sections
- **Better Player Awareness**: Players can now easily identify enemy difficulty before engaging in combat

## [7.0.0-releasebeta] - 2024-12-19

### Added
- **Skill Book System**: Complete implementation of skill books in merchant shops with learning mechanics
- **Skill Book Card Component**: Dedicated UI component for skill books with rarity colors and skill information
- **Skill Book Inventory Integration**: Skill books display in inventory with "Sử dụng" (Use) button functionality
- **Skill Book Filter**: Added "Sách kỹ năng" filter in inventory view for easy skill book browsing
- **Skill Book Chance System**: Progressive skill book chance increase (10% per restock, max 70%) in merchant shops
- **Enhanced Item Rarity**: Improved rarity distribution with higher rates for rare, epic, and legendary items
- **Skills Display in Equipment**: Replaced equipment bonuses section with character skills display
- **Combat Skills Scroll**: Added scrollable skills menu in combat page for better navigation

### Changed
- **Merchant Shop Integration**: Skill books now integrated into regular buying/selling system
- **Inventory System**: Updated to support both regular items and skill books with unified interface
- **Equipment View**: Replaced "Tổng Bonuses Trang Bị" with "Kỹ Năng Nhân Vật" display
- **Skill Book Generation**: AI generates skill books with proper CharacterSkill format matching character creation
- **Shop Restock Logic**: Enhanced restock system with skill book chance progression and better item randomization

### Fixed
- **Skill Book Buying**: Fixed skill books not being purchasable like regular items
- **Skill Book Display**: Fixed missing buyPrice and incorrect "Loại" field display for skill books
- **Inventory Type Safety**: Fixed TypeScript errors for mixed inventory item types
- **Skill Book Usage**: Fixed skill book removal from inventory after successful skill learning
- **Combat Skills UI**: Fixed skills menu scroll issue when having many skills

### Technical Improvements
- **Type Safety**: Enhanced TypeScript interfaces for SkillBook and mixed inventory types
- **Component Architecture**: Created reusable SkillBookCard component for consistent skill book display
- **Service Integration**: Seamless integration of skill books into existing merchant and inventory services
- **UI Consistency**: Unified design language for skill books across shop and inventory interfaces

## [7.0.0-releasebeta] - 2024-12-19

### Added
- **Smart Enemy Count Calculation**: Dynamic enemy count calculation based on world difficulty, player level, location type, and narrative context
- **Intelligent Threat Level System**: Context-aware threat level calculation using world difficulty, player level, location patterns, and enemy characteristics
- **Location Type Inference**: Automatic location classification (dungeon, forest, city, cave, ruins, wilderness) for better enemy generation
- **Context-Aware AI Prompting**: Real-time context information passed to AI including calculated enemy count and threat level suggestions
- **Comprehensive Enemy Validation**: Full combat stats validation ensuring all generated enemies are combat-ready
- **Threat-Based Stat Scaling**: Dynamic stat scaling based on threat levels (low, medium, high, extreme) with comprehensive multipliers
- **Contextual Weapon Generation**: Smart weapon name and damage type generation based on enemy characteristics and threat level
- **Enemy Ability System**: Special abilities for high/extreme threat enemies with cooldown management

### Changed
- **Removed Random Encounter System**: Completely eliminated hardcoded random encounter rates and percentages
- **Enhanced AI Prompt System**: Updated AI prompts to use calculated context instead of hardcoded percentages
- **Improved Enemy Generation**: Replaced random encounter logic with sceneState.dangers.monsters-based system
- **Streamlined Quest Combat Service**: Simplified quest combat service by removing encounter rate calculation logic
- **Updated Documentation**: Refreshed changelog and implementation docs to reflect new context-based system

### Removed
- **Quest Combat Debug UI**: Removed QuestCombatDebug modal that displayed random encounter mechanism information
- **Random Encounter Logic**: Eliminated all hardcoded encounter rate calculations and flee tracking systems
- **Player Flee Data Persistence**: Removed player_fled_random_combat localStorage tracking across all pages
- **Hardcoded Percentages**: Replaced all hardcoded enemy spawn percentages with dynamic calculation functions

### Fixed
- **Enemy Count Control**: Fixed issue where AI was generating too many enemies by implementing smart count limiting
- **Threat Level Consistency**: Ensured threat levels are calculated consistently based on actual game context
- **Context Information Flow**: Fixed missing context information in AI prompts by adding real-time calculation
- **Build Warnings**: Resolved TypeScript warnings and linter errors from unused parameters

### Technical Improvements
- **Function-Based Architecture**: Replaced hardcoded logic with reusable calculation functions
- **Context Calculation**: Real-time context analysis including world difficulty, player level, location type, and narrative
- **Smart Override System**: AI suggestions are overridden by calculated values for better balance
- **Comprehensive Logging**: Detailed console logging for debugging enemy generation and context calculations
- **Type Safety**: Enhanced TypeScript interfaces and proper type definitions for new calculation functions

## [7.0.0-releasebeta] - 2024-12-19

### Added
- **NPC Ally System**: Complete implementation allowing players to recruit up to 2 NPCs as allies based on relationship levels
- **Relationship-Based Recruitment**: 50% acceptance chance at relationship level 50+, 100% guaranteed at level 80+
- **Ally Combat Integration**: Allies automatically join combat with intelligent AI targeting enemies instead of players
- **Ally Injury System**: Allies become temporarily injured (3 turns) when defeated in combat instead of permanent death
- **Ally Management UI**: Recruitment buttons in InfoMenu with acceptance chance indicators and ally status display
- **Ally Combat Cards**: Dedicated UI section between enemy and player cards with green-themed styling
- **Ally AI Intelligence**: Smart targeting system prioritizing weakest enemies and strategic healing
- **Debug Tools**: Relationship point manipulation tools for testing ally recruitment mechanics
- **Auto-Heal System**: Automatic ally recovery after injury period with turn-based tracking

### Changed
- **Enemy AI Behavior**: Enemies now attack both players and allies, creating more balanced combat
- **Combat Service**: Updated to handle ally combatants with proper turn management and death handling
- **InfoMenu Interface**: Enhanced relationship section with ally management controls and status indicators
- **CombatantCard Component**: Added support for ally type with distinctive green styling and badges
- **Enemy AI Service**: Modified to target both players and allies for more realistic combat scenarios
- **Combat Preparation**: Automatic ally stat generation using existing combat preparation service

### Fixed
- **Ally Targeting Bug**: Fixed issue where allies were incorrectly attacking players instead of enemies
- **Combat Balance**: Improved combat difficulty by making allies vulnerable to enemy attacks
- **UI Consistency**: Unified styling and behavior across all ally-related interface elements
- **Turn Processing**: Fixed ally turn processing to use correct AI decision-making logic
- **Relationship Display**: Removed confusing acceptance chance text for cleaner UI

### Technical Improvements
- **Type Safety**: Enhanced TypeScript interfaces for ally system with proper type definitions
- **Service Architecture**: Created dedicated AllyManagementService for clean separation of concerns
- **Combat Integration**: Seamless integration of allies into existing combat system without breaking changes
- **Performance Optimization**: Efficient ally state management with minimal performance impact
- **Code Organization**: Well-structured ally system following existing codebase patterns

### UI/UX Enhancements
- **Visual Hierarchy**: Clear distinction between enemies, allies, and players in combat interface
- **Status Indicators**: Intuitive badges showing ally status (recruited, injured, recovery time)
- **Responsive Design**: Ally cards adapt to different screen sizes with consistent styling
- **User Feedback**: Clear success/failure messages for ally recruitment attempts
- **Debug Accessibility**: Easy-to-use debug tools for testing and development

## [6.6.0-releasebeta] - 2024-12-19

### Added
- **Multi-Enemy Combat System**: Complete implementation supporting 2-4 enemies in single combat encounters
- **Scene-Based Enemy Encounters**: AI-driven enemy generation from sceneState.dangers.monsters with difficulty-based threat levels
- **Context-Based Combat**: AI-driven enemy count determination based on narrative context and scene state
- **Enemy Coordination Strategies**: Advanced AI tactics for hard difficulty including focus fire, protect healer, flanking, and smart item usage
- **Turn Indicators**: Clear visual indicators with arrow markers and "ĐANG LƯỢT" badges for current turn combatants
- **Mobile UI Optimization**: Horizontal scroll carousel for enemy cards with navigation indicators
- **XP Multiplier System**: Experience rewards multiplied by number of defeated enemies
- **Enhanced Loot Distribution**: Bonus loot and special items for defeating 3+ enemies
- **Combat Log Pinning**: Always-visible combat log with pin functionality

### Changed
- **Combat Service**: Updated to handle multiple enemies with proper initiative rolling and turn management
- **Enemy AI Service**: Enhanced with coordination strategies and improved decision-making algorithms
- **Gemini Service**: Modified to generate multiple varied enemies with context-appropriate descriptions
- **Combat Page UI**: Redesigned layout for optimal space utilization and responsive design
- **Action Menu**: Optimized spacing and layout for better button visibility and accessibility
- **Turn Processing**: Automatic sequential enemy turn processing with recursive logic

### Fixed
- **Skill Targeting**: Fixed player skills targeting selected enemy instead of first enemy
- **Enemy AI Stuck**: Resolved issue where enemy turns would get stuck in processing loop
- **Mobile Layout**: Fixed UI cutting off on mobile devices with proper horizontal scrolling
- **Duplicate Turn Indicators**: Fixed multiple combatants showing current turn indicators simultaneously
- **Empty Space Issues**: Eliminated unnecessary empty space in combat page layout
- **Button Visibility**: Ensured all action buttons (Flee, End Turn) are always visible on PC

### Technical Improvements
- **Performance Optimization**: Efficient processing of multiple enemies without performance degradation
- **Code Cleanup**: Removed debug logs and unused imports for cleaner codebase
- **Type Safety**: Enhanced TypeScript interfaces for multi-enemy combat system
- **Responsive Design**: Improved mobile and desktop layout compatibility
- **Memory Management**: Optimized combat state management for multiple combatants

### UI/UX Enhancements
- **Visual Hierarchy**: Clear distinction between current and next turn combatants
- **Space Utilization**: Optimized layout to maximize enemy card display while maintaining action button visibility
- **Accessibility**: Improved button sizing and spacing for better user interaction
- **Consistency**: Unified design language across all combat interface elements

## [6.5.1-releasebeta] - Previous Release
- Base combat system with single enemy encounters
- Basic turn-based combat mechanics
- Initial mobile responsiveness