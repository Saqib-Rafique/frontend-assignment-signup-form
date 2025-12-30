import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { debounce } from "../utils/debounce";
import { createThrottle } from "../utils/throttle";

export type SignupFormValues = {
  fullName: string;
  username: string;
  email: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
  profileImage: File | null;
};

type FieldErrors = Partial<Record<keyof SignupFormValues, string>>;

type UsernameStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; message: string }
  | { state: "taken"; message: string };

const initialValues: SignupFormValues = {
  fullName: "",
  username: "",
  email: "",
  contactNumber: "",
  password: "",
  confirmPassword: "",
  profileImage: null,
};

const USERNAME_DEBOUNCE_MS = 600;
const USERNAME_FAKE_API_MIN_MS = 700;
const USERNAME_FAKE_API_MAX_MS = 1200;

const SUBMIT_THROTTLE_MS = 5000;
const SUBMIT_FAKE_API_MS = 1500;

const RESERVED_USERNAMES = new Set([
  "abdullah",
  "mehmood",
  "tariq",
  "ali",
  "saqib",
  "hassan",
]);

const EMPTY_HELPER = "\u00A0";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPkPhone(input: string) {
  const raw = input.replace(/[\s-]/g, "").trim();
  return /^(\+?92|0)?3\d{9}$/.test(raw);
}

function validateSync(values: SignupFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) errors.fullName = "Full name is required.";

  const username = values.username.trim();
  if (!username) {
    errors.username = "Username is required.";
  } else if (username.length < 3) {
    errors.username = "Username must be at least 3 characters.";
  } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    errors.username = "Use letters, numbers, dot, underscore, or hyphen only.";
  }

  const email = values.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";

  const phone = values.contactNumber.trim();
  if (!phone) errors.contactNumber = "Contact number is required.";
  else if (!isValidPkPhone(phone)) {
    errors.contactNumber = "Enter a valid PK number (e.g., +92 300 1234567).";
  }

  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < 8)
    errors.password = "Password must be at least 8 characters.";

  const confirm = values.confirmPassword;
  if (!confirm) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (confirm !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (values.profileImage) {
    const { type, size } = values.profileImage;
    const isImage = type.startsWith("image/");
    const maxBytes = 2 * 1024 * 1024;
    if (!isImage) errors.profileImage = "Please upload a valid image file.";
    else if (size > maxBytes)
      errors.profileImage = "Image must be 2MB or smaller.";
  }

  return errors;
}

async function fakeCheckUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
  const delay = randomInt(USERNAME_FAKE_API_MIN_MS, USERNAME_FAKE_API_MAX_MS);
  await sleep(delay);
  const normalized = normalizeUsername(username);

  if (RESERVED_USERNAMES.has(normalized)) return { available: false };
  if (normalized.endsWith(".")) return { available: false };
  if (normalized.includes("..")) return { available: false };

  return { available: true };
}

async function fakeSignupRequest(
  payload: SignupFormValues
): Promise<{ ok: true }> {
  void payload;
  await sleep(SUBMIT_FAKE_API_MS);
  return { ok: true };
}

export default function SignupForm() {
  const [values, setValues] = React.useState<SignupFormValues>(initialValues);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof SignupFormValues, boolean>>
  >({});

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(
    null
  );

  const [usernameStatus, setUsernameStatus] = React.useState<UsernameStatus>({
    state: "idle",
  });
  const usernameReqIdRef = React.useRef(0);
  const debouncedUsernameCheck = React.useMemo(
    () =>
      debounce(async (trimmedUsername: string, reqId: number) => {
        const result = await fakeCheckUsernameAvailability(trimmedUsername);
        if (reqId !== usernameReqIdRef.current) return;

        setUsernameStatus(
          result.available
            ? { state: "available", message: "Username is available." }
            : { state: "taken", message: "Username is already taken." }
        );
      }, USERNAME_DEBOUNCE_MS),
    []
  );

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submitThrottleRef = React.useRef(createThrottle(SUBMIT_THROTTLE_MS));
  const [submitNotice, setSubmitNotice] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      debouncedUsernameCheck.cancel();
    };
  }, [imagePreviewUrl, debouncedUsernameCheck]);

  const markTouched = (key: keyof SignupFormValues) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const setFieldError = (key: keyof SignupFormValues, message?: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (!message) delete next[key];
      else next[key] = message;
      return next;
    });
  };

  const onChangeText =
    (key: keyof SignupFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setValues((prev) => {
        const next = { ...prev, [key]: value };

        if (touched[key]) {
          const nextErrors = validateSync(next);
          setFieldError(key, nextErrors[key]);

          if (key === "password" && touched.confirmPassword) {
            setFieldError("confirmPassword", nextErrors.confirmPassword);
          }
          if (key === "confirmPassword" && touched.password) {
            setFieldError("password", nextErrors.password);
          }
        }

        if (key === "username") {
          const trimmed = value.trim();
          setSubmitSuccess(null);

          if (!trimmed || trimmed.length < 3) {
            setUsernameStatus({ state: "idle" });
            return next;
          }

          setUsernameStatus({ state: "checking" });

          const reqId = ++usernameReqIdRef.current;
          debouncedUsernameCheck(trimmed, reqId);
        }

        return next;
      });
    };

  const onBlurField = (key: keyof SignupFormValues) => () => {
    markTouched(key);

    const nextErrors = validateSync(values);

    if (key === "password" || key === "confirmPassword") {
      setFieldError("password", nextErrors.password);
      setFieldError("confirmPassword", nextErrors.confirmPassword);
    } else {
      setFieldError(key, nextErrors[key]);
    }

    if (key === "username") {
      const trimmed = values.username.trim();
      if (!trimmed) setUsernameStatus({ state: "idle" });
    }
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    setValues((prev) => ({ ...prev, profileImage: file }));
    markTouched("profileImage");

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    if (file) setImagePreviewUrl(URL.createObjectURL(file));
    else setImagePreviewUrl(null);

    const nextErrors = validateSync({ ...values, profileImage: file });
    setFieldError("profileImage", nextErrors.profileImage);
  };

  const canSubmit = () => {
    const syncErrors = validateSync(values);
    const hasSyncErrors = Object.keys(syncErrors).length > 0;

    const usernameOk =
      values.username.trim().length === 0 ||
      usernameStatus.state === "available";

    return !hasSyncErrors && usernameOk;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitNotice(null);
    setSubmitSuccess(null);

    if (isSubmitting) {
      setSubmitNotice("A submission is already in progress. Please wait…");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setTouched({
      fullName: true,
      username: true,
      email: true,
      contactNumber: true,
      password: true,
      confirmPassword: true,
      profileImage: true,
    });

    const syncErrors = validateSync(values);
    setErrors(syncErrors);

    if (Object.keys(syncErrors).length > 0) {
      setSubmitNotice("Please fix the highlighted errors and try again.");
      return;
    }

    if (values.username.trim() && usernameStatus.state !== "available") {
      setSubmitNotice(
        "Please enter an available username (wait for the check to complete)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await fakeSignupRequest(values);
      setSubmitNotice(null);
      setSubmitSuccess("Account created successfully!");
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Reset throttle so next flow is smooth
      submitThrottleRef.current = createThrottle(SUBMIT_THROTTLE_MS);
    } catch {
      setSubmitNotice(
        "Something went wrong during signup (demo). Please retry."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const usernameHelper = (() => {
    if (!values.username.trim()) return EMPTY_HELPER;
    if (usernameStatus.state === "checking")
      return "Checking username availability…";
    if (usernameStatus.state === "available") return usernameStatus.message;
    if (usernameStatus.state === "taken") return usernameStatus.message;
    return EMPTY_HELPER;
  })();

  const usernameAdornment = (() => {
    if (usernameStatus.state === "checking")
      return <CircularProgress size={18} />;
    if (usernameStatus.state === "available")
      return <CheckCircleOutlineIcon fontSize="small" />;
    if (usernameStatus.state === "taken")
      return <ErrorOutlineIcon fontSize="small" />;
    return null;
  })();

  const usernameErrorVisible =
    (touched.username && !!errors.username) || usernameStatus.state === "taken";

  const usernameErrorText =
    (touched.username && errors.username) ||
    (usernameStatus.state === "taken" ? usernameStatus.message : undefined);

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Stack spacing={2.25}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Create your account
          </Typography>
        </Box>

        {submitNotice ? (
          <Alert severity="warning" variant="outlined">
            {submitNotice}
          </Alert>
        ) : null}

        {submitSuccess ? (
          <Alert severity="success" variant="outlined">
            {submitSuccess}
          </Alert>
        ) : null}

        <Divider />

        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={imagePreviewUrl ?? undefined}
            variant="rounded"
            sx={{ width: 56, height: 56 }}
          />
          <Box sx={{ flex: 1 }}>
            <Button variant="outlined" component="label" fullWidth>
              Upload profile image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={onImageChange}
              />
            </Button>
            {touched.profileImage && errors.profileImage ? (
              <Typography variant="caption" color="error" display="block">
                {errors.profileImage}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        <TextField
          label="Full name"
          value={values.fullName}
          onChange={onChangeText("fullName")}
          onBlur={onBlurField("fullName")}
          autoComplete="name"
          fullWidth
          error={!!(touched.fullName && errors.fullName)}
          helperText={
            touched.fullName && errors.fullName ? errors.fullName : EMPTY_HELPER
          }
        />

        <TextField
          label="Username"
          value={values.username}
          onChange={onChangeText("username")}
          onBlur={onBlurField("username")}
          autoComplete="username"
          fullWidth
          error={!!usernameErrorVisible}
          helperText={
            usernameErrorVisible
              ? usernameErrorText ?? EMPTY_HELPER
              : usernameHelper
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {usernameAdornment}
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Email"
          placeholder="e.g., abc@example.com"
          value={values.email}
          onChange={onChangeText("email")}
          onBlur={onBlurField("email")}
          autoComplete="email"
          type="email"
          fullWidth
          error={!!(touched.email && errors.email)}
          helperText={
            touched.email && errors.email ? errors.email : EMPTY_HELPER
          }
        />

        <TextField
          label="Contact number"
          placeholder="e.g., +92 300 1234567"
          value={values.contactNumber}
          onChange={onChangeText("contactNumber")}
          onBlur={onBlurField("contactNumber")}
          autoComplete="tel"
          inputMode="tel"
          fullWidth
          error={!!(touched.contactNumber && errors.contactNumber)}
          helperText={
            touched.contactNumber && errors.contactNumber
              ? errors.contactNumber
              : EMPTY_HELPER
          }
        />

        <FormControl
          fullWidth
          variant="outlined"
          error={!!(touched.password && errors.password)}
        >
          <InputLabel htmlFor="password">Password</InputLabel>
          <OutlinedInput
            id="password"
            label="Password"
            value={values.password}
            onChange={onChangeText("password")}
            onBlur={onBlurField("password")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "hide password" : "show password"}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {showPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
              </InputAdornment>
            }
          />
          <FormHelperText>
            {touched.password ? errors.password : EMPTY_HELPER}
          </FormHelperText>
        </FormControl>

        <FormControl
          fullWidth
          variant="outlined"
          error={!!(touched.confirmPassword && errors.confirmPassword)}
        >
          <InputLabel htmlFor="confirmPassword">Confirm password</InputLabel>
          <OutlinedInput
            id="confirmPassword"
            label="Confirm password"
            value={values.confirmPassword}
            onChange={onChangeText("confirmPassword")}
            onBlur={onBlurField("confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  aria-label={
                    showConfirmPassword
                      ? "hide confirm password"
                      : "show confirm password"
                  }
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {showConfirmPassword ? (
                    <VisibilityIcon />
                  ) : (
                    <VisibilityOffIcon />
                  )}
                </IconButton>
              </InputAdornment>
            }
          />
          <FormHelperText>
            {touched.confirmPassword && errors.confirmPassword
              ? errors.confirmPassword
              : EMPTY_HELPER}
          </FormHelperText>
        </FormControl>

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!canSubmit()}
          startIcon={isSubmitting ? <CircularProgress size={18} /> : undefined}
        >
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </Stack>
    </Box>
  );
}
