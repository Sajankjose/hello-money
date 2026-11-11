(function(){
'use strict';
const KEY='helloMoneyIapParticipantV22',EVENTS='helloMoneyIapV21';
const $=id=>document.getElementById(id);
let registry={};
try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');if(x&&typeof x==='object'&&!Array.isArray(x))registry=x}catch(e){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(registry))}catch(e){}};
const getEvent=id=>{try{const x=JSON.parse(localStorage.getItem(EVENTS)||'{}');return Array.isArray(x.events)?x.events.find(e=>String(e.id)===String(id)):null}catch(e){return null}};
const list=id=>Array.isArray(registry[id])?registry[id]:[];
const confirmed=id=>list(id).filter(r=>r.status==='joined');
const checked=id=>confirmed(id).filter(r=>r.checked);
const eligible=e=>e&&e.status==='approved'&&e.expertId&&e.expertName;
const style=document.createElement('style');
style.textContent='.rsvp-box{background:#f0f7e9;border:1px solid #d8e8d2;border-radius:16px;padding:19px;margin:16px 0}.rsvp-box h4{font-size:20px;margin:6px 0 10px}.rsvp-box p{color:#5b7060;font-size:13px}.rsvp-choice{display:flex;align-items:start;gap:10px;margin:13px 0}.rsvp-choice input{margin-top:5px;accent-color:#235846}.rsvp-btn{border:0;border-radius:25px;background:#235846;color:white;padding:12px 16px;min-height:44px;font-weight:750;margin:5px 7px 5px 0}.rsvp-btn.soft{background:#e1eddc;color:#235846}.rsvp-btn:disabled{opacity:.42}.rsvp-chip{display:inline-block;padding:5px 9px;border-radius:14px;background:#e1eddc;font-size:12px;color:#235846}.rsvp-row{padding:12px 0;border-bottom:1px solid #dae7d7}.rsvp-row b{display:block}.rsvp-row small{color:#607162}.rsvp-privacy{font-size:12px!important;color:#647669!important}';
document.head.append(style);
const styleButton=(label,click,soft=false)=>{const b=document.createElement('button');b.type='button';b.className='rsvp-btn'+(soft?' soft':'');b.textContent=label;b.onclick=click;return b};
const node=(type,text)=>{const x=document.createElement(type);x.textContent=text;return x};
const dynamic=document.createElement('div');dynamic.id='rsvpLearnerBox';dynamic.className='rsvp-box';dynamic.hidden=true;
const details=$('discDetailPanel');if(details)details.append(dynamic);
let lastId=null;
function current(){return lastId?getEvent(lastId):null}
function learner(event){if(!dynamic)return;lastId=null;dynamic.hidden=true;dynamic.replaceChildren();if(!event||!String(event.id).startsWith('iap-'))return;
const id=String(event.id).slice(4),stored=getEvent(id);if(!eligible(stored))return;
lastId=id;dynamic.hidden=false;
dynamic.append(node('span','LEARN WITH YOUR COMMUNITY · DEMO'),node('h4','Try the participant journey'));
const description=node('p','This is a fictional registration demonstration. No actual seat, ticket, participant identity or message is created.');dynamic.append(description);
const total=confirmed(id).length,capacity=Number(stored.seats)||0;
dynamic.append(node('p',total+' of '+capacity+' sample places added on this browser.'));
const consent=document.createElement('label');consent.className='rsvp-choice';const checkbox=document.createElement('input');checkbox.type='checkbox';consent.append(checkbox,node('span','I understand this is a fictional simulation and no real event is being booked.'));dynamic.append(consent);
const reminders=document.createElement('label');reminders.className='rsvp-choice';const reminderCheck=document.createElement('input');reminderCheck.type='checkbox';reminders.append(reminderCheck,node('span','Show me sample reminders for this activity (never send messages).'));dynamic.append(reminders);
const register=styleButton('Join the fictional participant list →',()=>{if(!checkbox.checked){feedback.textContent='Please confirm that you understand this is only a demonstration.';return}if(confirmed(id).length>=capacity){feedback.textContent='All sample places have been taken on this browser.';return}const entries=list(id).slice();const next=entries.reduce((a,x)=>Math.max(a,Number(x.num)||0),0)+1;entries.push({num:next,status:'joined',checked:false,reminders:reminderCheck.checked});registry[id]=entries;persist();learner({id:'iap-'+id});if(typeof iapRender==='function'&&demoRole==='friend')iapRender()});register.disabled=total>=capacity;
const feedback=node('p',total>=capacity?'Sample capacity reached. No new registrations are possible.':'No real names, phone numbers, email addresses or payment details are required.');
dynamic.append(register,feedback);
const mine=list(id).filter(x=>x.status==='joined');if(mine.length){dynamic.append(node('h4','Fictional participants on this device'));for(const r of mine){const row=document.createElement('div');row.className='rsvp-row';row.append(node('b','Demo guest '+r.num),node('small',r.checked?'Attendance checked in':r.reminders?'Sample reminder preview opted in':'No reminder preference'));const cancel=styleButton('Remove demo guest '+r.num,()=>{if(r.checked)return;registry[id]=list(id).map(x=>x.num===r.num?{...x,status:'cancelled'}:x);persist();learner({id:'iap-'+id})},true);cancel.disabled=r.checked;row.append(cancel);dynamic.append(row)}}}
function organizer(event,root){if(!event||!root||!['approved','completed','verified','paid'].includes(event.status))return;const box=document.createElement('div');box.className='rsvp-box';const id=String(event.id);
box.append(node('h4','Participant demo and check-in'),node('p','Sample joins '+confirmed(id).length+' / '+event.seats+' · Checked in '+checked(id).length+'. Only checked-in participants count toward completion.'));
if(event.status==='approved'&&(demoRole==='friend'||(demoRole==='dual'&&typeof helloMoneyHasCapability==='function'&&helloMoneyHasCapability('friend')))){if(!confirmed(id).length)box.append(node('p','There are no fictional registrations yet. Preview the learner-facing Circle to add some.'));for(const x of confirmed(id)){const row=document.createElement('div');row.className='rsvp-row';row.append(node('b','Demo guest '+x.num),node('small',x.checked?'Checked in · demo':x.reminders?'Reminder preview selected':'Not checked in'));const b=styleButton(x.checked?'Undo demo check-in':'Check in demo guest',()=>{if(!(demoRole==='friend'||(demoRole==='dual'&&typeof helloMoneyHasCapability==='function'&&helloMoneyHasCapability('friend'))))return;registry[id]=list(id).map(a=>a.num===x.num?{...a,checked:!a.checked}:a);persist();if(typeof iapRender==='function')iapRender()},true);row.append(b);box.append(row)}
const info=node('p','No attendance is verified or rewarded by this step. Admin reviews the summary separately.');box.append(info)}
if(event.status==='completed')box.append(node('p','Event completion has been submitted for Admin verification. Check-in editing is locked.'));
root.append(box)}
function count(id){return checked(String(id)).length}
function record(id){return {registered:confirmed(String(id)).length,checked:count(id)}}
Object.assign(window,{iapRsvpRender:learner,iapAttendancePanel:organizer,iapAttendanceCount:count,iapAttendanceSummary:record});
})();