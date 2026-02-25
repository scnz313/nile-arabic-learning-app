import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  visible: boolean;
  onHide: () => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: "check-circle",
  error: "error",
  warning: "warning",
  info: "info",
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#0a7ea4",
};

export function Toast({ message, type = "info", duration = 3000, visible, onHide }: ToastProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const color = TOAST_COLORS[type];
  const icon = TOAST_ICONS[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 16,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.toast, { borderLeftColor: color }]}>
        <MaterialIcons name={icon as any} size={24} color={color} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      web: {
        position: "fixed" as any,
      },
    }),
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  message: {
    flex: 1,
    fontSize: 15,
    color: "#11181C",
    lineHeight: 20,
  },
});

// Toast manager for global toast notifications
class ToastManager {
  private listeners: Array<(message: string, type: ToastType) => void> = [];

  subscribe(listener: (message: string, type: ToastType) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  show(message: string, type: ToastType = "info") {
    this.listeners.forEach((listener) => listener(message, type));
  }

  success(message: string) {
    this.show(message, "success");
  }

  error(message: string) {
    this.show(message, "error");
  }

  warning(message: string) {
    this.show(message, "warning");
  }

  info(message: string) {
    this.show(message, "info");
  }
}

export const toast = new ToastManager();
