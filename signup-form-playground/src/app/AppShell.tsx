import AppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import SignupForm from "../components/SignupForm";
import ThemeToggleButton from "../components/ThemeToggleButton";

export default function AppShell() {
  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography sx={{ flexGrow: 1 }} variant="h6">
            Signup Form
          </Typography>
          <ThemeToggleButton />
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <SignupForm />
        </Paper>
      </Container>
    </>
  );
}
