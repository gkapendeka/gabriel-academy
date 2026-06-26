import pkg from 'pg';
const { Client } = pkg;

const regions = [
  'aws-0-eu-west-1',
  'aws-0-us-east-1',
  'aws-0-eu-central-1',
  'aws-0-us-west-1',
  'aws-0-ap-southeast-1',
  'aws-0-ap-northeast-1',
  'aws-0-eu-west-2',
  'aws-0-ap-southeast-2'
];

async function run() {
  const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_role text;
  new_masked_id text;
BEGIN
  extracted_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  IF extracted_role = 'client' THEN
    new_masked_id := 'CL-' || LPAD(nextval('client_seq')::TEXT, 3, '0');
  ELSIF extracted_role = 'consultant' THEN
    new_masked_id := 'C-' || LPAD(nextval('consultant_seq')::TEXT, 3, '0');
  ELSE
    new_masked_id := 'ADM-' || substr(md5(random()::text), 1, 6);
  END IF;

  INSERT INTO public.profiles (id, email, role, masked_id)
  VALUES (NEW.id, NEW.email, extracted_role, new_masked_id);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  for (const region of regions) {
    console.log(`Trying ${region}...`);
    const client = new Client({
      connectionString: `postgres://postgres.vgxjikgmttwflqxezbxd:NewJerusalem@2027@${region}.pooler.supabase.com:6543/postgres`
    });

    try {
      await client.connect();
      console.log(`Successfully connected to ${region}! Running SQL...`);
      await client.query(sql);
      console.log('SQL executed successfully!');
      await client.end();
      return;
    } catch (e) {
      if (e.message.includes('tenant/user') || e.message.includes('ENOTFOUND')) {
        // wrong region
      } else {
        console.log(`Error on ${region}:`, e.message);
      }
    } finally {
      await client.end().catch(()=>{});
    }
  }
  console.log('Could not connect to any region.');
}

run();
