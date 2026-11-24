'use strict';
window.CrusaderTowerMotion={
  directionalFrame(dx,dy,age,cooldown,aiming,mode='attack',time=0){
    const sx=dx-dy,sy=(dx+dy)*.5,column=sy<0?(sx<0?2:3):(sx<0?1:0);
    if(mode==='support')return {column,row:aiming?[1,2,3,2][Math.floor(time*4)%4]:0};
    const row=age>=0&&age<.18?3:age>=.18&&age<.40?1:!aiming?0:cooldown<=.25?2:cooldown<=.60?1:0;
    return {column,row};
  },
  cannonFrame(dx,dy,age,cooldown,aiming){
    const sx=dx-dy,sy=(dx+dy)*.5;
    const column=sy<0?(sx<0?2:3):(sx<0?1:0);
    // Fire only for a confirmed server event; readiness follows server cooldown.
    const row=age>=0&&age<.18?3:age>=.18&&age<.40?1:!aiming?0:cooldown<=.25?2:cooldown<=.60?1:0;
    return {column,row};
  }
};
