import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgxjikgmttwflqxezbxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable__O9Bj0JC-l3KTo0QBF10YQ_ZP-DBVMd';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAuth() {
  console.log('Testing Supabase Auth with Resend...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test_verify_3948@example.com',
    password: 'Password123!',
    options: {
      data: {
        full_name: 'Test Verifier',
        role: 'client'
      }
    }
  });

  if (error) {
    console.error('Registration failed:', error);
  } else {
    console.log('Registration successful!');
    console.log('User ID:', data?.user?.id);
    console.log('Email Confirmed At:', data?.user?.email_confirmed_at || 'Not confirmed (email sent)');
  }
}

testAuth();
