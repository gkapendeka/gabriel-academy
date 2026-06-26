import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgxjikgmttwflqxezbxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable__O9Bj0JC-l3KTo0QBF10YQ_ZP-DBVMd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDB() {
  console.log('Checking if public.profiles exists...');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles table exists. Data:', data);
  }

  console.log('Checking jobs...');
  const { data: jobs, error: jobsError } = await supabase.from('jobs').select('*').limit(1);
  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
  } else {
    console.log('Jobs table exists. Data:', jobs);
  }
}

checkDB();
