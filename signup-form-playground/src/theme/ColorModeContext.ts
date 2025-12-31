import React from "react";
import type { ColorMode } from "./theme";

type ColorModeContextValue = {
  mode: ColorMode;
  toggleMode: () => void;
};

export const ColorModeContext = React.createContext<ColorModeContextValue>({
  mode: "light",
  toggleMode: () => {},
});
