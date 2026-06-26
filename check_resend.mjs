const token = 're_7UtCbyWY_FLa12Xf2fHCdCZzujBaRPz6j';

async function checkDomains() {
  const res = await fetch('https://api.resend.com/domains', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkDomains();
