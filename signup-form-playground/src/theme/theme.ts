import { createTheme } from "@mui/material/styles";
import type { ThemeOptions } from "@mui/material/styles";

export type ColorMode = "light" | "dark";

export function buildTheme(mode: ColorMode) {
  const options: ThemeOptions = {
    palette: { mode },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: [
        "Inter",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "Arial",
        "sans-serif",
      ].join(","),
    },
  };

  return createTheme(options);
}
