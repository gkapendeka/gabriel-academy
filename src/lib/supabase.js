import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgxjikgmttwflqxezbxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable__O9Bj0JC-l3KTo0QBF10YQ_ZP-DBVMd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function logMilestone(jobId, status) {
  if (!jobId || !status) return;
  await supabase.from('messages').insert({
    job_id: jobId,
    body: `[MILESTONE]: ${status}`,
    is_internal: true
  });
}
