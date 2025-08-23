# CrickCoach UI/UX Design Guide

## 🎯 Overview

This document outlines the comprehensive UI/UX design system for **CrickCoach – AI-Powered Cricket Technique Analysis**, a modern, professional mobile application designed to provide cricket players with AI-driven technique analysis and coaching recommendations.

## 🎨 Design Philosophy

### Core Principles
- **Modern & Professional**: Clean, sleek design inspired by premium fitness apps
- **Sports-Inspired**: Cricket-themed color palette with professional aesthetics
- **User-Centric**: Intuitive navigation and clear information hierarchy
- **Accessible**: High contrast, large tap targets, multiple screen size support
- **Performance-Focused**: Smooth animations and responsive interactions

### Design Inspiration
- **Nike Training Club**: Clean card-based layouts and progress tracking
- **Strava**: Social and achievement-focused design patterns
- **Apple Fitness+**: Premium feel with smooth animations and micro-interactions

## 🎨 Design System

### Color Palette

#### Primary Colors
```typescript
primary: {
  50: '#E3F2FD',   // Lightest
  100: '#BBDEFB',
  200: '#90CAF9',
  300: '#64B5F6',
  400: '#42A5F5',
  500: '#2196F3',  // Primary Blue
  600: '#1E88E5',
  700: '#1976D2',
  800: '#1565C0',
  900: '#0D47A1',  // Darkest
}
```

#### Secondary Colors (Lime Green)
```typescript
secondary: {
  500: '#8BC34A',  // Secondary Green
  // ... full range
}
```

#### Accent Colors (Orange)
```typescript
accent: {
  500: '#FF9800',  // Accent Orange
  // ... full range
}
```

#### Status Colors
- **Success**: `#4CAF50` (Green)
- **Warning**: `#FF9800` (Orange)
- **Error**: `#F44336` (Red)
- **Info**: `#2196F3` (Blue)

### Typography

#### Font Families
- **Primary**: Inter (Clean, modern sans-serif)
- **Secondary**: Poppins (For headings and emphasis)
- **Mono**: SF Mono (For technical content)

#### Font Sizes
```typescript
fontSize: {
  xs: 12,      // Captions
  sm: 14,      // Small text
  base: 16,    // Body text
  lg: 18,      // Large text
  xl: 20,      // Subheadings
  '2xl': 24,   // Headings
  '3xl': 30,   // Large headings
  '4xl': 36,   // Hero text
  '5xl': 48,   // Display text
}
```

#### Font Weights
- **Light**: 300
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700
- **Extrabold**: 800

### Spacing System
```typescript
Spacing: {
  xs: 4,       // 4px
  sm: 8,       // 8px
  md: 16,      // 16px
  lg: 24,      // 24px
  xl: 32,      // 32px
  '2xl': 48,   // 48px
  '3xl': 64,   // 64px
  '4xl': 96,   // 96px
}
```

### Border Radius
```typescript
BorderRadius: {
  none: 0,
  sm: 4,       // Small elements
  md: 8,       // Medium elements
  lg: 12,      // Large elements
  xl: 16,      // Extra large elements
  '2xl': 24,   // Primary radius (cards)
  '3xl': 32,   // Very large elements
  full: 9999,  // Circular elements
}
```

### Shadows
```typescript
Shadows: {
  sm: {        // Small elevation
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {        // Medium elevation (cards)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {        // Large elevation
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {        // Extra large elevation
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
}
```

## 📱 Screen Designs

### 1. Splash Screen
**Purpose**: App introduction and branding
**Key Features**:
- Animated logo entrance
- Gradient background
- App tagline: "Your Personal AI Cricket Coach"
- Loading indicator

**Design Elements**:
- Large cricket bat emoji (🏏) as logo
- Typography: Poppins Bold for app name
- Smooth fade-in animations
- Professional gradient overlay

### 2. Home Screen
**Purpose**: Main navigation and feature discovery
**Key Features**:
- Two large analysis cards (Batting/Bowling)
- Quick action buttons
- Welcome message

**Design Elements**:
- Card-based layout with gradients
- Large, accessible tap targets
- Clear visual hierarchy
- Sports-themed icons

### 3. Video Capture Screen
**Purpose**: Record cricket technique videos
**Key Features**:
- Full-screen camera interface
- Recording guidelines
- Camera controls (flip, gallery, settings)
- Recording indicator

**Design Elements**:
- Corner guidelines for positioning
- Large record button with state changes
- Overlay controls with transparency
- Professional camera UI

### 4. Configuration Modal
**Purpose**: Player setup and preferences
**Key Features**:
- Two-step configuration process
- Player type selection (Batsman/Bowler)
- Handedness selection (Left/Right)

**Design Elements**:
- Step indicator with dots
- Card-based selection options
- Smooth transitions between steps
- Clear visual feedback

### 5. Upload Progress Screen
**Purpose**: Show analysis progress
**Key Features**:
- Circular progress indicator
- Step-by-step progress tracking
- Contextual tips and information
- Status-based messaging

**Design Elements**:
- Animated progress circle
- Step icons with color coding
- Contextual help text
- Professional loading states

### 6. Results Dashboard
**Purpose**: Display analysis results
**Key Features**:
- Overall score card
- Biomechanics breakdown
- Injury risk assessment
- Coaching recommendations

**Design Elements**:
- Score-based color coding
- Progress bars for metrics
- Risk level indicators
- Action-oriented recommendations

## 🧩 Component Library

### Core Components

#### 1. Button Component
```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}
```

**Variants**:
- **Primary**: Blue background, white text
- **Secondary**: Green background, white text
- **Outline**: Transparent with border
- **Ghost**: Transparent, minimal styling

#### 2. Card Component
```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'sm' | 'md' | 'lg' | 'xl';
}
```

**Variants**:
- **Default**: Standard card with shadow
- **Elevated**: Higher shadow for emphasis
- **Outlined**: Border instead of shadow
- **Flat**: No shadow, subtle background

#### 3. Progress Indicator
```typescript
interface ProgressIndicatorProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
}
```

**Features**:
- Circular progress animation
- Customizable colors and sizes
- Optional percentage display
- Smooth transitions

## 🎭 Microinteractions

### Animation Principles
- **Duration**: 150ms (fast), 300ms (normal), 500ms (slow)
- **Easing**: Smooth, natural curves
- **Purpose**: Provide feedback and guide attention

### Key Interactions
1. **Button Press**: Scale down (0.95) with opacity change
2. **Card Selection**: Elevation increase with shadow
3. **Progress Updates**: Smooth circular animation
4. **Screen Transitions**: Slide and fade effects
5. **Loading States**: Pulsing and rotating animations

## ♿ Accessibility

### Design Considerations
- **High Contrast**: Minimum 4.5:1 ratio for text
- **Large Tap Targets**: Minimum 44x44 points
- **Clear Typography**: Readable font sizes and weights
- **Color Independence**: Information not conveyed by color alone
- **Screen Reader Support**: Proper labels and descriptions

### Implementation
- Semantic HTML structure
- ARIA labels for interactive elements
- Focus indicators for navigation
- Alternative text for images and icons
- VoiceOver and TalkBack compatibility

## 📐 Responsive Design

### Screen Size Support
- **iPhone SE**: 375x667 (Compact)
- **iPhone 12**: 390x844 (Standard)
- **iPhone 12 Pro Max**: 428x926 (Large)
- **Android Variants**: Various sizes and densities

### Adaptive Layouts
- Flexible card layouts
- Responsive typography scaling
- Adaptive spacing based on screen size
- Touch-friendly interface elements

## 🎨 Dark Mode Support

### Color Adaptation
- **Background**: Dark charcoal (#121212)
- **Surface**: Dark gray (#1E1E1E)
- **Text**: Light colors for contrast
- **Accents**: Brighter colors for visibility

### Implementation
- Automatic system preference detection
- Manual toggle option
- Consistent color mapping
- Preserved brand identity

## 📋 Design Tokens

### Usage Guidelines
1. **Consistency**: Use design tokens for all styling
2. **Maintainability**: Centralized design system
3. **Scalability**: Easy to update and extend
4. **Documentation**: Clear usage guidelines

### File Structure
```
src/
├── design/
│   └── DesignSystem.ts
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── ProgressIndicator.tsx
└── screens/
    ├── SplashScreen.tsx
    ├── HomeScreen.tsx
    ├── VideoCaptureScreen.tsx
    ├── ConfigurationModal.tsx
    ├── UploadProgressScreen.tsx
    └── ResultsDashboard.tsx
```

## 🚀 Implementation Notes

### Technology Stack
- **React Native**: Cross-platform mobile development
- **Expo**: Development tools and services
- **TypeScript**: Type safety and better DX
- **Linear Gradients**: Visual depth and modern aesthetics

### Performance Considerations
- **Optimized Images**: Proper sizing and compression
- **Efficient Animations**: Use native driver when possible
- **Lazy Loading**: Load components as needed
- **Memory Management**: Proper cleanup and optimization

### Future Enhancements
- **Custom Animations**: Advanced micro-interactions
- **Haptic Feedback**: Tactile response for interactions
- **Voice Commands**: Hands-free operation
- **AR Integration**: Overlay analysis on live video

## 📚 Resources

### Design Tools
- **Figma**: Design and prototyping
- **Adobe Creative Suite**: Asset creation
- **Lottie**: Advanced animations
- **Icon Libraries**: Ionicons, Material Icons

### Development Tools
- **React Native Debugger**: Debugging and inspection
- **Flipper**: Performance monitoring
- **Storybook**: Component documentation
- **Jest**: Testing framework

---

This design system provides a solid foundation for creating a professional, user-friendly cricket analysis application that delivers value through excellent user experience and modern design principles.
