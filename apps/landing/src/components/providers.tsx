'use client';

import React from 'react';
import { MotionConfig } from 'motion/react';

/** Every motion animation honours the visitor's reduced-motion preference. */
export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
