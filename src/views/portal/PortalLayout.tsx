"use client";

import type { ReactNode } from "react";
import styled from "styled-components";
import { theme } from "@/components/theme";
import { RefreshButton } from "./RefreshButton";

const Main = styled.main`
  max-width: 1040px;
  margin: 0 auto;
  padding: ${theme.space.xl} ${theme.space.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.space.lg};
`;

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.space.md};
`;

const Heading = styled.h1`
  margin: 0;
  font-size: clamp(28px, 5vw, 36px);
  line-height: 1.15;
  letter-spacing: -0.01em;
`;

/** The part of the portal page that never changes: heading and actions around the results. */
export function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <Main>
      <Header>
        <Heading>Developer Portal</Heading>
        <RefreshButton />
      </Header>
      {children}
    </Main>
  );
}
