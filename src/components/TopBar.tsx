import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from './ThemeProvider';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const themeOptions: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: <Sun className="w-4 h-4" />,
    description: 'Bright & clean',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <Moon className="w-4 h-4" />,
    description: 'Easy on the eyes',
  },
  {
    value: 'system',
    label: 'System',
    icon: <Monitor className="w-4 h-4" />,
    description: 'Match your OS',
  },
];

export function TopBar() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = themeOptions.find(o => o.value === theme)!;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-inner">
        {/* Left Section - App Info / Breadcrumb */}
        <div className="topbar-section">
          <div className="topbar-badge">
            <span className="topbar-badge-dot" />
            <span className="topbar-badge-text">v1.0</span>
          </div>
        </div>

        {/* Right Section - Theme Switcher */}
        <div className="topbar-section" ref={dropdownRef}>
          {/* Quick Toggle Buttons */}
          <div className="theme-quick-toggle">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'theme-toggle-btn',
                  theme === option.value && 'theme-toggle-btn-active'
                )}
                title={option.label}
                aria-label={`Switch to ${option.label} theme`}
              >
                <span className="theme-toggle-icon">{option.icon}</span>
              </button>
            ))}
          </div>

          {/* Dropdown with more info */}
          <div className="theme-dropdown-wrapper">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="theme-dropdown-trigger"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
            >
              <span className="theme-dropdown-trigger-icon">{currentOption.icon}</span>
              <span className="theme-dropdown-trigger-label">{currentOption.label}</span>
              <ChevronDown className={cn('theme-dropdown-chevron', isOpen && 'theme-dropdown-chevron-open')} />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="theme-dropdown-menu"
                  role="listbox"
                >
                  <div className="theme-dropdown-header">
                    <span>Appearance</span>
                  </div>
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTheme(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'theme-dropdown-option',
                        theme === option.value && 'theme-dropdown-option-active'
                      )}
                      role="option"
                      aria-selected={theme === option.value}
                    >
                      <div className="theme-dropdown-option-icon">
                        {option.icon}
                      </div>
                      <div className="theme-dropdown-option-text">
                        <span className="theme-dropdown-option-label">{option.label}</span>
                        <span className="theme-dropdown-option-desc">{option.description}</span>
                      </div>
                      {theme === option.value && (
                        <motion.div
                          layoutId="theme-check"
                          className="theme-dropdown-check"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.div>
                      )}
                    </button>
                  ))}
                  <div className="theme-dropdown-footer">
                    Currently: <strong>{resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode</strong>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
