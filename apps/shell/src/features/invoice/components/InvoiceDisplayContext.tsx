import { createContext, useContext } from "react";
import type React from "react";

type InvoiceDisplayContextValue = {
  isCashPaymentSelected: boolean;
};

const InvoiceDisplayContext = createContext<InvoiceDisplayContextValue>({
  isCashPaymentSelected: false,
});

export function InvoiceDisplayProvider({
  isCashPaymentSelected,
  children,
}: InvoiceDisplayContextValue & { children: React.ReactNode }) {
  return (
    <InvoiceDisplayContext.Provider value={{ isCashPaymentSelected }}>
      {children}
    </InvoiceDisplayContext.Provider>
  );
}

export function useInvoiceDisplay() {
  return useContext(InvoiceDisplayContext);
}
