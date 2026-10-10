"use client";

import { createGlobalStyle } from "styled-components";
import { theme } from "./theme";

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light dark;
    --color-background: #f4f6fb;
    --color-surface: #ffffff;
    --color-text: #161b2e;
    --color-muted: #535b78;
    --color-border: #d5dbea;
    --color-accent: #2743c9;
    --color-on-accent: #ffffff;
    --color-danger: #b3263f;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-background: #0f121c;
      --color-surface: #181c2b;
      --color-text: #e8ebf6;
      --color-muted: #a0a8c5;
      --color-border: #2c324b;
      --color-accent: #9aa9ff;
      --color-on-accent: #0f121c;
      --color-danger: #ff8a9c;
    }
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: ${theme.color.background};
    color: ${theme.color.text};
    font-family: ${theme.font.body};
    font-size: 16px;
    line-height: 1.5;
  }
`;
