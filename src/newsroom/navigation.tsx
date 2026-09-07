"use client";
import React from 'react';import NextLink from 'next/link';import {usePathname,useSearchParams as useNextSearchParams,useRouter,useParams as useNextParams} from 'next/navigation';
export function Link({to,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>&{to:string}){return <NextLink href={to} {...props}>{children}</NextLink>}
export function useNavigate(){const router=useRouter();return (to:string)=>router.push(to)}
export function useParams(){return useNextParams<Record<string,string>>()}
export function useSearchParams():[URLSearchParams,(value:URLSearchParams|Record<string,string>,options?:{replace?:boolean})=>void]{const current=useNextSearchParams();const pathname=usePathname();const router=useRouter();return [new URLSearchParams(current.toString()),(value,options)=>{const p=new URLSearchParams(value);const url=pathname+(p.size?'?'+p.toString():'');if(options?.replace)window.history.replaceState(null,'',url);else window.history.pushState(null,'',url)}];}
export function useLocation(){const pathname=usePathname();const [hash,setHash]=React.useState('');React.useEffect(()=>{const sync=()=>setHash(window.location.hash);sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[pathname]);return React.useMemo(()=>({pathname,hash}),[pathname,hash]);}
