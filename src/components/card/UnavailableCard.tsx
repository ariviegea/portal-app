"use client";

import { Card } from "./Card";

export type UnavailableCardProps = {
  label: string;
  /** Tells the visitor what could not be loaded. */
  message: string;
  "data-testid"?: string;
};

/** Stands in for a card whose data could not be loaded. */
export function UnavailableCard({ label, message, "data-testid": testId }: UnavailableCardProps) {
  return <Card data-testid={testId} label={label} title="Unavailable" detail={message} tone="error" />;
}
