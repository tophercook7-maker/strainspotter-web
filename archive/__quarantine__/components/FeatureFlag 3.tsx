'use client';

import { useEffect, useState } from 'react';
import { isFeatureEnabled, FeatureFlagKey } from '@/lib/featureFlags';

interface FeatureFlagProps {
  flag: FeatureFlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  defaultValue?: boolean;
}

/**
 * FeatureFlag Component
 * Conditionally renders children based on feature flag
 * Fails safely - hides content if flag is disabled
 */
export default function FeatureFlag({
  flag,
  children,
  fallback = null,
  defaultValue = false,
}: FeatureFlagProps) {
  const [enabled, setEnabled] = useState<boolean>(defaultValue);

  useEffect(() => {
    isFeatureEnabled(flag, defaultValue).then(setEnabled);
  }, [flag, defaultValue]);

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
