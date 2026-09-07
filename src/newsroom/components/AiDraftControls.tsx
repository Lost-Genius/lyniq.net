"use client";
import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Button} from './Button';
import {Textarea} from './Textarea';
import {chatGptPrompt,labels,type ResearchSlot} from '../helpers/researchPolicy';
import type {Category} from '../helpers/aiDraftPolicy';
export function AiDraftControls({openDraft}:{openDraft:(id:number)=>void}){
  const qc=useQueryClient(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[prompt,setPrompt]=useState('');
  const q=useQuery<{enabled:boolean;slots:ResearchSlot[]}>({queryKey:['research'],queryFn:async()=>{const r=await fetch('/api/cron/drafts?view=1'),d=await r.json();if(!r.ok)throw new Error(d.error);return d;},retry:false});
  async function act(action:'prepare'|'refresh'|'create',category?:Category){
    setBusy(true);setMessage('');try{
      const r=await fetch('/api/cron/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,category})}),d=await r.json();
      if(!r.ok)throw new Error(d.error);
      if(action==='create'){await qc.invalidateQueries({queryKey:['admin']});openDraft(d.articleId);}
      else{qc.setQueryData(['research'],d);setMessage(!d.enabled?'Set DAILY_RESEARCH_ENABLED=true on the server to enable preparation.':d.slots.some((s:ResearchSlot)=>s.alreadyPrepared)?'Already Prepared: existing packets/drafts preserved.':'Research prepared from existing approved feed imports.');}
      if(action==='create')await qc.invalidateQueries({queryKey:['research']});
    }catch(e){setMessage(e instanceof Error?e.message:'Research action failed');}finally{setBusy(false);}
  }
  async function copy(slot:ResearchSlot){if(!slot.packet)return;const text=chatGptPrompt(slot.packet);try{await navigator.clipboard.writeText(text);setMessage('Copied. Paste into ChatGPT yourself; no account automation is used.');}catch{setPrompt(text);setMessage('Clipboard unavailable. Select and copy the prompt below.');}}
  return <section><h3>Daily research</h3><Button variant="outline" disabled={busy} onClick={()=>act('prepare')}>Prepare today’s research</Button><p>Free feed metadata only. No AI/API calls; articles are written through your own manual ChatGPT workflow.</p><p role="status">{message||q.error?.message}</p>{q.data?.slots.map(slot=><div key={slot.category}><h4>{labels[slot.category]} — {slot.articleId?'Draft Created':slot.packet?.status||'Not Prepared'}</h4>{slot.packet&&<><p>{slot.packet.topic}</p><p>{slot.packet.selectedBecause}</p><details><summary>View Sources</summary><p>{slot.packet.aggregation}</p><p>Research timestamp: {slot.packet.researchedAt}</p><p>Suggested tags: {slot.packet.tags.join(', ')}</p>{slot.packet.sources.map(source=><div key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.publication}: {source.title}</a><p>{source.publishedAt}</p><p>{source.snippet||'No snippet supplied.'}</p></div>)}<ul>{slot.packet.flags.map(flag=><li key={flag}>{flag}</li>)}</ul></details><Button variant="outline" disabled={busy} onClick={()=>copy(slot)}>Copy ChatGPT Draft Prompt</Button>{' '}</>}{slot.articleId?<Button variant="outline" disabled={busy} onClick={()=>openDraft(slot.articleId!)}>Open Draft</Button>:<><Button variant="outline" disabled={busy||!slot.packet?.sources.length} onClick={()=>act('create',slot.category)}>Create Draft</Button>{' '}<Button variant="outline" disabled={busy} onClick={()=>act('refresh',slot.category)}>Refresh Research</Button></>}</div>)}{prompt&&<label>Copy this prompt<Textarea readOnly value={prompt} onFocus={e=>e.target.select()}/></label>}</section>;
}
