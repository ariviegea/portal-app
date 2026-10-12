"use client";

import styled from "styled-components";
import { Card } from "@/components/card";
import { theme } from "@/components/theme";
import type { EnvironmentResult, SourceResult } from "@/models/types";
import { EnvironmentPanel } from "./EnvironmentPanel";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.space.xl};
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: ${theme.space.md};
`;

const Status = styled.p`
  margin: 0;
  color: ${theme.color.muted};
`;

/**
 * One card per API source: its data, or a message when the source failed.
 * Below them, Azure traffic for the environments that are set up.
 */
export function PortalView({ sources, environments }: { sources: SourceResult[]; environments: EnvironmentResult[] }) {
  return (
    <Stack>
      <Grid aria-label="API sources">
        {sources.map((result) =>
          result.status === "ok" ? (
            <Card
              key={result.id}
              data-testid={`source-${result.id}`}
              label={result.label}
              title={result.item.title}
              detail={result.item.detail}
              href={result.item.href}
            />
          ) : (
            <Card
              key={result.id}
              data-testid={`source-${result.id}`}
              label={result.label}
              title="Unavailable"
              detail={result.message}
              tone="error"
            />
          ),
        )}
      </Grid>
      {environments.length > 0 && <EnvironmentPanel environments={environments} />}
    </Stack>
  );
}

/** Shown in place of the cards while the APIs are being called. */
export function PortalLoading() {
  return <Status role="status">Loading the latest data…</Status>;
}
