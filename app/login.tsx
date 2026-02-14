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
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setErrorMessage("");

    try {
      setIsLoading(true);
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Login failed. Please check your credentials.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>ن</Text>
            </View>
            <Text className="text-3xl font-bold text-foreground" style={styles.title}>
              Nile Center
            </Text>
            <Text className="text-base text-muted" style={styles.subtitle}>
              Sign in to access your Arabic learning courses
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Error Message */}
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: colors.error + "15", borderColor: colors.error + "30" }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text className="text-sm font-semibold text-foreground" style={styles.label}>
                Email
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={(text) => { setEmail(text); setErrorMessage(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text className="text-sm font-semibold text-foreground" style={styles.label}>
                Password
              </Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.foreground }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(text) => { setPassword(text); setErrorMessage(""); }}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[
                styles.loginButton,
                { backgroundColor: colors.primary },
                isLoading && styles.loginButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.infoContainer}>
              <Text className="text-xs text-muted" style={styles.infoText}>
                Use your Nile Center Online credentials to sign in.{"\n"}
                Visit nilecenter.online to create an account.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  logoContainer: { alignItems: "center", paddingTop: 48, paddingBottom: 32 },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoText: { fontSize: 48, color: "#FFFFFF", fontWeight: "700" },
  title: { marginBottom: 8 },
  subtitle: { textAlign: "center", paddingHorizontal: 32 },
  formContainer: { paddingHorizontal: 24, paddingTop: 8 },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, textAlign: "center", fontWeight: "500" },
  fieldGroup: { marginBottom: 16 },
  label: { marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: { paddingHorizontal: 16, paddingVertical: 14 },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  infoContainer: { alignItems: "center", marginTop: 32, marginBottom: 24 },
  infoText: { textAlign: "center", paddingHorizontal: 16, lineHeight: 20 },
});
