import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgxjikgmttwflqxezbxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable__O9Bj0JC-l3KTo0QBF10YQ_ZP-DBVMd';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@gabrielacademy.co.za',
    password: 'Jerusalem@2026',
    options: {
      data: {
        role: 'admin',
        display_name: 'Admin'
      }
    }
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data.user?.id);
  }
}

createAdmin();
