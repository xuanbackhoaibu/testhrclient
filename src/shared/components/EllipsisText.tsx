import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Text } from '@mantine/core';

import { SafeTooltip } from './SafeTooltip';

interface EllipsisTextProps {
  children: ReactNode;
  tooltip?: ReactNode;
  maxWidth?: number | string;
  className?: string;
}

/** Shows a tooltip only when the rendered single-line value is actually clipped. */
export function EllipsisText({
  children,
  tooltip,
  maxWidth,
  className,
}: EllipsisTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isClipped, setIsClipped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const update = () => {
      setIsClipped(element.scrollWidth > element.clientWidth + 1);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  const text = (
    <Text
      ref={ref}
      span
      className={className}
      style={{
        display: 'block',
        maxWidth,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Text>
  );

  return <SafeTooltip label={tooltip ?? children} disabled={!isClipped}>{text}</SafeTooltip>;
}
