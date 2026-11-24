'use strict';
window.CrusaderAssets=(()=>{
  const themes=new Map(),factories=new Map(),listeners=new Set();
  let activeTheme;
  return {
    registerTheme(theme){
      if(!theme.id||!theme.terrain||!theme.towers||!theme.enemies)throw new Error('Eksik board tema tanımı.');
      themes.set(theme.id,theme);
      if(!activeTheme)activeTheme=theme;
    },
    registerRenderer(category,factory){factories.set(category,factory);},
    createRenderers(env){return Object.fromEntries([...factories].map(([category,factory])=>[category,factory(env)]));},
    get theme(){return activeTheme;},
    listThemes(){return [...themes.values()].map(({id,name})=>({id,name}));},
    setTheme(id){
      if(!themes.has(id))throw new Error(`Bilinmeyen board teması: ${id}`);
      activeTheme=themes.get(id);
      listeners.forEach(listener=>listener(activeTheme));
    },
    subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
    imageSource(key){return activeTheme.towers.images[key]?.url||'';},
    spriteKey(unit){return unit.kind==='tower'?activeTheme.towers.units[unit.type]?.sprite:activeTheme.towers.units[unit.color]?.sprite;}
  };
})();
