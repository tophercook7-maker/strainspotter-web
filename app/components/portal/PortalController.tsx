"use client";

import { createContext, useContext, useState } from "react";
import PortalWarp from "./PortalWarp";

interface PortalContextType {
  openPortal: (slug: string) => void;
  closePortal: () => void;
  activeSlug: string | null;
  isActive: boolean;
  exiting: boolean;
}

const PortalContext = createContext<PortalContextType | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [exiting, setExiting] = useState(false);

  const openPortal = (slug: string) => {
    setActiveSlug(slug);
    setExiting(false);
    setIsActive(true);
  };

  const closePortal = () => {
    setExiting(true);
    setIsActive(false);
    setTimeout(() => {
      setActiveSlug(null);
      setExiting(false);
    }, 600);
  };

  return (
    <PortalContext.Provider value={{ activeSlug, isActive, exiting, openPortal, closePortal }}>
      {children}
      <PortalWarp />
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used in PortalProvider");
  return ctx;
}
