import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuthContext } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthContext();
  const colors = useColors();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    if (!email.trim()) {
      setErrorMessage("Please enter your email or username.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Please enter your password.");
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
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Area */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>ن</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Nile Center
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Sign in to access your Arabic learning courses
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Error Message */}
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: colors.error + "12", borderColor: colors.error + "30" }]}>
                <MaterialIcons name="error-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Email or Username
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="person-outline" size={20} color={colors.muted} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.inputText, { color: colors.foreground }]}
                  placeholder="Enter your email or username"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={(text) => { setEmail(text); setErrorMessage(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Password
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="lock-outline" size={20} color={colors.muted} style={{ marginRight: 12 }} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.inputText, { color: colors.foreground }]}
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
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={22}
                    color={colors.muted}
                  />
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
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={[styles.loginButtonText, { marginLeft: 10 }]}>Signing in...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.infoContainer}>
              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Use your Nile Center Online credentials to sign in.
              </Text>
              <Text style={[styles.infoLink, { color: colors.primary }]}>
                nilecenter.online
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
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingBottom: 32 },
  logoContainer: { alignItems: "center", paddingTop: 48, paddingBottom: 36 },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logoText: { fontSize: 44, color: "#FFFFFF", fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: "center", paddingHorizontal: 40, lineHeight: 22 },
  formContainer: { paddingHorizontal: 24, paddingTop: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: { fontSize: 14, fontWeight: "500", flex: 1, lineHeight: 20 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 2 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  eyeButton: { padding: 4, marginLeft: 8 },
  loginButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonDisabled: { opacity: 0.75 },
  loginButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center" },
  infoContainer: { alignItems: "center", marginTop: 32, marginBottom: 16, gap: 12 },
  infoDivider: { width: 48, height: 1.5, borderRadius: 1, marginBottom: 4 },
  infoText: { textAlign: "center", fontSize: 13, lineHeight: 20 },
  infoLink: { fontSize: 14, fontWeight: "600" },
});
