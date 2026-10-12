"use client";

import styled from "styled-components";
import { theme } from "../theme";

export type ToggleOption<Value extends string> = {
  value: Value;
  label: string;
};

export type ToggleProps<Value extends string> = {
  /** Says what is being chosen, for screen readers. */
  label: string;
  options: ToggleOption<Value>[];
  value: Value;
  onChange(value: Value): void;
};

const Group = styled.div`
  display: inline-flex;
  padding: 2px;
  background: ${theme.color.surface};
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius};
`;

const Option = styled.button`
  min-height: 36px;
  padding: ${theme.space.xs} ${theme.space.md};
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: ${theme.color.text};
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &[aria-pressed="true"] {
    background: ${theme.color.accent};
    color: ${theme.color.onAccent};
  }

  &:hover:not([aria-pressed="true"]) {
    color: ${theme.color.accent};
  }

  &:focus-visible {
    outline: 2px solid ${theme.color.accent};
    outline-offset: 2px;
  }
`;

/** A row of options where exactly one is selected, such as Production / Staging. */
export function Toggle<Value extends string>({ label, options, value, onChange }: ToggleProps<Value>) {
  return (
    <Group role="group" aria-label={label}>
      {options.map((option) => (
        <Option
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Option>
      ))}
    </Group>
  );
}
