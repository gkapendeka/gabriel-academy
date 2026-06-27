import pkg from 'pg';
const { Client } = pkg;

const regions = [
  'aws-0-eu-west-1', 'aws-0-us-east-1', 'aws-0-eu-central-1',
  'aws-0-us-west-1', 'aws-0-ap-southeast-1', 'aws-0-ap-northeast-1',
  'aws-0-eu-west-2', 'aws-0-ap-southeast-2'
];

async function run() {
  const sql = `
-- 1. Ensure sequences exist
CREATE SEQUENCE IF NOT EXISTS client_seq START 1;
CREATE SEQUENCE IF NOT EXISTS consultant_seq START 1;

-- 2. Backfill missing profiles for existing users
INSERT INTO public.profiles (id, email, role, display_name, masked_id)
SELECT 
  au.id, 
  au.email, 
  COALESCE(au.raw_user_meta_data->>'role', 'client'),
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'client') = 'client' THEN 'CL-' || LPAD(nextval('client_seq')::TEXT, 3, '0')
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'client') = 'consultant' THEN 'C-' || LPAD(nextval('consultant_seq')::TEXT, 3, '0')
    ELSE 'ADM-' || substr(md5(random()::text), 1, 6)
  END
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
  `;

    const client = new Client({
      host: 'db.vgxjikgmttwflqxezbxd.supabase.co',
      port: 5432,
      user: 'postgres',
      password: 'NewJerusalem@2027',
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('Successfully connected to DB! Running SQL...');
      await client.query(sql);
      console.log('SQL executed successfully!');
      await client.end();
      return;
    } catch (e) {
      console.log('Error:', e.message);
    }
}

run();
