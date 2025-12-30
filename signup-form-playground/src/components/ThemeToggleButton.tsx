import React from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { ColorModeContext } from "../theme/ColorModeProvider";

export default function ThemeToggleButton() {
  const { mode, toggleMode } = React.useContext(ColorModeContext);

  return (
    <Tooltip
      title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      <IconButton
        color="inherit"
        onClick={toggleMode}
        aria-label="toggle theme"
      >
        {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
