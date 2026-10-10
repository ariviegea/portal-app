"use client";

import styled from "styled-components";
import { theme } from "../theme";

export type CardTone = "default" | "error";

export type CardProps = {
  label: string;
  title: string;
  detail: string;
  href?: string;
  tone?: CardTone;
  "data-testid"?: string;
};

const Wrapper = styled.article<{ $tone: CardTone }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.space.sm};
  min-width: 0;
  padding: ${theme.space.lg};
  background: ${theme.color.surface};
  border: 1px solid ${({ $tone }) => ($tone === "error" ? theme.color.danger : theme.color.border)};
  border-radius: ${theme.radius};
`;

const Label = styled.p`
  margin: 0;
  color: ${theme.color.muted};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
  overflow-wrap: anywhere;

  a {
    color: ${theme.color.accent};
  }

  a:focus-visible {
    outline: 2px solid ${theme.color.accent};
    outline-offset: 2px;
  }
`;

const Detail = styled.p<{ $tone: CardTone }>`
  margin: 0;
  color: ${({ $tone }) => ($tone === "error" ? theme.color.danger : theme.color.muted)};
  overflow-wrap: anywhere;
`;


export function Card({ label, title, detail, href, tone = "default", "data-testid": testId }: CardProps) {
  return (
    <Wrapper $tone={tone} data-testid={testId}>
      <Label>{label}</Label>
      <Title>{href ? <a href={href}>{title}</a> : title}</Title>
      <Detail $tone={tone}>{detail}</Detail>
    </Wrapper>
  );
}
