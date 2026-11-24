'use strict';
// Shared silhouettes, different materials and clothing. No duplicate rendering code.
const winter=JSON.parse(JSON.stringify(CrusaderAssets.theme));
winter.id='winter';winter.name='Kış Hisarı';
winter.terrain.floor={light:'#e2e8e8',dark:'#c3d1d4'};
delete winter.terrain.texture;
winter.terrain.wall={...winter.terrain.wall,base:'#869ca9',topLight:'#f4f8fa'};
winter.terrain.gate={...winter.terrain.gate,frame:'#a4b7c2',passage:'#203744'};
winter.towers.appearance={...winter.towers.appearance,helmet:'#95aebd',boots:'#334553'};
winter.enemies.appearance={...winter.enemies.appearance,cloth:'#dce7ed',mysticCloth:'#64758d',scoutCloth:'#728c98',wood:'#657b86'};
CrusaderAssets.registerTheme(winter);
