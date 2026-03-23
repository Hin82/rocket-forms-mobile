import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Pressable, TextInput, FlatList, KeyboardAvoidingView,
  Platform, Animated, Dimensions, Linking,
} from 'react-native';
import { Text, Portal, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from '@/src/translations';
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
      const { data, error } = await supabase.functions.invoke('ai-support-chat', {
        body: {
          message: text,
          sessionId,
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
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
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowUser]}>
        {!isUser && (
          <View style={styles.botIcon}>
            <MaterialCommunityIcons name="robot-outline" size={16} color="#e8622c" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.message}</Text>
          <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Portal>
      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabAnim }] }]}>
        <Pressable onPress={toggleChat} style={styles.fab} accessibilityLabel="Open chat" accessibilityRole="button">
          <MaterialCommunityIcons name="message-outline" size={26} color="#fff" />
        </Pressable>
      </Animated.View>

      {/* Chat panel */}
      {open && (
        <Animated.View style={[
          styles.chatContainer,
          {
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
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <MaterialCommunityIcons name="robot-outline" size={20} color="#e8622c" />
                </View>
                <Text style={styles.headerTitle}>{t('chat', 'title')}</Text>
              </View>
              <IconButton icon="close" iconColor="#888" size={20} onPress={toggleChat} />
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
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={t('chat', 'placeholder')}
                placeholderTextColor="#666"
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
                accessibilityLabel="Send message"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Footer */}
            <Pressable onPress={() => Linking.openURL('mailto:support@rocketformspro.com')}>
              <Text style={styles.footerText}>
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
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d2d44',
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
    borderBottomColor: '#2d2d44',
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
    backgroundColor: 'rgba(232, 98, 44, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
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
    backgroundColor: 'rgba(232, 98, 44, 0.15)',
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
    backgroundColor: '#252540',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#e8622c',
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  messageTime: {
    color: '#666',
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
    borderTopColor: '#2d2d44',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a2e',
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
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 12,
  },
});
