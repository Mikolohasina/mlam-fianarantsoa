import { createContext, useContext, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY   = 'mlam_theme';
const DARK_CLASS    = 'dark';
const THEME_DARK    = 'dark';
const THEME_LIGHT   = 'light';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read the persisted theme from localStorage.
 * Falls back to the OS-level colour-scheme preference when no value is stored.
 *
 * @returns {'dark' | 'light'}
 */
function resolveInitialTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === THEME_DARK || stored === THEME_LIGHT) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable in certain environments.
  }

  const prefersDark =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return prefersDark ? THEME_DARK : THEME_LIGHT;
}

/**
 * Apply or remove the Tailwind dark-mode class on the <html> element and
 * persist the selection to localStorage.
 *
 * @param {'dark' | 'light'} theme
 */
function applyThemeToDocument(theme) {
  const root = document.documentElement;

  if (theme === THEME_DARK) {
    root.classList.add(DARK_CLASS);
  } else {
    root.classList.remove(DARK_CLASS);
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Silently ignore write failures.
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ThemeContextValue
 * @property {'dark' | 'light'} theme       - Current active theme.
 * @property {boolean}          isDark       - Convenience boolean.
 * @property {() => void}       toggleTheme  - Switches between dark and light.
 * @property {(t: 'dark' | 'light') => void} setTheme - Sets a specific theme.
 */

/** @type {React.Context<ThemeContextValue>} */
const ThemeContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * ThemeProvider
 *
 * Wrap your application root with this component to give every descendant
 * access to the M'LAM theme system via `useTheme()`.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  // Synchronise the DOM and localStorage whenever the theme state changes.
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Keep the component in sync if another tab changes the preference.
  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === STORAGE_KEY) {
        const incoming = event.newValue;
        if (incoming === THEME_DARK || incoming === THEME_LIGHT) {
          setThemeState(incoming);
        }
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Replace the current theme with an explicit value.
   *
   * @param {'dark' | 'light'} nextTheme
   */
  function setTheme(nextTheme) {
    if (nextTheme !== THEME_DARK && nextTheme !== THEME_LIGHT) {
      console.warn(`[ThemeContext] Invalid theme value: "${nextTheme}". Expected "dark" or "light".`);
      return;
    }
    setThemeState(nextTheme);
  }

  /** Toggle between dark and light. */
  function toggleTheme() {
    setThemeState((current) =>
      current === THEME_DARK ? THEME_LIGHT : THEME_DARK
    );
  }

  /** @type {ThemeContextValue} */
  const contextValue = {
    theme,
    isDark: theme === THEME_DARK,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTheme
 *
 * Returns the current theme context.
 * Must be used inside a `<ThemeProvider>` tree.
 *
 * @returns {ThemeContextValue}
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error(
      '[useTheme] Must be used inside a <ThemeProvider>. ' +
      'Wrap your application root with <ThemeProvider>.'
    );
  }

  return context;
}

export default ThemeContext;
