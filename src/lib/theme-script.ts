/**
 * Script inline exécuté avant le premier rendu : choisit le thème clair/sombre
 * (localStorage « ctf-theme », sinon préférence système) et l'expose via
 * <html data-theme="light|dark">. Sombre par défaut en cas d'indisponibilité.
 */
export const themeScript = `(function(){try{
var s=localStorage.getItem('ctf-theme'),
t=(s==='light'||s==='dark')?s:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
document.documentElement.dataset.theme=t;
}catch(e){document.documentElement.dataset.theme='dark'}})();`;
