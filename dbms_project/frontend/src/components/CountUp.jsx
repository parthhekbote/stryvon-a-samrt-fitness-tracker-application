import React, { useState, useEffect } from 'react';

/**
 * Animated CountUp Component
 * Animates numbers from 0 (or previous value) to target value smoothly.
 */
export default function CountUp({ value = 0, duration = 0.5, suffix = '', decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const target = Number(value) || 0;
    const startValue = displayValue;

    if (startValue === target) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);

      // Ease-out cubic formula
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (target - startValue) * easeProgress;

      setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const animFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animFrame);
  }, [value, duration, decimals]);

  return (
    <span>
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}
