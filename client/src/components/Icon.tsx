import { icons } from 'lucide-react';
import type { CSSProperties } from 'react';

function toPascal(name: string): string {
  return name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

export function Icon({ name, size = 16, style, color }: { name: string; size?: number; style?: CSSProperties; color?: string }) {
  const Cmp = (icons as any)[toPascal(name)];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} style={style} strokeWidth={2} />;
}
