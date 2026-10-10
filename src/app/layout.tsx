import type { Metadata } from "next";
import { GlobalStyle } from "@/components/GlobalStyle";
import StyledComponentsRegistry from "@/lib/StyledComponentsRegistry";

export const metadata: Metadata = {
  title: "Developer Portal",
  description: "A small portal that brings together data from several APIs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <GlobalStyle />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
