"use client";

import type { ButtonHTMLAttributes } from "react";
import styled, { css } from "styled-components";
import { theme } from "../theme";

export type ButtonVariant = "primary" | "secondary";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants = {
  primary: css`
    background: ${theme.color.accent};
    border-color: ${theme.color.accent};
    color: ${theme.color.onAccent};
  `,
  secondary: css`
    background: ${theme.color.surface};
    border-color: ${theme.color.border};
    color: ${theme.color.text};
  `,
};

const StyledButton = styled.button<{ $variant: ButtonVariant }>`
  min-height: 40px;
  padding: ${theme.space.sm} ${theme.space.md};
  border: 1px solid;
  border-radius: ${theme.radius};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  ${({ $variant }) => variants[$variant]}

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:focus-visible {
    outline: 2px solid ${theme.color.accent};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

export function Button({ variant = "primary", type = "button", ...props }: ButtonProps) {
  return <StyledButton $variant={variant} type={type} {...props} />;
}
