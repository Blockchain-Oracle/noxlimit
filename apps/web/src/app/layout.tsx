import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { AppHeader } from "@/components/shell/app-header";
import { Providers } from "@/components/providers/providers";
import { getConfig } from "@/lib/wallet/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NoxLimit", template: "%s · NoxLimit" },
  description: "Private maximum-price orders for real Ethereum Sepolia outcome markets.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const initialState = cookieToInitialState(getConfig(), (await headers()).get("cookie"));
  return <html lang="en" data-scroll-behavior="smooth"><body><Providers initialState={initialState}><a className="skip-link" href="#main-content">Skip to content</a><AppHeader /><div id="main-content">{children}</div></Providers></body></html>;
}
