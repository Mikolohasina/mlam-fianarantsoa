import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_SIZE = 16; // px — compact for a dashboard toolbar

const LABELS = {
  light: 'Switch to dark mode',
  dark:  'Switch to light mode',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ThemeToggle
 *
 * A minimal icon button that toggles the global M'LAM theme.
 * Designed to live in a top navigation bar or toolbar.
 *
 * Features:
 *   - No text label (icon communicates intent; aria-label handles accessibility)
 *   - Smooth icon cross-fade via CSS opacity + scale transitions
 *   - Professional hover and focus-visible ring adapted to both light and dark
 *   - Zero dependencies beyond lucide-react and the ThemeContext
 *
 * @param {Object}  props
 * @param {string}  [props.className]  - Additional Tailwind classes injected by the parent.
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={LABELS[theme]}
      aria-pressed={isDark}
      className={[
        // Layout
        'relative inline-flex items-center justify-center',
        'h-8 w-8 rounded-md',

        // Colour — light mode
        'text-[#57606A]',
        'bg-transparent',
        'border border-[#DDE1E7]',

        // Colour — dark mode
        'dark:text-[#8B949E]',
        'dark:border-[#21262D]',

        // Hover — light mode
        'hover:text-[#0D1117]',
        'hover:bg-[#F4F5F7]',
        'hover:border-[#8C959F]',

        // Hover — dark mode
        'dark:hover:text-[#E6EDF3]',
        'dark:hover:bg-[#21262D]',
        'dark:hover:border-[#484F58]',

        // Focus ring (keyboard navigation)
        'focus:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-[#0969DA]',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[#F4F5F7]',
        'dark:focus-visible:ring-[#388BFD]',
        'dark:focus-visible:ring-offset-[#0D1117]',

        // Transitions
        'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',

        // Caller overrides
        className,
      ].join(' ')}
    >
      {/*
        Both icons are always in the DOM.
        The visible one is fully opaque and at scale 1;
        the hidden one is invisible and slightly scaled down.
        A CSS transition animates between the two states without layout shift.
      */}

      {/* Sun — visible in dark mode (offers switch to light) */}
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 flex items-center justify-center',
          'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isDark
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-75 pointer-events-none',
        ].join(' ')}
      >
        <Sun size={ICON_SIZE} strokeWidth={1.75} />
      </span>

      {/* Moon — visible in light mode (offers switch to dark) */}
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 flex items-center justify-center',
          'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isDark
            ? 'opacity-0 scale-75 pointer-events-none'
            : 'opacity-100 scale-100',
        ].join(' ')}
      >
        <Moon size={ICON_SIZE} strokeWidth={1.75} />
      </span>

      {/* Invisible spacer that keeps the button at a fixed size */}
      <span aria-hidden="true" className="invisible">
        <Moon size={ICON_SIZE} />
      </span>
    </button>
  );
}
