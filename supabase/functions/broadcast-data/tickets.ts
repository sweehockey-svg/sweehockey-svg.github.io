// Stateless, read-only access to one sanitized artifact. No database writes.
export const allowedLeagues=new Set([520,523,524,525,526,527,529,532]);
const encoder=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=text=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const message=body=>encoder.encode('swn-broadcast-data-v1\0'+body);
const key=secret=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
function valid(c){
 return c?.v===1&&allowedLeagues.has(c.league)&&/^[a-f0-9]{8}_\d{3}_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}_[a-f0-9]{16}$/.test(c.id)&&Number(c.id.split('_')[1])===c.league&&Number.isInteger(c.exp)&&c.exp>Date.now()/1000&&c.exp<=Date.now()/1000+3660;
}
export async function issueTicket(id,league,expiresAt,secret){
 if(!secret)throw Error('Missing signing key');
 const claims={v:1,id,league,exp:Math.floor(Date.parse(expiresAt)/1000)};
 if(!valid(claims))throw Error('Invalid ticket scope');
 const body=encode(encoder.encode(JSON.stringify(claims)));
 return body+'.'+encode(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),message(body))));
}
export async function verifyTicket(token,secret){
 try{
  if(!secret||typeof token!=='string'||token.length>1024||!/^[-\w]+\.[-\w]+$/.test(token))return null;
  const [body,signature]=token.split('.');
  if(!await crypto.subtle.verify('HMAC',await key(secret),decode(signature),message(body)))return null;
  const claims=JSON.parse(new TextDecoder().decode(decode(body)));
  return valid(claims)?claims:null;
 }catch{return null;}
}
