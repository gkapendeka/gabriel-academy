import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useMessages(jobId, userId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId || !userId) return;

    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles!sender_id(masked_id, role)')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();

    const channel = supabase
      .channel(`public:messages:job_id=${jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, userId]);

  const sendMessage = async (body, recipientId, isInternal = false) => {
    try {
      const { error } = await supabase.from('messages').insert([{
        job_id: jobId,
        sender_id: userId,
        recipient_id: recipientId,
        body,
        is_internal: isInternal
      }]);
      if (error) throw error;
    } catch (err) {
      alert('Error sending message: ' + err.message);
    }
  };

  return { messages, loading, sendMessage };
}
