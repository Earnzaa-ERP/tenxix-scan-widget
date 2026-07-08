// One deployment, two backends chosen at RUNTIME (anon keys are public):
//  - default  → ERP project (merchant embeds, scan.tenxix.com/?ref=...)
//  - ?scan=kira → Tenxix Mirror project (Kira's own catalogue, kirascan.app)
// A build-time env (VITE_SUPABASE_URL/KEY) can still override the default.
const _scanParams = new URLSearchParams(window.location.search);
const _useKira = _scanParams.get('scan') === 'kira';

const KIRA_BACKEND = {
  url: 'https://ctvahsuhyuwgmjjnrhbt.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dmFoc3VoeXV3Z21qam5yaGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzU3MDUsImV4cCI6MjA5MTY1MTcwNX0.FSywkUZUS4oRxePdnYgEVxuOayv6_l9MdwAvuWDZ9BI',
};
const ERP_BACKEND = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://neqtdckyrowyechbeppr.supabase.co',
  key:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lcXRkY2t5cm93eWVjaGJlcHByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzM0MTQsImV4cCI6MjA4ODMwOTQxNH0.-z96VqVNgpJd_KAT5iizTVbM_boAVbt-2xbB6P3qddE',
};

const _backend = _useKira ? KIRA_BACKEND : ERP_BACKEND;
export const SUPABASE_URL = _backend.url;
export const SUPABASE_ANON_KEY = _backend.key;
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
  eyebrow: 'Skin intelligence for melanin-rich skin',
  tagline: 'Stop guessing.',
  subtitle: 'Scan your skin. Know your concerns. Get a routine built just for you.',
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

export const APP_DOWNLOAD_URL =
  import.meta.env.VITE_APP_DOWNLOAD_URL ||
  'https://play.google.com/store/apps/details?id=com.tenxix.mirror';
