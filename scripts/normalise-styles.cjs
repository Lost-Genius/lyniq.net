const fs=require('fs'),path=require('path'),postcss=require('postcss');
const root=path.resolve('src/newsroom');
function walk(dir){for(const name of fs.readdirSync(dir)){const p=path.join(dir,name);if(fs.statSync(p).isDirectory())walk(p);else if(p.endsWith('.css')){const css=postcss.parse(fs.readFileSync(p,'utf8'));css.walkAtRules('layer',rule=>{if(rule.params==='base')rule.replaceWith(...rule.nodes)});fs.writeFileSync(p,css.toString())}}}walk(root);
