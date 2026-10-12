"use client";

import { useState } from "react";
import styled from "styled-components";
import { Card, UnavailableCard } from "@/components/card";
import { theme } from "@/components/theme";
import { Toggle } from "@/components/toggle";
import type { AppMetrics, EnvironmentId, EnvironmentResult } from "@/models/azureResources/types";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.space.md};
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.space.md};
`;

const Heading = styled.h2`
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
`;

const Caption = styled.p`
  margin: 0;
  color: ${theme.color.muted};
  overflow-wrap: anywhere;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
  gap: ${theme.space.md};
`;

/** The three numbers for one environment, one card each. */
function TrafficTiles({ metrics }: { metrics: AppMetrics }) {
  const hasTraffic = metrics.averageResponseMs !== null;

  return (
    <Grid>
      <Card data-testid="azure-requests" label="Requests" title={String(metrics.requests)} detail="in the last hour" />
      <Card
        data-testid="azure-server-errors"
        label="Server errors"
        title={String(metrics.serverErrors)}
        detail="responses with a 5xx status"
      />
      <Card
        data-testid="azure-average-response"
        label="Average response"
        title={hasTraffic ? `${metrics.averageResponseMs} ms` : "–"}
        detail={hasTraffic ? "per request" : "no requests to measure"}
      />
    </Grid>
  );
}

/**
 * Last hour's traffic for one Azure environment at a time, with a toggle to
 * switch between them. All environments arrive together, so switching needs
 * no new request.
 */
export function EnvironmentPanel({ environments }: { environments: EnvironmentResult[] }) {
  const [selectedId, setSelectedId] = useState<EnvironmentId | undefined>(environments[0]?.id);
  const selected = environments.find((environment) => environment.id === selectedId) ?? environments[0];
  if (!selected) return null;

  return (
    <Section data-testid="azure-traffic" aria-labelledby="azure-traffic-heading">
      <Header>
        <Heading id="azure-traffic-heading">Azure traffic</Heading>
        {environments.length > 1 && (
          <Toggle<EnvironmentId>
            label="Environment"
            options={environments.map(({ id, label }) => ({ value: id, label }))}
            value={selected.id}
            onChange={setSelectedId}
          />
        )}
      </Header>
      {selected.status === "ok" ? (
        <>
          <Caption>
            {selected.label} · {selected.metrics.appName} · last hour
          </Caption>
          <TrafficTiles metrics={selected.metrics} />
        </>
      ) : (
        <UnavailableCard data-testid="azure-unavailable" label={selected.label} message={selected.message} />
      )}
    </Section>
  );
}
