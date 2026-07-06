import type { Client, Sale } from './types';
import { deriveEmail } from './derive';
import type { EmailContext, EmailRecipient } from './modals/ModalProvider';

export function saleEmailContext(sale: Sale): EmailContext {
  const em = sale.email || deriveEmail(sale.principal, '') || '—';
  const recipients: EmailRecipient[] = [
    { name: sale.principal && sale.principal !== '—' ? sale.principal : sale.name, email: sale.email || '—' },
  ];
  return {
    kind: 'sale',
    refId: sale.id,
    toLine: sale.principal && sale.principal !== '—' ? sale.principal : sale.name,
    recipients,
    merge: {
      school_name: sale.name || '',
      principal: sale.principal || '',
      principal_first_name: (sale.principal || '').split(' ')[0] || '',
      city: sale.town || '',
      region: sale.region || '',
      category: sale.category || '',
      roll: String(sale.roll || ''),
    },
  };
}

export function clientEmailContext(c: Client): EmailContext {
  const recipients: EmailRecipient[] = [];
  const primaryEmail = deriveEmail(c.contact, c.website);
  if (c.contact && c.contact !== '—') recipients.push({ name: c.contact, email: primaryEmail || '—' });
  (c.contacts || []).forEach((ct) => {
    if (ct.email && ct.email !== '—') recipients.push({ name: ct.name, email: ct.email });
  });
  if (recipients.length === 0) recipients.push({ name: c.name, email: '—' });
  return {
    kind: 'client',
    refId: c.id,
    toLine: c.name,
    recipients,
    merge: {
      school_name: c.name || '',
      principal: c.contact || '',
      principal_first_name: (c.contact || '').split(' ')[0] || '',
      city: '',
      region: c.region || '',
      category: c.type || '',
      roll: c.roll || '',
    },
  };
}

// Render {{token}} placeholders against a merge map, tidying stray artifacts.
export function renderMerge(str: string, merge: EmailContext['merge']): string {
  const map: Record<string, string> = {
    '{{school_name}}': merge.school_name,
    '{{principal}}': merge.principal,
    '{{principal_first_name}}': merge.principal_first_name,
    '{{city}}': merge.city,
    '{{region}}': merge.region,
    '{{category}}': merge.category,
    '{{roll}}': merge.roll,
  };
  let o = str || '';
  Object.keys(map).forEach((k) => (o = o.split(k).join(map[k])));
  o = o.replace(/\{\{[^}]*\}\}/g, '');
  o = o.replace(/[ \t]+([,.;])/g, '$1');
  o = o.replace(/[ \t]{2,}/g, ' ');
  o = o.replace(/\(\s*\)/g, '').replace(/\bin \./g, '.');
  return o;
}
