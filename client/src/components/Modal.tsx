import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 600,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,30,44,.42)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '52px 20px',
        overflowY: 'auto', animation: 'ovShow .18s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth, background: '#fff', borderRadius: 20,
          boxShadow: '0 30px 70px -20px rgba(15,30,44,.5)', animation: 'mdPop .22s cubic-bezier(.4,0,.2,1)', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px', borderBottom: '1px solid #EEF2F5' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#12222F', letterSpacing: '-.02em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: '#6B7C8C', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#7A8894', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
        {footer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 11, padding: '14px 22px', borderTop: '1px solid #EEF2F5', background: '#FAFCFD' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1px solid #DDE4EA', borderRadius: 8,
  fontSize: 14, outline: 'none',
} as const;

export const labelStyle = {
  display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33475A', marginBottom: 7,
} as const;
