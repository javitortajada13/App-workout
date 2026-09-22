import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ChatMessage } from "@app-workout/shared";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { sendChatMessage } from "@/lib/api";

export default function CoachScreen() {
  const theme = useTheme();
  const { strings } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: "user", content: text } satisfies ChatMessage];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const response = await sendChatMessage(next);
      setMessages([...next, response.message]);
    } catch {
      setMessages([...next, { role: "assistant", content: strings.coach.error }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.messages}
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <ThemedText type="subtitle">{strings.coach.emptyTitle}</ThemedText>
              <ThemedText themeColor="textSecondary">{strings.coach.emptyExamples}</ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => (
            <ThemedView
              type={item.role === "user" ? "backgroundSelected" : "backgroundElement"}
              style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}
            >
              <ThemedText>{item.content}</ThemedText>
            </ThemedView>
          )}
        />
        {sending && <ActivityIndicator color={theme.text} style={styles.spinner} />}
        <ThemedView type="backgroundElement" style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={strings.coach.placeholder}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !input.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: theme.accent, opacity: pressed || sending || !input.trim() ? 0.5 : 1 },
            ]}
          >
            <ThemedText style={{ color: theme.accentContrast }} type="smallBold">
              {strings.coach.send}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  messages: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: "center", gap: Spacing.two, paddingHorizontal: Spacing.three },
  bubble: { borderRadius: Spacing.three, padding: Spacing.three, maxWidth: "85%" },
  userBubble: { alignSelf: "flex-end" },
  assistantBubble: { alignSelf: "flex-start" },
  spinner: { marginBottom: Spacing.two },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: { flex: 1, maxHeight: 120, fontSize: 16, paddingVertical: Spacing.one },
  sendButton: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
