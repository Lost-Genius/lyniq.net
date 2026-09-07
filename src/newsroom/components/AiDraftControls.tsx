"use client";
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './Button';
export function AiDraftControls() {
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const qc=useQueryClient();
  async function run(retry=false) {
    setBusy(true);setMessage('Researching today’s three categories. This may take up to three minutes…');
    try {
      const r=await fetch('/api/cron/drafts'+(retry?'?retry=failed':''),{method:'POST'}), d=await r.json();
      if(d.error)throw new Error(d.error);
      setMessage(!d.enabled?'AI drafting is disabled. Configure the server credentials first.':d.results.map((x:{category:string;status:string;error?:string;skipped?:boolean})=>`${x.category}: ${x.status}${x.skipped?' (existing run)':''}${x.error?' — '+x.error:''}`).join(' · '));
      await qc.invalidateQueries({queryKey:['admin']});
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to run drafting.')}finally{setBusy(false);}
  }
  return <div><Button variant="outline" disabled={busy} onClick={()=>run()}>Generate today’s 3 AI drafts</Button>{' '}<Button variant="outline" disabled={busy} onClick={()=>run(true)}>Retry failed slots once</Button><p role="status">{message||'One draft per category per Trinidad day. Generation uses a paid API; nothing is automatically published.'}</p></div>;
}
