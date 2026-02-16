/** @type {const} */
const themeColors = {
  // Primary brand colors - vibrant teal and gold
  primary: { light: '#0891B2', dark: '#06B6D4' }, // Cyan 600/500
  accent: { light: '#F59E0B', dark: '#FBBF24' }, // Amber 500/400 (gold)
  
  // Background colors
  background: { light: '#F7F7F7', dark: '#0F1419' }, // Light gray / Dark
  surface: { light: '#FFFFFF', dark: '#1A1F26' }, // White / Dark surface
  
  // Text colors
  foreground: { light: '#1F1F1F', dark: '#ECEDEE' }, // Dark gray / Light
  muted: { light: '#6B6B6B', dark: '#9BA1A6' }, // Medium gray
  
  // UI colors
  border: { light: '#E5E7EB', dark: '#334155' }, // Gray 200 / Slate 700
  
  // Status colors
  success: { light: '#10B981', dark: '#34D399' }, // Emerald 500/400
  warning: { light: '#F59E0B', dark: '#FBBF24' }, // Amber 500/400
  error: { light: '#EF4444', dark: '#F87171' }, // Red 500/400
  info: { light: '#3B82F6', dark: '#60A5FA' }, // Blue 500/400
  
  // Progress colors
  progress: { light: '#10B981', dark: '#34D399' }, // Green for progress
  progressBg: { light: '#E5E7EB', dark: '#374151' }, // Gray for progress background
};

module.exports = { themeColors };
