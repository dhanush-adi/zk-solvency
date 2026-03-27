'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountUpNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function CountUpNumber({
  value,
  duration = 1000,
  decimals = 2,
  className,
  prefix = '',
  suffix = '',
}: CountUpNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      setDisplayValue(value * progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = displayValue.toFixed(decimals);

  return (
    <span className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}
