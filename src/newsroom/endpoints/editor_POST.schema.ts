import {z} from 'zod';import superjson from 'superjson';export const schema=z.discriminatedUnion('action',[
z.object({action:z.literal('save'),id:z.number().int().positive().optional(),version:z.number().int().optional(),title:z.string().trim().min(5).max(240),excerpt:z.string().max(500),body:z.string().max(150000),section:z.enum(['Local','Caribbean','World','Business','Tech','Culture','Opinion']),status:z.enum(['draft','review','scheduled','published']),publishedAt:z.string().datetime().nullable(),featured:z.boolean()}),
z.object({action:z.literal('invite'),email:z.string().email().transform(x=>x.toLowerCase()),role:z.enum(['writer','editor'])}),
z.object({action:z.literal('role'),userId:z.number().int().positive(),role:z.enum(['writer','editor','remove'])}),
z.object({action:z.literal('source'),id:z.number().int().positive(),enabled:z.boolean(),rightsNote:z.string().min(20).max(2000)}),
z.object({action:z.literal('import')})]);
export type OutputType={ok:boolean,invitation?:string};export async function postEditor(body:z.infer<typeof schema>):Promise<OutputType>{const r=await fetch('/_api/editor',{method:'POST',headers:{'Content-Type':'application/json'},body:superjson.stringify(schema.parse(body))});const d=superjson.parse<any>(await r.text());if(!r.ok)throw new Error(d.error);return d;}
