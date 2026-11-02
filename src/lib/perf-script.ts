/**
 * Script inline exécuté avant le premier rendu : détermine le mode allégé
 * (mouvement réduit, économie de données, connexion lente, appareil modeste)
 * et l'expose via <html data-perf="lite|full">. Préférence forçable avec ?perf=lite|full.
 */
export const perfScript = `(function(){try{
var d=document.documentElement,n=navigator,c=n.connection||{},
rm=matchMedia('(prefers-reduced-motion: reduce)').matches,
coarse=matchMedia('(pointer: coarse)').matches,
mem=n.deviceMemory||8,cores=n.hardwareConcurrency||8,
lite=rm||c.saveData===true||/(^|-)(2g|3g)$/.test(c.effectiveType||'')||mem<=2||(coarse?cores<=4:cores<=2);
var q=new URLSearchParams(location.search).get('perf');
if(q==='lite'||q==='full'){lite=q==='lite';try{localStorage.setItem('ctf-perf',q)}catch(e){}}
else{try{var s=localStorage.getItem('ctf-perf');if(s==='lite'||s==='full')lite=s==='lite'}catch(e){}}
d.dataset.perf=lite?'lite':'full';if(rm)d.dataset.motion='reduced';
}catch(e){}})();`;
