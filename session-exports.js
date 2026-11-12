(function(){
'use strict';
const getDraft=()=>typeof window.helloMoneyStudioGetDraft==='function'?window.helloMoneyStudioGetDraft():null;
const $=id=>document.getElementById(id);
const status=text=>{const x=$('studioDownloadStatus');if(x)x.textContent=text};
const load=(src,test)=>new Promise((resolve,reject)=>{if(test())return resolve();const existing=[...document.scripts].find(x=>x.src===src);if(existing){existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',()=>reject(Error('Export library could not load')),{once:true});return}const script=document.createElement('script');script.src=src;script.async=true;script.onload=()=>test()?resolve():reject(Error('Export library did not initialise'));script.onerror=()=>reject(Error('Unable to load the export library. Check your connection.'));document.head.append(script)});
const pptxSrc='https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
const pdfSrc='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
const colors={ink:'193A2B',green:'285E47',pale:'EFF6EA',gold:'D8B368',white:'FFFFFF',muted:'64766A'};
const filename=(x,ext)=>'hello-money-'+String(x.topic||'session').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)+'-draft.'+ext;
const limit=(s,n)=>{s=String(s||'').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s};
const font=()=> 'Noto Sans Malayalam';
const englishAudience={homemakers:'Neighbours and homemakers',youth:'Young first-salary earners',workers:'Workers and community members',seniors:'Older adults',mixed:'Mixed community'};
const meeting={in_person:'In-person community circle',remote_expert:'Local gathering + remote Expert',online:'Online (where needed)'};
let working=false;
function setBusy(v){working=v;for(const id of ['studioExportPptx','studioExportPdf']){const b=$(id);if(b)b.disabled=v}}
function addText(slide,text,x,y,w,h,opts={}){slide.addText(String(text||''),{x,y,w,h,fontFace:font(),fontSize:opts.fontSize||20,color:opts.color||colors.ink,bold:!!opts.bold,breakLine:false,margin:0.04,fit:'shrink',valign:'mid',...opts})}
function deckSlide(pptx,step,index,count){const slide=pptx.addSlide();slide.background={color:colors.white};slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:.16,h:7.5,line:{color:colors.green},fill:{color:colors.green}});
addText(slide,'HELLO MONEY  /  COMMUNITY LEARNING',.64,.31,7,.35,{fontSize:12,bold:true,color:colors.green});
addText(slide,'DRAFT · NOT APPROVED',9.52,.30,3.15,.35,{fontSize:10,bold:true,color:'995733',align:'right'});
addText(slide,step.title,.75,1.04,11.7,1.25,{fontSize:30,bold:true,color:colors.ink,valign:'middle'});
slide.addShape(pptx.ShapeType.rect,{x:.73,y:2.45,w:11.88,h:2.24,rectRadius:.14,line:{color:'DFEADD',width:1},fill:{color:colors.pale}});
addText(slide,limit(step.prompt,360),1.02,2.78,11.25,1.6,{fontSize:22,color:colors.ink,valign:'mid'});
addText(slide,'HOW TO FACILITATE',.78,5.01,11,.35,{fontSize:13,bold:true,color:colors.green});
addText(slide,limit(step.activity,280),.78,5.48,11.56,.94,{fontSize:17,color:colors.ink});
addText(slide,step.minute+' MIN  ·  '+step.duration+' MINUTES',.75,6.85,5,.32,{fontSize:11,bold:true,color:colors.muted});
addText(slide,'Hello Money · Community-first learning  •  '+index+'/'+count,7,6.85,5.6,.32,{fontSize:10,color:colors.muted,align:'right'});
return slide}
async function downloadPptx(){const x=getDraft();if(!x){status('Prepare a session draft first.');return}if(working)return;setBusy(true);status('Preparing your PowerPoint draft…');
try{await load(pptxSrc,()=>typeof window.pptxgen==='function');const pptx=new window.pptxgen();pptx.layout='LAYOUT_WIDE';pptx.author='Hello Money · Session Studio';pptx.subject='Financial literacy session · educational draft for review';pptx.title=x.englishTitle+' · Hello Money Session Studio · DRAFT';
pptx.lang=x.language==='Malayalam'?'ml-IN':'en-IN';pptx.theme={headFontFace:font(),bodyFontFace:font(),lang:'ml-IN'};
let slide=pptx.addSlide();slide.background={color:colors.pale};slide.addShape(pptx.ShapeType.rect,{x:0,y:0,w:.18,h:7.5,fill:{color:colors.green},line:{color:colors.green}});
addText(slide,'HELLO MONEY',.84,.66,5.7,.45,{fontSize:20,bold:true,color:colors.green});
addText(slide,'SESSION STUDIO  /  COMMUNITY LEARNING',.85,1.15,8.9,.35,{fontSize:12,color:colors.green,bold:true});
addText(slide,limit(x.title,100),.85,2.10,11.7,1.35,{fontSize:33,bold:true,color:colors.ink});
addText(slide,limit(x.englishTitle,150),.89,3.48,11.4,.58,{fontSize:19,color:colors.green});
addText(slide,'30 MINUTES  ·  '+(englishAudience[x.audience]||'Community members')+'  ·  '+(meeting[x.format]||'Community circle'),.87,4.62,11.5,.85,{fontSize:15,color:colors.ink});
slide.addShape(pptx.ShapeType.rect,{x:.84,y:5.94,w:11.5,h:.64,line:{color:'E9DABB'},fill:{color:'FDF5E6'}});
addText(slide,'DRAFT — NOT APPROVED FOR PUBLIC DELIVERY',1.04,6.05,10.8,.38,{fontSize:14,bold:true,color:'895C28'});
addText(slide,'A small conversation. One useful money idea.',.88,6.91,9,.27,{fontSize:11,color:colors.muted});
x.steps.forEach((step,i)=>deckSlide(pptx,step,i+2,x.steps.length+1));
await pptx.writeFile({fileName:filename(x,'pptx'),compression:true});status('PowerPoint downloaded. Review content and Malayalam typography before presenting.')}
catch(err){status('PowerPoint could not be exported: '+err.message)}
finally{setBusy(false)}}
function el(tag,text,style=''){const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(style)x.style.cssText=style;return x}
function buildPdf(x){const sheet=el('article');sheet.setAttribute('aria-label','Hello Money one-page draft learning takeaway');
sheet.style.cssText="box-sizing:border-box;width:794px;height:1120px;overflow:hidden;background:#fff;color:#193A2B;padding:50px 53px 39px;font-family:'Noto Sans Malayalam','Manjari','Arial',sans-serif;display:flex;flex-direction:column;gap:0;line-height:1.42;";
sheet.append(el('div','HELLO MONEY   /   COMMUNITY LEARNING', 'font-size:13px;font-weight:800;letter-spacing:1.15px;color:#285E47;margin-bottom:13px;'));
sheet.append(el('h1',limit(x.title,90),'font-size:27px;line-height:1.3;letter-spacing:-.2px;margin:0;color:#183C2D;'));
sheet.append(el('p',x.englishTitle+'  ·  '+x.language+'  ·  30-minute circle','font-size:12px;color:#5e7564;margin:9px 0 17px;'));
const note=el('div','DRAFT · NOT APPROVED FOR DISTRIBUTION','background:#fff6e5;color:#845a29;border:1px solid #efd9a8;border-radius:8px;padding:9px 12px;font-size:12px;font-weight:750;margin-bottom:20px;');sheet.append(note);
sheet.append(el('h2','നമുക്ക് ചിന്തിക്കാം · A little conversation','font-size:18px;margin:0 0 11px;color:#285E47;'));
const intro=el('div',limit(x.steps[0]?.prompt||'',280),'background:#eef7e9;border-radius:12px;padding:16px;font-size:16px;min-height:69px;box-sizing:border-box;margin-bottom:19px;');sheet.append(intro);
sheet.append(el('h2','മൂന്ന് ചെറിയ ആശയങ്ങൾ · Three ideas to explore','font-size:18px;margin:0 0 10px;color:#285E47;'));
const core=x.steps.slice(1,4);
core.forEach((s,i)=>{const row=el('div');row.style.cssText='display:flex;gap:13px;border-bottom:1px solid #e2ece0;padding:11px 0;min-height:89px;box-sizing:border-box;';
row.append(el('div',String(i+1),'width:31px;min-width:31px;height:31px;border-radius:50%;background:#e4f1e1;color:#295e47;display:grid;place-items:center;font-size:16px;font-weight:bold;'));
const t=el('div');t.style.cssText='flex:1;min-width:0';t.append(el('strong',limit(s.title,95),'font-size:15px;display:block;margin:0 0 4px;color:#203e2e;'));t.append(el('div',limit(s.prompt,190),'font-size:12.8px;color:#425c4c;line-height:1.55;'));row.append(t);sheet.append(row)});
sheet.append(el('h2','ഓർമ്മയിൽ വയ്ക്കാം · One idea to remember','font-size:18px;margin:19px 0 9px;color:#285E47;'));
sheet.append(el('div',limit(x.steps[4]?.prompt||'',270),'background:#f2f8ee;border-left:4px solid #4a8666;padding:13px 15px;font-size:14px;line-height:1.5;'));
sheet.append(el('div','Small step: Notice one everyday money choice this week. No need to share personal income, expenses or account details.','font-size:12px;color:#455c4b;margin-top:18px;'));
const bottom=el('div');bottom.style.cssText='margin-top:auto;padding-top:17px;border-top:1px solid #dfe9df;display:flex;align-items:end;justify-content:space-between;gap:10px;';
bottom.append(el('span','Hello Money  ·  Learn together. Pass it on.','font-size:12px;color:#285E47;font-weight:700;'));
bottom.append(el('span','Educational example only · Not financial advice','font-size:10px;color:#66766a;text-align:right;'));
sheet.append(bottom);
return sheet}
async function downloadPdf(){const x=getDraft();if(!x){status('Prepare a session draft first.');return}if(working)return;setBusy(true);status('Preparing the one-page PDF…');let sheet=null;
try{await load(pdfSrc,()=>typeof window.html2pdf==='function');sheet=buildPdf(x);sheet.style.position='fixed';sheet.style.left='0';sheet.style.top='0';sheet.style.zIndex='-10';sheet.style.pointerEvents='none';document.body.append(sheet);
if(document.fonts?.ready)await document.fonts.ready;
await window.html2pdf().set({margin:0,filename:filename(x,'pdf'),image:{type:'jpeg',quality:.96},html2canvas:{scale:1.8,useCORS:true,backgroundColor:'#FFFFFF',scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['avoid-all']}}).from(sheet).save();status('One-page PDF downloaded. Check Malayalam text and layout before printing or sharing.')}
catch(err){status('PDF export failed: '+err.message+'. You can still print the draft using the existing option.')}
finally{if(sheet)sheet.remove();setBusy(false)}}
const target=$('studioReviewActions');if(target){const box=document.createElement('div');box.id='studioDownloads';box.className='studio-panel';box.style.cssText='padding:16px;margin:17px 0;background:#f5faf3;border:1px solid #d8e7d5';
box.append(el('h3','Your session materials','font-size:20px;margin:0 0 6px;'));
box.append(el('p','A short editable presentation and a printable one-page learning takeaway. Both include a draft notice.','font-size:13px;color:#5a7061;margin:0 0 12px;'));
const actions=el('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;';
const ppt=document.createElement('button');ppt.id='studioExportPptx';ppt.className='studio-button';ppt.type='button';ppt.textContent='↓ Download PowerPoint (.pptx)';ppt.onclick=downloadPptx;
const pdf=document.createElement('button');pdf.id='studioExportPdf';pdf.className='studio-button alt';pdf.type='button';pdf.textContent='↓ Download one-page PDF';pdf.onclick=downloadPdf;actions.append(ppt,pdf);box.append(actions);
const progress=el('p','Exports require an internet connection to load file-generation libraries. Draft generation itself remains local.','font-size:12px;color:#60746a;margin:10px 0 0;');progress.id='studioDownloadStatus';progress.setAttribute('role','status');box.append(progress);target.insertAdjacentElement('afterend',box)}
Object.assign(window,{helloMoneyDownloadPptx:downloadPptx,helloMoneyDownloadPdf:downloadPdf});
})();