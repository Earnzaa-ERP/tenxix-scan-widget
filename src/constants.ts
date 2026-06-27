export const SUPABASE_URL = 'https://neqtdckyrowyechbeppr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lcXRkY2t5cm93eWVjaGJlcHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzM0MTQsImV4cCI6MjA4ODMwOTQxNH0.-z96VqVNgpJd_KAT5iizTVbM_boAVbt-2xbB6P3qddE';
export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

// The analysis now returns a verdict + full AM/PM routine (+ optional side
// images), so the AI response is larger and takes longer to generate than the
// original flat result. Give it room before the client aborts.
export const ANALYZE_TIMEOUT_MS = 45_000;
export const MAX_PHOTO_BYTES = 500 * 1024;
export const MAX_PHOTO_WIDTH = 800;
export const MAX_PHOTO_HEIGHT = 1000;
export const JPEG_QUALITY_START = 0.80;
export const JPEG_QUALITY_STEP = 0.10;
export const JPEG_QUALITY_MIN = 0.50;

export const BRAND = {
  name: 'Kira',
  tagline: 'Discover Your Perfect Skincare Routine',
  subtitle: 'Our AI analyzes your skin in seconds and recommends the ideal products for your unique skin needs.',
  colors: {
    primary: '#560A88',
    primaryDark: '#3A0660',
    primaryForeground: '#ffffff',
    accent: '#8DFD00',
    accentForeground: '#1a1a1a', // lime is bright — pair with dark text
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#1a1a1a',
    textMuted: '#6c757d',
    border: '#e9ecef',
    success: '#34C759',
    warning: '#ffc107',
    error: '#FF3B30',
  },
} as const;

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const;

export const APP_DOWNLOAD_URL = '#'; // Placeholder — swap with real store link when available
