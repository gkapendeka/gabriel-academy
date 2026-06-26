const SUPABASE_URL = 'https://vgxjikgmttwflqxezbxd.supabase.co';
const SUPABASE_KEY = 'sb_publishable__O9Bj0JC-l3KTo0QBF10YQ_ZP-DBVMd';

async function testFetch() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify({
      email: 'fetch_test_1234@example.com',
      password: 'Password123!',
      data: {
        role: 'client',
        full_name: 'Fetch Test'
      }
    })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

testFetch();
