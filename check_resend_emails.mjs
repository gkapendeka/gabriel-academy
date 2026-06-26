const token = 're_7UtCbyWY_FLa12Xf2fHCdCZzujBaRPz6j';

async function checkEmails() {
  const res = await fetch('https://api.resend.com/emails', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkEmails();
