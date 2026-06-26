import pkg from 'pg';
const { Client } = pkg;

const region = 'aws-0-eu-west-1'; // Same region that worked before

async function wipe() {
  const sql = `
    DELETE FROM public.jobs;
    DELETE FROM auth.users WHERE id IN (
      SELECT id FROM public.profiles WHERE role != 'admin'
    );
  `;

  const client = new Client({
    connectionString: `postgres://postgres.vgxjikgmttwflqxezbxd:NewJerusalem@2027@${region}.pooler.supabase.com:6543/postgres`
  });

  try {
    await client.connect();
    console.log(`Connected to database. Executing wipe script...`);
    await client.query(sql);
    console.log('All jobs and non-admin users have been successfully deleted from the database!');
  } catch (e) {
    console.log(`Error executing SQL:`, e.message);
  } finally {
    await client.end();
  }
}

wipe();
