import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthContext } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";

function showAlert(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthContext();
  const colors = useColors();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    if (trimmedEmail.length < 3) {
      setErrorMessage("Please enter a valid username or email.");
      return;
    }

    setErrorMessage("");

    try {
      setIsLoading(true);
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={s.logoContainer}>
            <View style={[s.logoBox, { backgroundColor: colors.foreground }]}>
              <Text style={[s.logoText, { color: colors.background }]}>ن</Text>
            </View>
            <Text style={[s.title, { color: colors.foreground }]}>Nile Center</Text>
            <Text style={[s.subtitle, { color: colors.muted }]}>
              Sign in to your Arabic learning account
            </Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            {errorMessage ? (
              <View
                style={[
                  s.errorBox,
                  {
                    backgroundColor: colors.error + "0A",
                    borderColor: colors.error + "20",
                  },
                ]}
              >
                <Text style={[s.errorText, { color: colors.error }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[
                  s.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMessage("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Password</Text>
              <View
                style={[
                  s.passwordRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[s.passwordInput, { color: colors.foreground }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setErrorMessage("");
                  }}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={s.eyeBtn}
                  activeOpacity={0.6}
                >
                  <Text style={[s.eyeText, { color: colors.muted }]}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[
                s.submitBtn,
                { backgroundColor: colors.foreground },
                isLoading && s.submitDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={[s.submitText, { color: colors.background }]}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <View style={s.infoContainer}>
              <Text style={[s.infoText, { color: colors.muted }]}>
                Use your Nile Center Online credentials.{"\n"}
                Visit nilecenter.online to create an account.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },

  logoContainer: { alignItems: "center", paddingTop: 48, paddingBottom: 36 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: { fontSize: 36, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },

  form: { paddingHorizontal: 24, paddingTop: 4 },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, textAlign: "center", fontWeight: "500" },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, letterSpacing: -0.1 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  eyeText: { fontSize: 12, fontWeight: "600" },

  submitBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { fontSize: 14, fontWeight: "600" },

  infoContainer: { alignItems: "center", marginTop: 32, marginBottom: 24 },
  infoText: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
