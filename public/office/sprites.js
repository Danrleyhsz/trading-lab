// Original DOM presentation. Art frames have no work/event capability.
(() => {
  const source=Object.freeze({width:1774,height:887,sha256:'d6b3d7bc139b230846e337a96d89a8e3c407a3384de463ad334a3fc6900ca518'});
  // Alpha bounds audited from the actual PNG, not assumed uniform cells.
  const frames={
    atlas:{x:220,y:17,w:205,h:420},
    euler:{x:598,y:19,w:203,h:418},
    nova:{x:930,y:35,w:277,h:402},
    sentinel:{x:1350,y:17,w:193,h:420},
    satoshi:{x:217,y:451,w:203,h:423},
    flux:{x:591,y:455,w:206,h:419},
    vega:{x:957,y:468,w:218,h:406},
    oracle:{x:1336,y:469,w:234,h:405}
  };
  for(const frame of Object.values(frames))Object.freeze(frame);Object.freeze(frames);
  const sheets=globalThis.OfficeSpriteSheets||{},directions=Object.freeze(['down','left','right','up']);
  function paint(element,id,directional=false){
    if(!Object.hasOwn(frames,id)){
      element.hidden=true;delete element.dataset.sprite;delete element.dataset.rig;element.replaceChildren();return false;
    }
    const frame=frames[id],sheet=directional&&Object.hasOwn(sheets,id)?sheets[id]:null;
    const rig=sheet?'directional':'portrait',same=element.dataset.sprite===id&&element.dataset.rig===rig;
    element.hidden=false;element.dataset.sprite=id;element.dataset.rig=rig;
    const variables={
      '--atlas-width':source.width/frame.h,'--atlas-height':source.height/frame.h,
      '--atlas-x':(source.width/2-frame.x-frame.w/2)/frame.h,'--atlas-y':-frame.y/frame.h
    };
    element.setAttribute('style',Object.entries(variables).map(([key,value])=>key+':'+value).join(';'));
    if(same)return true;
    element.replaceChildren();
    if(sheet)for(const [row,direction] of directions.entries())for(let column=0;column<5;column++){
      const bounds=sheet.frames[row*6+column],part=document.createElement('span');
      part.className='sprite-frame';part.dataset.direction=direction;part.dataset.frame=String(column);
      part.setAttribute('aria-hidden','true');
      const variables={
        '--frame-width':bounds.w/sheet.referenceHeight,'--frame-height':bounds.h/sheet.referenceHeight,
        '--frame-x':-bounds.x/sheet.referenceHeight,'--frame-y':-bounds.y/sheet.referenceHeight,
        '--frame-offset':(bounds.x+bounds.w/2-bounds.pivotX)/sheet.referenceHeight,
        '--sheet-width':sheet.width/sheet.referenceHeight,'--sheet-height':sheet.height/sheet.referenceHeight,
        '--frame-index':Math.max(0,column-1)
      };
      part.setAttribute('style','background-image:url("/office/characters/'+id+'.png");'+Object.entries(variables).map(([key,value])=>key+':'+value).join(';'));
      element.append(part);
    }
    return true;
  }
  globalThis.OfficeSprites={source,frames,sheets,directions,paint};
})();
