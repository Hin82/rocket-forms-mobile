import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Pressable, TextInput, FlatList, KeyboardAvoidingView,
  Platform, Animated, Dimensions, Linking, Alert,
} from 'react-native';
import { Text, Portal, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
import { useAppTheme } from '@/src/contexts/ThemeContext';
import * as Crypto from 'expo-crypto';

interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'assistant';
  created_at: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHAT_HEIGHT = SCREEN_HEIGHT * 0.65;

export default function SupportChat() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => Crypto.randomUUID());
  const flatListRef = useRef<FlatList>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        message: t('chat', 'welcomeMessage'),
        sender: 'assistant',
        created_at: new Date().toISOString(),
      }]);
    }
  }, [open, t, messages.length]);

  const toggleChat = useCallback(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0, useNativeDriver: true }),
        Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true }),
      ]).start(() => setOpen(false));
    } else {
      setOpen(true);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.spring(fabAnim, { toValue: 0, useNativeDriver: true }),
      ]).start();
    }
  }, [open, scaleAnim, fabAnim]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !user) return;

    const userMsg: ChatMessage = {
      id: Crypto.randomUUID(),
      message: text,
      sender: 'user',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      // Fetch display name from profiles (same source as web app)
      let userName = user.email?.split('@')[0] || 'User';
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.first_name || profile?.last_name) {
        userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
      }

      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: {
          message: text,
          sessionId,
          userId: user.id,
          userEmail: user.email,
          userName,
        },
      });

      if (error) {
        console.warn('ai-support-chat error:', JSON.stringify(error));
        throw error;
      }

      if (__DEV__) console.log('ai-support-chat response:', JSON.stringify(data));

      const assistantMsg: ChatMessage = {
        id: Crypto.randomUUID(),
        message: data?.message || t('chat', 'errorResponse'),
        sender: 'assistant',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn('Chat send failed:', err);
      const errorMsg: ChatMessage = {
        id: Crypto.randomUUID(),
        message: t('chat', 'errorResponse'),
        sender: 'assistant',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowUser]}>
        {!isUser && (
          <View style={[styles.botIcon, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons name="robot-outline" size={16} color={colors.accent} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : [styles.assistantBubble, { backgroundColor: colors.surfaceSecondary }]]}>
          <Text style={[styles.messageText, { color: colors.text }, isUser && styles.userMessageText]}>{item.message}</Text>
          <Text style={[styles.messageTime, { color: colors.textTertiary }, isUser && styles.userMessageTime]}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Portal>
      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabAnim }] }]}>
        <Pressable onPress={toggleChat} style={styles.fab} accessibilityLabel={t('chat', 'openChat')} accessibilityRole="button">
          <MaterialCommunityIcons name="message-outline" size={26} color="#fff" />
        </Pressable>
      </Animated.View>

      {/* Chat panel */}
      {open && (
        <Animated.View style={[
          styles.chatContainer,
          {
            backgroundColor: colors.headerBg,
            borderColor: colors.border,
            transform: [{ scale: scaleAnim }],
            opacity: scaleAnim,
          },
        ]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.chatInner}
            keyboardVerticalOffset={0}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: colors.accentLight }]}>
                  <MaterialCommunityIcons name="robot-outline" size={20} color={colors.accent} />
                </View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('chat', 'title')}</Text>
              </View>
              <IconButton icon="close" iconColor={colors.textSecondary} size={20} onPress={toggleChat} accessibilityLabel={t('chat', 'closeChat')} accessibilityRole="button" />
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            {/* Input */}
            <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                placeholder={t('chat', 'placeholder')}
                placeholderTextColor={colors.textTertiary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                editable={!sending}
                multiline={false}
              />
              <Pressable
                onPress={sendMessage}
                disabled={!input.trim() || sending}
                style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
                accessibilityLabel={t('chat', 'send')}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Footer */}
            <Pressable
              onPress={async () => {
                try {
                  await Linking.openURL('mailto:support@rocketformspro.com');
                } catch {
                  Alert.alert(t('settings', 'error'), t('chat', 'couldNotOpenEmail'));
                }
              }}
              accessibilityRole="link"
              accessibilityLabel="support@rocketformspro.com"
            >
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {t('chat', 'urgentSupport')}
              </Text>
            </Pressable>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </Portal>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 50,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8622c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatContainer: {
    position: 'absolute',
    bottom: 20,
    right: 12,
    left: 12,
    height: CHAT_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 51,
  },
  chatInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageBubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#e8622c',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8622c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 12,
  },
});
