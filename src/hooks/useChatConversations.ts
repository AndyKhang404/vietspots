import { useState, useEffect, useCallback, useRef } from 'react';
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
  createdAt?: string;
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
const QUEUE_KEY = "vietspots_chat_sync_queue";

export function useChatConversations() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const isSavingRef = useRef(false);
  // Track if migration toast was already shown in this session
  const [migrationToastShown, setMigrationToastShown] = useState(false);
  // Remember last saved messages hash to avoid duplicate saves
  const lastSavedHashRef = useRef<string | null>(null);

  // Fetch conversations from Supabase
  const fetchConversations = useCallback(async (opts?: { preserveCurrent?: boolean }) => {
    if (!user) return;

    // Ensure active session to satisfy RLS policies
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) return;

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.warn('getUser error fetching conversations', userErr);
      const dbUserId = userData?.user?.id || user?.id;
      if (!dbUserId) return;

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', dbUserId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setConversations(data?.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: ((conv.messages as unknown) as Message[]).map((m) => ({ ...(m as Message), createdAt: (m as any)?.createdAt || conv.created_at })),
        placeResults: (conv.place_results as unknown) as PlaceResult[],
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      })) || []);
      // If we fetched at least one conversation, set the most recent as current
      // unless caller requested to preserve the current selection (e.g. when
      // starting a new conversation we want the list refreshed but not auto-select).
      if (data && Array.isArray(data) && data.length > 0 && !opts?.preserveCurrent) {
        const first = data[0];
        try {
          const msgs = ((first.messages as unknown) as Message[]).map((m) => ({ ...(m as Message), createdAt: (m as any)?.createdAt || first.created_at }));
          setCurrentConversationId(first.id);
          setMessages(msgs);
          setPlaceResults((first.place_results as unknown) as PlaceResult[] || []);
        } catch (e) {
          // ignore parsing errors
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user]);

  // Migrate localStorage to Supabase on first load
  useEffect(() => {
    const migrateLocalStorage = async () => {
      // Avoid running migration multiple times per session
      if (sessionStorage.getItem('vietspots_chat_migrated') === '1') {
        setMigrated(true);
        return;
      }
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

            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData?.session;
            if (!session) {
              console.warn('No active session; skipping migration to Supabase');
            } else {
              const { data: userData, error: userErr } = await supabase.auth.getUser();
              if (userErr) console.warn('getUser error migrating conversation', userErr);
              const dbUserId = userData?.user?.id || user?.id;

              try {
                const { data, error } = await supabase
                  .from('chat_conversations')
                  .insert([{
                    id: crypto.randomUUID(),
                    user_id: dbUserId,
                    title,
                    messages: localMessages as unknown as Json,
                    place_results: [] as unknown as Json,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }])
                  .select()
                  .single();

                if (!error && data) {
                  if (!migrationToastShown && sessionStorage.getItem('vietspots_chat_migrated') !== '1') {
                    toast.success(t('chat_messages.migrated_success'));
                    setMigrationToastShown(true);
                    sessionStorage.setItem('vietspots_chat_migrated', '1');
                  }
                  // Clear localStorage after successful migration
                  localStorage.removeItem(CHAT_STORAGE_KEY);
                  sessionStorage.removeItem('vietspot_session_id');
                  sessionStorage.setItem('vietspots_chat_migrated', '1');

                  // Load the migrated conversation
                  setCurrentConversationId(data.id);
                  setMessages(localMessages);
                }
              } catch (err: any) {
                // If RLS prevented insert, queue locally for later sync
                const msg = err?.message || '';
                if (msg.includes('row-level')) {
                  try {
                    console.warn('RLS blocked migration; queueing conversation for later sync');
                    const queueRaw = localStorage.getItem(QUEUE_KEY);
                    const queue = queueRaw ? JSON.parse(queueRaw) as any[] : [];
                    const messagesHash = JSON.stringify(localMessages);
                    const exists = queue.some(q => {
                      try { return JSON.stringify(q.messages) === messagesHash; } catch { return false; }
                    });
                    if (!exists) {
                      queue.push({ id: crypto.randomUUID(), title, messages: localMessages, place_results: [], messagesHash });
                      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
                    } else {
                      console.warn('Migration queue already contains identical conversation; skipping push');
                    }
                  } catch (qerr) {
                    console.warn('Could not queue migration item', qerr);
                  }
                } else {
                  console.error('Migration insert error', err);
                }
              }
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
      // Load any locally queued/saved conversations so history works offline
      try {
        const queueRaw = localStorage.getItem(QUEUE_KEY);
        const localQueue = queueRaw ? JSON.parse(queueRaw) as any[] : [];
        const savedRaw = localStorage.getItem(CHAT_STORAGE_KEY);
        const savedMessages = savedRaw ? JSON.parse(savedRaw) as any[] : null;

        const localConvs: Conversation[] = [];
        for (const item of localQueue) {
          localConvs.push({
            id: item.id || `local-${Date.now()}`,
            title: item.title || (item.messages?.find((m: any) => m.role === 'user')?.content?.slice(0, 50) || t('chat.default_saved_title') || 'Saved conversation'),
            messages: item.messages || [],
            placeResults: item.place_results || [],
            createdAt: item.created_at || new Date().toISOString(),
            updatedAt: item.updated_at || new Date().toISOString(),
          });
        }

        if (savedMessages && savedMessages.length > 1) {
          localConvs.unshift({
            id: `local-${Date.now()}`,
            title: savedMessages.find((m: any) => m.role === 'user')?.content?.slice(0, 50) || t('chat.default_saved_title') || 'Saved conversation',
            messages: savedMessages,
            placeResults: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        setConversations(localConvs);
        setCurrentConversationId(localConvs[0]?.id || null);
        if (localConvs[0]) {
          setMessages(localConvs[0].messages);
          setPlaceResults(localConvs[0].placeResults || []);
        } else {
          setCurrentConversationId(null);
          setMessages([{ id: '1', role: 'assistant', content: t('chatbot.greeting') }]);
          setPlaceResults([]);
        }
      } catch (e) {
        console.warn('Could not load local conversations', e);
        setConversations([]);
        setCurrentConversationId(null);
        setMessages([{ id: '1', role: 'assistant', content: t('chatbot.greeting') }]);
        setPlaceResults([]);
      }
    }
  }, [user, fetchConversations, t]);

  // Save current conversation to Supabase
  const saveConversation = useCallback(async () => {
    if (messages.length <= 1) return;

    // Skip saving if messages content hasn't changed since last successful save/queue
    try {
      const currentHash = JSON.stringify(messages);
      if (lastSavedHashRef.current === currentHash) return;
    } catch {
      // ignore stringify errors and proceed to save
    }

    // Prevent concurrent saves
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    // Require an authenticated session to avoid RLS check failures
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      // Queue locally for later sync (deduplicate across reloads by message hash)
      try {
        const queueRaw = localStorage.getItem(QUEUE_KEY);
        const queue = queueRaw ? JSON.parse(queueRaw) as any[] : [];
        const messagesHash = JSON.stringify(messages);
        const exists = queue.some(q => {
          try { return JSON.stringify(q.messages) === messagesHash; } catch { return false; }
        });
        if (!exists) {
          queue.push({ id: crypto.randomUUID(), title: messages.find(m => m.role === 'user')?.content?.slice(0, 50) || 'Unsaved', messages, place_results: placeResults, messagesHash });
          localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
          toast.success(t('chat_messages.queued_offline') || 'Conversation saved locally and will sync when online');
        } else {
          // Already queued this exact conversation
          console.warn('Conversation already queued for later sync; skipping duplicate');
        }
        try { lastSavedHashRef.current = messagesHash; } catch { }
      } catch (e) {
        console.warn('Could not queue conversation locally', e);
      }
      return;
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.warn('getUser error saving conversation', userErr);
    const dbUserId = userData?.user?.id || user?.id;
    if (!dbUserId) return; // require authenticated DB user to save

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
        // Update local conversations state so UI reflects new updatedAt and messages
        setConversations((prev) => prev.map((c) => c.id === currentConversationId ? ({
          ...c,
          title,
          messages,
          placeResults,
          updatedAt: new Date().toISOString(),
        }) : c));
        // Mark as saved
        try { lastSavedHashRef.current = JSON.stringify(messages); } catch { }
      } else {
        // Create new conversation
        const { data: insertData, error: insertError } = await supabase
          .from('chat_conversations')
          .insert([{
            id: crypto.randomUUID(),
            user_id: dbUserId,
            title,
            messages: messages as unknown as Json,
            place_results: placeResults as unknown as Json,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

          if (insertError) {
          const msg = insertError?.message || '';
          if (msg.includes('row-level')) {
            try {
              console.warn('RLS blocked insert; queueing conversation for later sync');
              const queueRaw = localStorage.getItem(QUEUE_KEY);
              const queue = queueRaw ? JSON.parse(queueRaw) as any[] : [];
              const messagesHash = JSON.stringify(messages);
              const exists = queue.some(q => {
                try { return JSON.stringify(q.messages) === messagesHash; } catch { return false; }
              });
              if (!exists) {
                queue.push({ id: crypto.randomUUID(), title, messages, place_results: placeResults, messagesHash });
                localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
                try { lastSavedHashRef.current = messagesHash; } catch { }
                toast.success(t('chat_messages.queued_offline') || 'Conversation saved locally and will sync when online');
              } else {
                console.warn('Conversation already queued for later sync; skipping duplicate');
              }
            } catch (qe) {
              console.warn('Could not queue conversation after insert failure', qe);
            }
          } else {
            console.error('Error saving conversation:', insertError);
            toast.error((t('messages.error_occurred_apology') || 'An error occurred') + ' ' + (insertError.message || ''));
            throw insertError;
          }
        } else if (insertData) {
          setCurrentConversationId(insertData.id);
          setConversations((prev) => [
            {
              id: insertData.id,
              title: insertData.title,
              messages: (insertData.messages as unknown) as Message[],
              placeResults: (insertData.place_results as unknown) as PlaceResult[],
              createdAt: insertData.created_at,
              updatedAt: insertData.updated_at,
            },
            ...prev,
          ]);
          try { lastSavedHashRef.current = JSON.stringify(messages); } catch { }
        } else {
          // Fallback: try upsert to ensure idempotent save
          const newId = crypto.randomUUID();
          setCurrentConversationId(newId);
          try {
            const payload = {
              id: newId,
              user_id: dbUserId,
              title,
              messages: messages as unknown as Json,
              place_results: placeResults as unknown as Json,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const { data: upsertData, error: upsertErr } = await supabase
              .from('chat_conversations')
              .upsert(payload, { onConflict: 'id' })
              .select()
              .single();

                if (upsertErr) {
              const msg = upsertErr?.message || '';
              if (msg.includes('row-level')) {
                try {
                  console.warn('RLS blocked upsert; queueing conversation for later sync');
                  const queueRaw = localStorage.getItem(QUEUE_KEY);
                  const queue = queueRaw ? JSON.parse(queueRaw) as any[] : [];
                  const messagesHash = JSON.stringify(messages);
                  const exists = queue.some(q => {
                    try { return JSON.stringify(q.messages) === messagesHash; } catch { return false; }
                  });
                  if (!exists) {
                    queue.push({ id: newId, title, messages, place_results: placeResults, messagesHash });
                    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
                    try { lastSavedHashRef.current = messagesHash; } catch { }
                    toast.success(t('chat_messages.queued_offline') || 'Conversation saved locally and will sync when online');
                  } else {
                    console.warn('Conversation already queued for later sync; skipping duplicate');
                  }
                } catch (qe) {
                  console.warn('Could not queue conversation after upsert failure', qe);
                }
              } else {
                console.error('Error saving conversation:', upsertErr);
                toast.error((t('messages.error_occurred_apology') || 'An error occurred') + ' ' + (upsertErr.message || ''));
                throw upsertErr;
              }
            }

            if (upsertData) {
              setConversations((prev) => [
                {
                  id: upsertData.id,
                  title: upsertData.title,
                  messages: (upsertData.messages as unknown) as Message[],
                  placeResults: (upsertData.place_results as unknown) as PlaceResult[],
                  createdAt: upsertData.created_at,
                  updatedAt: upsertData.updated_at,
                },
                ...prev,
              ]);
              try { lastSavedHashRef.current = JSON.stringify(messages); } catch { }
            }
          } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('row-level')) {
              try {
                console.warn('RLS blocked upsert; queueing conversation for later sync');
                const queueRaw = localStorage.getItem(QUEUE_KEY);
                const queue = queueRaw ? JSON.parse(queueRaw) as any[] : [];
                const messagesHash = JSON.stringify(messages);
                const exists = queue.some(q => {
                  try { return JSON.stringify(q.messages) === messagesHash; } catch { return false; }
                });
                if (!exists) {
                  queue.push({ id: newId, title, messages, place_results: placeResults, messagesHash });
                  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
                } else {
                  console.warn('Conversation already queued for later sync; skipping duplicate');
                }
              } catch (qe) {
                console.warn('Could not queue conversation after upsert failure', qe);
              }
            } else {
              console.error('Error saving conversation:', err);
              toast.error(t('messages.error_occurred_apology'));
            }
          }
        }
      }
    } catch (e) {
      console.error('saveConversation error', e);
    } finally {
      isSavingRef.current = false;
    }
  }, [user, messages, placeResults, currentConversationId, t]);

  // Flush locally queued conversations to Supabase when session/user available
  const flushQueue = useCallback(async () => {
    if (!user) return;
    try {
      const queueRaw = localStorage.getItem(QUEUE_KEY);
      const queue = queueRaw ? JSON.parse(queueRaw) as any[] : [];
      if (!queue || queue.length === 0) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) return;

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.warn('getUser error flushing queue', userErr);
      const dbUserId = userData?.user?.id || user?.id;

      const remaining: any[] = [];
      for (const item of queue) {
        try {
          const payload = {
            id: item.id || crypto.randomUUID(),
            user_id: dbUserId,
            title: item.title || (item.messages?.find((m: any) => m.role === 'user')?.content?.slice(0,50) || t('chat.default_saved_title') || 'Saved conversation'),
            messages: item.messages as unknown as Json,
            place_results: item.place_results as unknown as Json,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from('chat_conversations')
            .upsert(payload, { onConflict: 'id' });

          if (error) {
            const msg = error?.message || '';
            if (msg.includes('row-level')) {
              remaining.push(item);
            } else {
              console.error('flushQueue item error', error);
              remaining.push(item);
            }
          }
        } catch (e) {
          console.error('Error flushing queued conversation', e);
          remaining.push(item);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(QUEUE_KEY);
      }
    } catch (e) {
      console.error('flushQueue error', e);
    }
  }, [user, t]);

  // Try flushing queue when user/session becomes available
  useEffect(() => {
    if (user) {
      void flushQueue();
    }
  }, [user, flushQueue]);

  // Auto-save conversation when messages change
  useEffect(() => {
    // Always persist current conversation locally so history works offline
    try {
      if (messages && messages.length > 1) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } else {
        // keep default greeting if only one message
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not persist chat to localStorage', e);
    }

    // If user is authenticated, also attempt to save to Supabase (debounced)
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

    // Refresh conversations list but don't let the fetch auto-select the
    // most-recent conversation (preserve current/new empty state).
    if (user) {
      fetchConversations({ preserveCurrent: true });
    }

    toast.success(t('chat_messages.created_new'));
  }, [user, messages, saveConversation, fetchConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        console.warn('No active session; cannot delete conversation');
        return;
      }
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.warn('getUser error deleting conversation', userErr);
      const dbUserId = userData?.user?.id || user?.id;

      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', dbUserId);

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
