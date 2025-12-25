import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Json } from '@/integrations/supabase/types';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating: number;
  gps?: string;
  images: string[];
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  totalComments?: number;
  matchingScore?: number;
  distance?: number;
  category?: string;
  description?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  placeResults: PlaceResult[];
  createdAt: string;
  updatedAt: string;
}

const CHAT_STORAGE_KEY = "vietspots_chat_history";

export function useChatConversations() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrated, setMigrated] = useState(false);

  // Fetch conversations from Supabase
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setConversations(data?.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: (conv.messages as unknown) as Message[],
        placeResults: (conv.place_results as unknown) as PlaceResult[],
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      })) || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user]);

  // Migrate localStorage to Supabase on first load
  useEffect(() => {
    const migrateLocalStorage = async () => {
      if (!user || migrated) return;

      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        try {
          const localMessages = JSON.parse(saved) as Message[];

          // Only migrate if there are more messages than the default
          if (localMessages.length > 1) {
            // Create title from first user message
            const firstUserMessage = localMessages.find(m => m.role === 'user');
            const title = firstUserMessage
              ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
              : t('chat.default_saved_title') || 'Saved conversation';

            const { data, error } = await supabase
              .from('chat_conversations')
              .insert([{
                user_id: user.id,
                title,
                messages: localMessages as unknown as Json,
                place_results: [] as unknown as Json,
              }])
              .select()
              .single();

            if (!error && data) {
              toast.success(t('chat_messages.migrated_success'));
              // Clear localStorage after successful migration
              localStorage.removeItem(CHAT_STORAGE_KEY);
              sessionStorage.removeItem('vietspot_session_id');

              // Load the migrated conversation
              setCurrentConversationId(data.id);
              setMessages(localMessages);
            }
          } else {
            // Clear localStorage if only default message
            localStorage.removeItem(CHAT_STORAGE_KEY);
          }
        } catch (error) {
          console.error('Error migrating localStorage:', error);
        }
      }
      setMigrated(true);
    };

    migrateLocalStorage();
  }, [user, migrated]);

  // Ensure there is a default assistant message (localized)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: '1', role: 'assistant', content: t('chatbot.greeting') }]);
    }
  }, [t]);

  // Fetch conversations when user changes
  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setCurrentConversationId(null);
      setMessages([{ id: '1', role: 'assistant', content: t('chatbot.greeting') }]);
      setPlaceResults([]);
    }
  }, [user, fetchConversations, t]);

  // Save current conversation to Supabase
  const saveConversation = useCallback(async () => {
    if (!user || messages.length <= 1) return;

    const firstUserMessage = messages.find(m => m.role === 'user');
    const title = firstUserMessage
      ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : t('chat.default_new_title') || 'New conversation';

    try {
      if (currentConversationId) {
        // Update existing conversation
        const { error } = await supabase
          .from('chat_conversations')
          .update({
            title,
            messages: messages as unknown as Json,
            place_results: placeResults as unknown as Json,
          })
          .eq('id', currentConversationId);

        if (error) throw error;
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from('chat_conversations')
          .insert([{
            user_id: user.id,
            title,
            messages: messages as unknown as Json,
            place_results: placeResults as unknown as Json,
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCurrentConversationId(data.id);
        }
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }, [user, currentConversationId, messages, placeResults]);

  // Auto-save conversation when messages change
  useEffect(() => {
    if (user && messages.length > 1) {
      const timer = setTimeout(() => {
        saveConversation();
      }, 2000); // Debounce 2 seconds
      return () => clearTimeout(timer);
    }
  }, [messages, user, saveConversation]);

  // Load a conversation
  const loadConversation = useCallback((conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
      setCurrentConversationId(conv.id);
      setMessages(conv.messages);
      setPlaceResults(conv.placeResults);
    }
  }, [conversations]);

  // Start a new conversation
  const startNewConversation = useCallback(async () => {
    // Save current conversation first if needed
    if (user && messages.length > 1) {
      await saveConversation();
    }

    // Reset to new conversation
    setCurrentConversationId(null);
    setMessages([{ id: '1', role: 'assistant', content: t('chatbot.greeting') }]);
    setPlaceResults([]);
    sessionStorage.removeItem('vietspot_session_id');

    // Refresh conversations list
    if (user) {
      fetchConversations();
    }

    toast.success(t('chat_messages.created_new'));
  }, [user, messages, saveConversation, fetchConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      // If deleting current conversation, start new one
      if (conversationId === currentConversationId) {
        startNewConversation();
      }

      fetchConversations();
      toast.success(t('chat_messages.deleted'));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error(t('chat_messages.delete_error'));
    }
  }, [user, currentConversationId, startNewConversation, fetchConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    setMessages,
    placeResults,
    setPlaceResults,
    loading,
    loadConversation,
    startNewConversation,
    deleteConversation,
    saveConversation,
    fetchConversations,
  };
}
