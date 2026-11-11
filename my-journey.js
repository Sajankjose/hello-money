(function(){
'use strict';
const $=id=>document.getElementById(id);
const PREFERENCE_KEY='helloMoneyJourneyPreferenceV19';
const VISIT_KEY='helloMoneyJourneyVisitV19';
const actions={
 'life':'moneylife',
 'lab':'virtual',
 'lesson':'learn',
 'questions':'learn'
};
const lessonNames=['Where does my money go?','Can I start saving with a little?','Can I trust this money message?','How much is safe to borrow?','What is investing, really?','How do I talk about money at home?'];
function read(key){try{const data=JSON.parse(localStorage.getItem(key)||'null');return data&&typeof data==='object'?data:null}catch(e){return null}}
function getSignal(){
 const learn=read('helloMoneyDemo')||{};
 const life=read('helloMoneyLifeV18')||{};
 const lab=read('helloMoneyVirtualV13')||{};
 const completed=Array.isArray(learn.completed)?[...new Set(learn.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<lessonNames.length))]:[];
 const lessonStarted=Array.isArray(learn.seen)&&learn.seen.length>0;
 const step=Number.isInteger(life.step)&&life.step>=0&&life.step<=3?life.step:0;
 const holdings=(Array.isArray(lab.purchases)?lab.purchases.length:0)+(Array.isArray(lab.deposits)?lab.deposits.length:0);
 const simulatedDays=Math.max(0,Number(lab.days)||0);
 const lifeStarted=step>0;
 const lessonCount=completed.length;
 const hasActivity=lifeStarted||lessonStarted||holdings>0||lessonCount>0||simulatedDays>0;
 let primary;
 if(lifeStarted&&step<3)primary={key:'life',title:'Continue your Money Life story',description:'You have finished '+step+' of 3 decisions. Your choices are waiting where you left off.',label:'Continue Money Life →'};
 else if(!lifeStarted&&lessonCount===0)primary={key:'lesson',title:'Start with one money question',description:'A short, everyday story is enough to begin.',label:'Explore one question →'};
 else if(!lifeStarted)primary={key:'life',title:'See how one decision changes your month',description:'Try three fictional money choices with no judgement or scores.',label:'Try Money Life →'};
 else if(holdings===0)primary={key:'lab',title:'Explore what happens to a virtual investment',description:'Compare deposits and imaginary market outcomes without risking real money.',label:'Open the virtual lab →'};
 else primary={key:'questions',title:'Understand one more everyday money question',description:'Return when you are curious. There is no deadline or streak.',label:'Explore another question →'};
 return {completed,lessonCount,lessonStarted,step,holdings,simulatedDays,hasActivity,primary,lifeStarted,lifeCompleted:step===3};
}
const style=document.createElement('style');
style.textContent='.journey-intro{padding:29px;background:#e9f4e2;border-radius:25px;margin:24px 0}.journey-intro h2{font-size:clamp(30px,4vw,44px);margin:10px 0}.journey-intro p{color:#53705c;max-width:700px}.journey-panel{background:#fff;border:1px solid #dce9d9;padding:23px;border-radius:21px;margin:17px 0}.journey-panel h3{font-size:24px;margin:7px 0 12px}.journey-panel p{color:#617366}.journey-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.journey-item{background:#f4f9f0;border-radius:15px;padding:17px}.journey-item b{display:block;font-size:16px;margin:8px 0 4px}.journey-item small{color:#617365}.journey-button{border:0;background:#235846;color:white;padding:12px 18px;min-height:44px;border-radius:25px;font-weight:750;margin:7px 8px 7px 0}.journey-button.soft{background:#e9f3e5;color:#235846}.journey-note{background:#fff8e9;border:1px solid #f1ddaf;border-radius:14px;padding:15px;margin:15px 0;font-size:13px}.journey-choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0}.journey-choice button{background:white;border:1px solid #dce9d9;color:#24533e;text-align:left;padding:14px;border-radius:14px;font-weight:700}.journey-choice button[aria-pressed=true]{border:2px solid #235846;background:#eaf5e5}.journey-home{background:#e8f3df;padding:17px;border-radius:17px;margin:17px auto;text-align:left;max-width:650px}.journey-home h3{font-size:20px;margin:8px 0}.journey-home p{font-size:13px;color:#607367}.journey-overview{background:#fff;border:1px solid #dce9d9;border-radius:18px;padding:17px;margin:16px 0}.journey-overview h3{margin:6px 0}.journey-overview p{color:#637567}@media(max-width:700px){.journey-grid,.journey-choice{grid-template-columns:1fr}.journey-intro,.journey-panel{padding:19px}}';
document.head.append(style);
const page=document.createElement('section');page.id='journey';page.className='screen page';page.hidden=true;
page.innerHTML='<div class="journey-intro"><span class="kicker">HELLO MONEY · MY JOURNEY</span><h2>Welcome back to your money questions. 💛</h2><p>One small discovery at a time. Pick up something you started, revisit an idea, or explore a new question. No deadlines and no streaks.</p><button class="journey-button soft" onclick="go(\'home\')">← Back to Home</button></div>'+
'<div class="journey-panel"><span class="kicker">ONE USEFUL NEXT STEP</span><h3 id="journeyNextTitle"></h3><p id="journeyNextDesc"></p><button class="journey-button" id="journeyNextAction" onclick="journeyContinue()"></button></div>'+
'<div class="journey-panel"><span class="kicker">WHAT YOU HAVE EXPLORED</span><h3>A few things you can return to</h3><div class="journey-grid" id="journeyCards"></div><details class="quiet-details"><summary>See completed money questions</summary><div id="journeyLessons"></div></details></div>'+
'<div class="journey-panel"><span class="kicker">COME BACK FOR WHAT MATTERS</span><h3>What would you like to understand next?</h3><p>Choose one area of curiosity. It stays private on this device and is not a financial profile.</p><div id="journeyPreferences" class="journey-choice"></div><p id="journeyPreferenceHint" aria-live="polite"></p></div>'+
'<div class="journey-note"><b>Private prototype progress:</b> Your lessons, virtual portfolio and Money Life decisions are saved separately in this browser. This page only reads those locally stored activities. They are not connected to an account or synchronised across devices. Other people using this device might see this sample progress. Never enter real financial details.</div>'+
'<div class="journey-panel"><details><summary>Manage this journey on this device</summary><p>Clearing the journey preference does not erase Money Life, Virtual Lab or lesson activity. Each learning tool has its own reset where available.</p><button class="journey-button soft" onclick="journeyForgetPreference()">Clear my selected curiosity</button></details></div>';
document.querySelector('main.shell').insertBefore(page,$('home'));
const homeCard=document.createElement('div');homeCard.id='journeyHomeCard';homeCard.className='journey-home';homeCard.hidden=true;
homeCard.innerHTML='<span class="kicker">WELCOME BACK</span><h3 id="journeyHomeTitle">Your money journey is here when you are.</h3><p id="journeyHomeDesc"></p><button class="journey-button" onclick="go(\'journey\')">Continue my journey →</button>';
const homeTarget=document.querySelector('.quiet-home .quiet-centre');if(homeTarget)homeTarget.append(homeCard);
const accountCard=document.createElement('div');accountCard.id='journeyAccountCard';accountCard.className='journey-overview';accountCard.hidden=true;
accountCard.innerHTML='<span class="kicker">MY LEARNING JOURNEY</span><h3 id="journeyAccountTitle">Your progress, at your own pace</h3><p id="journeyAccountDesc"></p><button class="journey-button" onclick="go(\'journey\')">View my journey →</button>';
const accountHero=document.querySelector('#account .quiet-dashboard');if(accountHero)accountHero.insertAdjacentElement('afterend',accountCard);
const prefOptions=[
 {id:'everyday',name:'Everyday spending & saving',hint:'Try a money question or replay Money Life.'},
 {id:'investing',name:'Investing without confusion',hint:'Explore the fictional investing lab and compare risks.'},
 {id:'safety',name:'Staying safe from scams',hint:'Explore fraud awareness and how to protect sensitive details.'},
 {id:'sharing',name:'Talking to others about money',hint:'Explore a Money Circle or a conversation at home.'}
];
let preference='';try{const p=localStorage.getItem(PREFERENCE_KEY);if(prefOptions.some(x=>x.id===p))preference=p}catch(e){}
let lastVisit=null;try{lastVisit=localStorage.getItem(VISIT_KEY)}catch(e){}
const dateToday=new Date().toISOString().slice(0,10);
try{localStorage.setItem(VISIT_KEY,dateToday)}catch(e){}
let currentPrimary=null;
function paintCards(signal){const el=$('journeyCards');el.replaceChildren();
 const cards=[
  {heading:'Money Life',state:signal.step===3?'Completed one story':signal.step>0?'In progress · '+signal.step+' of 3':'Ready to explore',detail:'Everyday money decisions',dest:'moneylife'},
  {heading:'Virtual Investing Lab',state:signal.holdings>0?signal.holdings+' fictional investments/deposits':'Ready to explore',detail:signal.holdings>0?'Return to your fictional portfolio':'Compare FD, RD and market outcomes',dest:'virtual'},
  {heading:'Money questions',state:signal.lessonCount+' completed',detail:'Learn something useful in your own time',dest:'learn'}
 ];
 for(const c of cards){const tile=document.createElement('div');tile.className='journey-item';const h=document.createElement('b');h.textContent=c.heading;const status=document.createElement('small');status.textContent=c.state;const p=document.createElement('p');p.textContent=c.detail;const b=document.createElement('button');b.className='journey-button soft';b.textContent='Open →';b.onclick=()=>go(c.dest);tile.append(h,status,p,b);el.append(tile)}
 const lessons=$('journeyLessons');lessons.replaceChildren();if(!signal.completed.length){lessons.textContent='Nothing completed yet. There is no minimum amount of learning.';return}for(const index of signal.completed){const p=document.createElement('p');p.textContent='✓ '+lessonNames[index];lessons.append(p)}
}
function paintPreferences(){const container=$('journeyPreferences');container.replaceChildren();for(const option of prefOptions){const b=document.createElement('button');b.textContent=option.name;b.setAttribute('aria-pressed',String(preference===option.id));b.onclick=()=>{preference=option.id;try{localStorage.setItem(PREFERENCE_KEY,preference)}catch(e){}paintPreferences()};container.append(b)}$('journeyPreferenceHint').textContent=preference?prefOptions.find(x=>x.id===preference).hint:'No choice needed. You can explore freely.'}
function choosePrimary(signal){if(signal.lifeStarted&&signal.step<3)return signal.primary;if(!signal.hasActivity)return signal.primary;if(preference==='investing'&&signal.holdings===0)return{key:'lab',title:'Explore investing with pretend money',description:'See why deposits and market-linked instruments behave differently.',label:'Explore virtual investing →'};if(preference==='safety')return{key:'questions',title:'Learn a little more about money safety',description:'A small practical question can help you recognise financial scams.',label:'Explore safety questions →'};if(preference==='sharing')return{key:'questions',title:'Explore how money conversations can help',description:'Choose a money question to discuss with someone you trust.',label:'Explore money questions →'};return signal.primary}
function updateHome(){const signal=getSignal();homeCard.hidden=!signal.hasActivity;if(!signal.hasActivity)return;$('journeyHomeTitle').textContent=signal.step>0&&signal.step<3?'You have an unfinished Money Life story.':'Your money journey is here when you are.';$('journeyHomeDesc').textContent=signal.step>0&&signal.step<3?'Continue from decision '+(signal.step+1)+' of 3. Your earlier choices are saved.':'Revisit a fictional portfolio, a completed question or a new idea whenever you like.'}
function updateAccount(){const signal=getSignal();accountCard.hidden=typeof demoRole==='undefined'||demoRole!=='learner';if(accountCard.hidden)return;$('journeyAccountTitle').textContent=signal.hasActivity?'Continue where you left off':'Your journey starts with one small question';$('journeyAccountDesc').textContent=signal.step>0&&signal.step<3?'Money Life: '+signal.step+' of 3 moments completed.':signal.lessonCount+' completed questions · '+signal.holdings+' fictional lab entries. No streaks or deadlines.'}
function render(){const signal=getSignal();currentPrimary=choosePrimary(signal);$('journeyNextTitle').textContent=currentPrimary.title;$('journeyNextDesc').textContent=currentPrimary.description;$('journeyNextAction').textContent=currentPrimary.label;paintCards(signal);paintPreferences();updateHome();updateAccount()}
function continueNext(){if(!currentPrimary)render();go(actions[currentPrimary.key]||'learn')}
function forgetPreference(){preference='';try{localStorage.removeItem(PREFERENCE_KEY)}catch(e){}paintPreferences();render()}
const formerGo=go;go=function(page){formerGo(page);if(page==='journey')render();else if(page==='home')updateHome()};
const formerAccount=accountRender;accountRender=function(){formerAccount();updateAccount()};
Object.assign(window,{journeyRender:render,journeyContinue:continueNext,journeyForgetPreference:forgetPreference});
updateHome();
if(new URLSearchParams(location.search).get('journey')==='1')go('journey');
})();