import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgres://postgres:NewJerusalem@2027@db.vgxjikgmttwflqxezbxd.supabase.co:5432/postgres'
});

async function test() {
  try {
    await client.connect();
    console.log('Connected to DB!');
    
    // Check if the sequences exist
    const resSeq = await client.query(`
      SELECT sequence_name FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `);
    console.log('Sequences:', resSeq.rows);
    
    // Try a direct insert to auth.users (with a fake user) to see if trigger throws an error
    console.log('Testing trigger via fake insert to auth.users...');
    try {
      await client.query(`
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          '00000000-0000-0000-0000-000000000000',
          'authenticated',
          'authenticated',
          'trigger_test@example.com',
          'fake_password_hash',
          NOW(),
          '{"provider": "email", "providers": ["email"]}',
          '{"role": "client", "full_name": "Trigger Test"}',
          NOW(),
          NOW()
        );
      `);
      console.log('Insert successful! The trigger is working perfectly.');
    } catch (insertErr) {
      console.error('Trigger or Insert Error:', insertErr.message);
    }
    
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}

test();
