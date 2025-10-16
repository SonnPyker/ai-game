# Changelog

All notable changes to this project will be documented in this file.

## [6.6.0-releasebeta] - 2024-12-19

### Added
- **Multi-Enemy Combat System**: Complete implementation supporting 2-4 enemies in single combat encounters
- **Random Encounter Probabilities**: Difficulty-based enemy spawn rates (Easy: 2 enemies 10%, 3 enemies 5%, 4 enemies 2.5%; Medium: 2 enemies 15%, 3 enemies 7.5%, 4 enemies 4%; Hard: 2 enemies 20%, 3 enemies 10%, 4 enemies 7%)
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