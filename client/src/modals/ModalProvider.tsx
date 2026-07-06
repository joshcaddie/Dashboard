import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { AddClientModal } from './AddClientModal';
import { AddJobModal } from './AddJobModal';
import { AddLeadModal } from './AddLeadModal';
import { AddContactModal } from './AddContactModal';
import { ConvertModal } from './ConvertModal';
import { SalePanel } from './SalePanel';
import { EmailModal } from './EmailModal';

export interface EmailRecipient {
  name: string;
  email: string;
}
export interface EmailContext {
  kind: 'client' | 'sale';
  refId: number;
  // merge-field source
  merge: {
    school_name: string;
    principal: string;
    principal_first_name: string;
    city: string;
    region: string;
    category: string;
    roll: string;
  };
  toLine: string; // header display name
  recipients: EmailRecipient[];
}

interface Modals {
  openAddClient: () => void;
  openAddJob: () => void;
  openAddLead: () => void;
  openConvert: (saleId: number) => void;
  openSalePanel: (saleId: number) => void;
  openAddContact: (clientId: number) => void;
  openEmail: (ctx: EmailContext) => void;
}

const Ctx = createContext<Modals | null>(null);
export const useModals = () => {
  const m = useContext(Ctx);
  if (!m) throw new Error('useModals outside provider');
  return m;
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [addClient, setAddClient] = useState(false);
  const [addJob, setAddJob] = useState(false);
  const [addLead, setAddLead] = useState(false);
  const [convertSaleId, setConvertSaleId] = useState<number | null>(null);
  const [salePanelId, setSalePanelId] = useState<number | null>(null);
  const [contactClientId, setContactClientId] = useState<number | null>(null);
  const [email, setEmail] = useState<EmailContext | null>(null);

  const api = useMemo<Modals>(
    () => ({
      openAddClient: () => setAddClient(true),
      openAddJob: () => setAddJob(true),
      openAddLead: () => setAddLead(true),
      openConvert: (id) => setConvertSaleId(id),
      openSalePanel: (id) => setSalePanelId(id),
      openAddContact: (id) => setContactClientId(id),
      openEmail: (ctx) => setEmail(ctx),
    }),
    []
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {addClient && <AddClientModal onClose={() => setAddClient(false)} />}
      {addJob && <AddJobModal onClose={() => setAddJob(false)} />}
      {addLead && <AddLeadModal onClose={() => setAddLead(false)} />}
      {convertSaleId != null && <ConvertModal saleId={convertSaleId} onClose={() => setConvertSaleId(null)} />}
      {salePanelId != null && <SalePanel saleId={salePanelId} onClose={() => setSalePanelId(null)} />}
      {contactClientId != null && <AddContactModal clientId={contactClientId} onClose={() => setContactClientId(null)} />}
      {email && <EmailModal ctx={email} onClose={() => setEmail(null)} />}
    </Ctx.Provider>
  );
}
