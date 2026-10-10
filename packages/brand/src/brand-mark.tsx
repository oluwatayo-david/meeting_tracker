import React from 'react';

/**
 * Product logo: a conversation bubble (the meeting) carrying a checkmark (the
 * action followed through). Inherits colour from `currentColor`; size via className.
 * Keep in sync with each app's src/app/icon.svg (the favicon).
 */
export const BrandMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-8A2.5 2.5 0 0 1 6.5 3z" />
    <path d="m8.5 9.5 2.5 2.5 4.5-4.5" />
  </svg>
);
