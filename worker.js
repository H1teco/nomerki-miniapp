/* Номерки — сервер игры. Cloudflare Worker + D1. Секрет: BOT_TOKEN. Привязка D1: DB. */
const rnd=n=>Math.floor(Math.random()*n), pick=a=>a[rnd(a.length)], R=(a,b)=>a+rnd(b-a+1);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const BONUS=1500, START_COINS=20000, SELL=.8;
const RAR=[{n:'Обычный'},{n:'Необычный'},{n:'Редкий'},{n:'Эпичный'},{n:'Легендарный'},{n:'Мифический'}];
/* рулетки: цена, нижняя граница качества и шансы [обычный … мифический] */
const TIERS=[
  {n:'Обычная',price:1000,note:'любые номера',w:[88,9,2.4,.5,.09,.01]},
  {n:'Редкая',price:2500,note:'от необычных',w:[0,90,8,1.6,.35,.05]},
  {n:'Эпическая',price:6000,note:'от редких',w:[0,0,90,8.3,1.5,.2]},
  {n:'Элитная',price:15000,note:'от эпичных',w:[0,0,0,88,10.5,1.5]},
  {n:'Легендарная',price:38000,note:'от легендарных',w:[0,0,0,0,95,5]}
];
const W_MARKET=[40,28,18,9,4,1];
const rg=(codes,name,m)=>codes.map(c=>[c,name,m]);
const C={
  KZ:{name:'Казахстан',reg:[['01','Астана',1.6],['02','Алматы',1.6],['03','Акмолинская обл.',1],['04','Актюбинская обл.',1],['05','Алматинская обл.',1],['06','Атырауская обл.',1.05],['07','ЗКО',1],['08','Жамбылская обл.',1],['09','Карагандинская обл.',1.05],['10','Костанайская обл.',1.05],['11','Кызылординская обл.',1],['12','Мангистауская обл.',1.05],['13','Туркестанская обл.',1],['14','Павлодарская обл.',1],['15','СКО',1],['16','ВКО',1],['17','Шымкент',1.3],['18','Абай',1],['19','Жетісу',1],['20','Ұлытау',1]]},
  RU:{name:'Россия',reg:[
    ['777','Москва',1.8],['77','Москва',1.6],['97','Москва',1.5],['99','Москва',1.5],['797','Москва',1.5],['177','Москва',1.4],['197','Москва',1.4],['199','Москва',1.4],
    ['78','Санкт-Петербург',1.5],['98','Санкт-Петербург',1.4],['178','Санкт-Петербург',1.3],['198','Санкт-Петербург',1.3],
    ['50','Московская обл.',1.2],['90','Московская обл.',1.2],['150','Московская обл.',1.1],['190','Московская обл.',1.1],['750','Московская обл.',1.1],
    ['23','Краснодарский край',1.2],['93','Краснодарский край',1.1],['123','Краснодарский край',1.1],
    ['16','Татарстан',1.1],['116','Татарстан',1.05],['02','Башкортостан',1.05],['102','Башкортостан',1],
    ['52','Нижегородская обл.',1],['152','Нижегородская обл.',1],['66','Свердловская обл.',1.05],['96','Свердловская обл.',1],['196','Свердловская обл.',1],
    ['74','Челябинская обл.',1],['174','Челябинская обл.',1],['54','Новосибирская обл.',1.05],['154','Новосибирская обл.',1],
    ['61','Ростовская обл.',1.05],['161','Ростовская обл.',1],['24','Красноярский край',1],['124','Красноярский край',1],
    ['38','Иркутская обл.',1],['138','Иркутская обл.',1],['25','Приморский край',1],['125','Приморский край',1],
    ['63','Самарская обл.',1],['163','Самарская обл.',1],['59','Пермский край',1],['159','Пермский край',1],
    ['36','Воронежская обл.',1],['136','Воронежская обл.',1],['22','Алтайский край',1.05],['10','Карелия',1],['39','Калининградская обл.',1],['91','Калининградская обл.',1]]},
  UA:{name:'Украина',reg:[['KA','Киев',1.5],['AA','Киев',1.6],['AI','Киевская обл.',1.1],['AX','Харьков',1.2],['BH','Одесса',1.2],['BC','Львов',1.2],['AE','Днепр',1.15],['AB','Винницкая обл.',1],['BE','Николаевская обл.',1],['BI','Полтавская обл.',1],['CE','Черновцы',1],['AT','Ивано-Франковская обл.',1]]},
  BY:{name:'Беларусь',reg:[['7','Минск',1.5],['8','Минск',1.5],['5','Минская обл.',1.1],['1','Брестская обл.',1],['2','Витебская обл.',1],['3','Гомельская обл.',1],['4','Гродненская обл.',1],['6','Могилёвская обл.',1]]}
};
const CAP={KZ:['01','02'],RU:['777','77','97','99','797','177','197','199','78','98','178','198'],UA:['AA','KA'],BY:['7','8']};
/* серии букв: g2 — популярные, g3 — статусные и региональные, g4 — тройные и «служебные» */
const CMB={
  KZ:{n:3,L:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    g2:['MAX','TOP','ROK','DOM','BAR','MIR','LUX','KIA','TAX','BAX','VAZ','UAZ','GAZ'],
    g3:['BOP','BMW','AMG','VIP','MER','AMR','KAZ','ALA','AST','NUR'],
    g4:['AAA','BBB','CCC','DDD','EEE','FFF','HHH','LLL','MMM','NNN','OOO','PPP','RRR','SSS','TTT','UUU','VVV','XXX','YYY','ZZZ']},
  RU:{n:3,L:'АВЕКМНОРСТУХ',
    g2:['КОТ','ТОР','РОК','МАК','СОМ','КАМ','ТОК','СОН','НЕТ','ТАХ','ВАХ','МАХ','РСО','ООН','МРТ'],
    g3:['ВОР','ХАМ','МЕР','ААС','ААО','ААК','ААР','СКС','КРК','АРО','КРА','АММ','АМО','ЕРЕ','ААМ','ООМ','ОТТ','СКР'],
    g4:['АМР','ЕКХ','ММР','ВМР','ААА','ООО','УУУ','ССС','МММ','ЕЕЕ','РРР','ННН','ТТТ','ХХХ','ВВВ']},
  UA:{n:2,L:'ABCEHIKMOPTX',g2:['OK','AM','TO','MA','PO','HI','KO','XO','EX']},
  BY:{n:2,L:'ABEIKMHOPCTX',g2:['OK','AM','TO','MA','PO','KA','XO','EX','HI'],g4:['AA','MM','XX','OO']}
};
/* комбинации, которые в Казахстане не выдаются: исключаем из случайной генерации */
const KZ_BAN=new Set('AAM BOK CEX FBP HER KAL KOT MAL SOR SOP SOS SEX USA XER XYE ZEK GEY GEI GAY JID GON GAD CON QUM GOD EBI EPT IIM GOS IIN QAS OON XUI HUY ISK HYI QYS XUY JUN BOQ QUL SIK QAN SYK JUT QOR QYQ QOI TYQ JOI JMI JYN GAI IBU VOR EBU BOP FUK FAK FUC FAC IOX IOH LOX LOH COX KOX FBR POX KNB MVD OPG EBR AMM SGL ASS HAX NAX'.split(' '));
/* пары (качество цифр, качество букв) для итогового качества номера; у высоких обе части — комбинации */
const PAIRS=[
  [[0,0]],
  [[1,0],[0,1],[1,1]],
  [[2,0],[0,2],[2,1],[1,2]],
  [[3,1],[1,3],[2,2]],
  [[3,2],[2,3],[3,3],[4,2],[2,4]],
  [[4,3],[3,4],[4,4]]
];

/* ---------- генератор номеров ---------- */
function wpick(w){let t=w.reduce((a,b)=>a+b),x=Math.random()*t;for(let i=0;i<w.length;i++){if(w[i]>0&&(x-=w[i])<0)return i}for(let i=w.length-1;i>=0;i--)if(w[i]>0)return i;return 0}
const isSeq=s=>{const d=[...s].map(Number),df=d.slice(1).map((x,i)=>x-d[i]);return df.every(x=>x===1)||df.every(x=>x===-1)};
function distinct(n){const a=[0,1,2,3,4,5,6,7,8,9];for(let i=9;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,n).join('')}
const other=(a,lo,hi)=>{let b;do b=R(lo,hi);while(b===a);return b};
const Z3=['001','002','003','004','005','006','007','008','009'];
const Z4=['0002','0003','0004','0005','0008','0009'];
const SEQ3=['123','234','345','456','567','678','789','321','432','543','654','765','876'];
const SEQ4=['1234','2345','3456','4567','5678','6789','4321','5432','6543','7654','8765','0123'];
const D3_4=[...Z3,'777','888','999'], D4_4=['0001','0007','7777'];
const D3_3=['100','200','300','400','500','600','700','800','900','111','222','333','444','555','666'];
const D4_3=['1111','2222','3333','4444','5555','8888','9999',...Z4,'0777'];
/* качество цифр: 4 — элитные, 3 — круглые/ровные, 2 — красивые нули, лесенки, 1 — пары, зеркала */
function digitsFor(r,n){
  if(n===3){
    if(r===4)return pick(D3_4);
    if(r===3)return pick(D3_3);
    if(r===2)return pick(['010','020','030','040','050','060','070','080','090','707','077',...SEQ3]);
    if(r===1){const t=rnd(3);
      if(t===0){let a,b;do{a=R(1,9);b=other(a,0,9)}while(a===7&&b===0);return ''+a+b+a}
      if(t===1){const a=R(1,9),b=other(a,0,9);return ''+a+a+b}
      const b=R(1,9),a=other(b,0,9);return ''+a+b+b}
  }else{
    if(r===4)return pick(D4_4);
    if(r===3)return pick(D4_3);
    if(r===2){const t=rnd(3);
      if(t===0){const a=R(1,9),b=other(a,0,9);return ''+a+a+b+b}
      if(t===1){const a=R(1,9),b=other(a,0,9);return ''+a+b+b+a}
      return pick(SEQ4)}
    if(r===1){const t=rnd(4);
      if(t===0){const x=R(1,9),y=other(x,0,9);return '00'+x+y}
      if(t===1){const a=R(1,9),b=other(a,0,9),c=other(b,0,9);return ''+a+a+b+c}
      if(t===2){const c=R(1,9),b=other(c,0,9),a=R(1,9);return ''+a+b+c+c}
      return pick(['0006','6666',''+R(1,9)+R(1,9)+'00'])}
  }
  let s;do s=distinct(n);while(isSeq(s));return s;
}
function digitTag(d){
  if(D3_4.includes(d)||D4_4.includes(d)||d==='0777')return 'Элитные цифры';
  if(new Set(d).size===1)return d.length===3?'Тройка':'Четвёрка';
  if(/^[1-9]00$/.test(d))return 'Круглая сотня';
  if(d.length===4&&/^000\d$/.test(d))return 'Нули впереди';
  if(['0123','1234'].includes(d)||isSeq(d))return 'Лесенка';
  if(d===[...d].reverse().join(''))return 'Зеркало';
  if(/^(\d\d)\1$/.test(d))return 'Повтор';
  if(/(\d)\1(\d)\2/.test(d))return 'Две пары';
  if(/^0[1-9]0$/.test(d)||d==='707'||d==='077')return 'Красивые нули';
  if(/^00\d\d$/.test(d))return 'Два нуля';
  if(/(\d)\1/.test(d))return 'Пара';
  if(/00$/.test(d))return 'Круглый';
  return null;
}
const dup=s=>new Set(s).size<s.length;
const allLists=c=>[CMB[c].g2,CMB[c].g3,CMB[c].g4].filter(Boolean).flat();
const banned=(c,s)=>(c==='KZ'&&KZ_BAN.has(s))||(c==='RU'&&s.includes('ХУ'));
const special=(c,s)=>dup(s)||allLists(c).includes(s)||banned(c,s);
const randL=(c,n)=>{const L=[...CMB[c].L];return Array.from({length:n},()=>pick(L)).join('')};
function plainL(c,n,not){let s;do s=randL(c,n);while(special(c,s)||s===not);return s}
function dupL(c,n,excl){
  excl=excl||[];let s;
  do{const L=[...CMB[c].L],x=pick(L),y=pick(L);s=n===2?x+x:pick([x+x+y,x+y+y,x+y+x])}
  while(!dup(s)||(n===3&&new Set(s).size!==2)||excl.includes(s)||allLists(c).includes(s)||banned(c,s));
  return s;
}
const nice=v=>v<1000?Math.round(v/10)*10:v<10000?Math.round(v/50)*50:v<100000?Math.round(v/500)*500:Math.round(v/1000)*1000;
/* ---------- оценка: единица × цифры × буквы × регион ---------- */
const UNIT=600;
const LMULT=[1,1.5,2.6,5,10];
const ELITE_M={'777':22,'888':20,'999':18,'0001':28,'0007':26,'7777':40,'0777':16};
/* границы редкости по оценке: ниже первой — обычный, выше последней — мифический */
const TH=[1500,3600,9000,22000,60000];
const rarOf=v=>{let r=0;while(r<TH.length&&v>=TH[r])r++;return r};
function digitMult(d){
  const n=d.length,t=digitTag(d);
  switch(t){
    case 'Элитные цифры':return ELITE_M[d]||(/^00[1-9]$/.test(d)?12:14);
    case 'Тройка':return 8;
    case 'Четвёрка':return 14;
    case 'Круглая сотня':return 6;
    case 'Нули впереди':return 8;
    case 'Лесенка':return n===3?4.5:7;
    case 'Зеркало':return n===3?1.8:2.4;
    case 'Повтор':return 2.2;
    case 'Две пары':return 2;
    case 'Красивые нули':return 3;
    case 'Два нуля':return 2.8;
    case 'Пара':return 1.3;
    case 'Круглый':return 2.4;
    default:return 1;
  }
}
function makePlate0(c,g){
  const [gd,gl]=pick(PAIRS[g]);
  const m=CMB[c],RG=C[c].reg,n=(c==='UA'||c==='BY')?4:3,caps=CAP[c];
  let reg,L,lt=null;
  if(c==='UA'){
    const cp=RG.filter(r=>caps.includes(r[0])),non=RG.filter(r=>!caps.includes(r[0]));
    reg=gl===4?pick(cp):gl===3?pick(non):pick(RG);
    const pre=reg[0];
    if(gl>=3){L=pre;lt='Буквы как у региона'}
    else if(gl===2){L=pick(m.g2);lt='Серия '+L}
    else if(gl===1){L=dupL(c,2,[pre]);lt='Двойные буквы'}
    else L=plainL(c,2,pre);
  }else if(c==='BY'){
    const cp=RG.filter(r=>caps.includes(r[0])),non=RG.filter(r=>!caps.includes(r[0]));
    reg=gl>=3?pick(cp):gl===1?pick(non):pick(RG);
    if(gl===4){L=pick(m.g4);lt='Серия '+L}
    else if(gl===3){L=dupL(c,2,m.g4);lt='Минск · двойные буквы'}
    else if(gl===2){L=pick(m.g2);lt='Серия '+L}
    else if(gl===1){L=dupL(c,2,m.g4);lt='Двойные буквы'}
    else L=plainL(c,2);
  }else{
    const cp=RG.filter(r=>caps.includes(r[0]));
    reg=(g>=4&&Math.random()<.6)?pick(cp):pick(RG);
    if(gl>=2){L=pick(gl===4?m.g4:gl===3?m.g3:m.g2);lt='Серия '+L}
    else if(gl===1){L=dupL(c,3);lt='Двойные буквы'}
    else L=plainL(c,3);
  }
  const d=digitsFor(gd,n);
  const p={id:uid(),c,rar:g,d,reg:reg[0],regName:reg[1]};
  if(c==='KZ')p.l=L;
  if(c==='RU'){p.l1=L[0];p.l2=L.slice(1)}
  if(c==='UA'){p.pre=reg[0];p.suf=L}
  if(c==='BY')p.l=L;
  p.tags=[gd>0?digitTag(d):null,lt,reg[2]>=1.4?'Столичный регион':null].filter(Boolean);
  const dm=digitMult(d),lm=LMULT[gl]||1,rm=reg[2];
  p.mx=[dm,lm,rm];
  p.v=nice(UNIT*dm*lm*rm*(.95+Math.random()*.15));
  return p;
}
/* редкость = диапазон оценки: подбираем номер, чья оценка попала в нужный диапазон (после 40 попыток — подгоняем оценку к краю) */
function makePlate(c,g){
  let p;
  for(let i=0;i<40;i++){p=makePlate0(c,g);if(rarOf(p.v)===g)return p}
  const lo=g===0?100:TH[g-1],hi=g>=TH.length?Infinity:TH[g]-1;
  p.v=Math.min(Math.max(p.v,lo),hi);p.rar=g;return p;
}
function rollPlate(country,w){
  const c=country==='ALL'?pick(['KZ','RU','UA','BY']):country;
  return makePlate(c,wpick(w));
}
/* текст номера для сообщений */
function plateText(p){
  if(p.c==='KZ')return `${p.d} ${p.l} ${p.reg}`;
  if(p.c==='RU')return `${p.l1}${p.d}${p.l2} ${p.reg}`;
  if(p.c==='UA')return `${p.pre} ${p.d} ${p.suf}`;
  return `${p.d} ${p.l}-${p.reg}`;
}

/* ================= API ================= */
const COMM=5, LOT_TTL=864e5, MAX_LOTS=10, DAY=864e5;
/* сутки считаем по Астане (UTC+5) */
const TZ=5*36e5, dayNum=t=>Math.floor((t+TZ)/DAY), dayEnd=t=>(dayNum(t)+1)*DAY-TZ;
/* серия: 7 дней, на седьмой — главный приз */
const REWARDS=[5000,7500,10000,15000,20000,30000,100000];
/* колесо: [приз, вес]; порядок = порядок секторов на экране */
const WHEEL=[[500,28],[4000,8],[1000,24],[15000,3.5],[1500,18],[7500,5],[2500,12],[50000,1.5]];
const WEBAPP='https://h1teco.github.io/nomerki-miniapp/';
const TG=env=>env.TG_API||'https://api.telegram.org';
const ORIGINS=['https://h1teco.github.io'];
/* обязательная подписка на канал */
const CHANNEL_URL='https://t.me/layerplates';
const chanOf=env=>env.CHANNEL||'@layerplates';
const DDL=[
 `CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT,coins INTEGER NOT NULL,spins INTEGER NOT NULL DEFAULT 0,bonus_at INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,seen INTEGER NOT NULL DEFAULT 0,banned INTEGER NOT NULL DEFAULT 0)`,
 `CREATE TABLE IF NOT EXISTS plates(id TEXT PRIMARY KEY,owner INTEGER NOT NULL,st TEXT NOT NULL DEFAULT 'own',c TEXT NOT NULL,rar INTEGER NOT NULL,v INTEGER NOT NULL,data TEXT NOT NULL,created INTEGER NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS plates_owner ON plates(owner)`,
 `CREATE TABLE IF NOT EXISTS lots(id TEXT PRIMARY KEY,plate_id TEXT NOT NULL,seller INTEGER NOT NULL,seller_name TEXT,price INTEGER NOT NULL,st TEXT NOT NULL DEFAULT 'active',settled INTEGER NOT NULL DEFAULT 0,buyer INTEGER,buyer_name TEXT,created INTEGER NOT NULL,expires INTEGER NOT NULL,sold_at INTEGER,c TEXT,rar INTEGER,v INTEGER)`,
 `CREATE INDEX IF NOT EXISTS lots_active ON lots(st,c)`,
 `CREATE INDEX IF NOT EXISTS lots_seller ON lots(seller,st)`,
 `CREATE TABLE IF NOT EXISTS issued(k TEXT PRIMARY KEY,ts INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS promos(code TEXT PRIMARY KEY,coins INTEGER NOT NULL,max INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0,expires INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS promo_uses(code TEXT NOT NULL,user INTEGER NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(code,user))`,
 `CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v TEXT)`,
 `CREATE TABLE IF NOT EXISTS refs(user INTEGER PRIMARY KEY,ref INTEGER NOT NULL,at INTEGER NOT NULL,paid INTEGER NOT NULL DEFAULT 0)`,
 `CREATE INDEX IF NOT EXISTS refs_ref ON refs(ref,paid)`,
 `CREATE TABLE IF NOT EXISTS ach(user INTEGER NOT NULL,k TEXT NOT NULL,at INTEGER NOT NULL,claimed INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user,k))`
];
let ready=null,lastClean=0;
const MIG=['ALTER TABLE users ADD COLUMN seen INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN streak INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN last_day INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN wheel_day INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN notify INTEGER NOT NULL DEFAULT 1','ALTER TABLE users ADD COLUMN remind_day INTEGER NOT NULL DEFAULT 0'];
/* одноразовая переоценка старых номеров по новой схеме (множители цифр × букв × региона) */
function revalue(p){
  const c=p.c;if(!C[c]||!p.d)return null;
  const code=p.pre||p.reg,rg=C[c].reg.find(r=>r[0]===code),rm=rg?rg[2]:1;
  const tg=(p.tags||[]).join('|');
  let gl=0;const m=/Серия ([^|\s]+)/.exec(tg);
  if(/Минск · двойные/.test(tg))gl=3;
  else if(/Буквы как у региона/.test(tg))gl=(CAP[c]||[]).includes(code)?4:3;
  else if(m){const x=m[1];gl=(CMB[c].g4||[]).includes(x)?4:(CMB[c].g3||[]).includes(x)?3:2}
  else if(/Двойные буквы/.test(tg))gl=1;
  const dm=digitMult(p.d),lm=LMULT[gl]||1,v=nice(UNIT*dm*lm*rm*(.95+Math.random()*.15));
  return{mx:[dm,lm,rm],v,rar:rarOf(v)};
}
async function econV2(env){
  const cur=await env.DB.prepare("SELECT v FROM meta WHERE k='econ'").first();
  if(cur&&cur.v==='v2')return;
  const rows=(await env.DB.prepare('SELECT id,data FROM plates').all()).results,st=[];
  for(const r of rows){
    let p;try{p=JSON.parse(r.data)}catch(e){continue}
    if(p.mx)continue;
    const re=revalue(p);if(!re)continue;
    p.mx=re.mx;p.v=re.v;p.rar=re.rar;
    st.push(env.DB.prepare('UPDATE plates SET rar=?,v=?,data=? WHERE id=?').bind(re.rar,re.v,JSON.stringify(p),r.id));
  }
  for(let i=0;i<st.length;i+=50)await env.DB.batch(st.slice(i,i+50));
  await env.DB.batch([
    env.DB.prepare("UPDATE lots SET rar=(SELECT rar FROM plates WHERE id=lots.plate_id),v=(SELECT v FROM plates WHERE id=lots.plate_id) WHERE st='active'"),
    env.DB.prepare("UPDATE lots SET price=CAST(v*"+SELL+"+1 AS INTEGER) WHERE st='active' AND price<CAST(v*"+SELL+"+1 AS INTEGER)"),
    env.DB.prepare("INSERT INTO meta(k,v) VALUES('econ','v2') ON CONFLICT(k) DO UPDATE SET v=excluded.v")
  ]);
}
const init=env=>ready||(ready=(async()=>{
  await env.DB.batch(DDL.map(s=>env.DB.prepare(s)));
  for(const m of MIG){try{await env.DB.prepare(m).run()}catch(e){if(!/duplicate column/i.test(String(e&&e.message||e)))throw e}}
  /* ботов на рынке больше нет */
  await env.DB.batch([
    env.DB.prepare("DELETE FROM lots WHERE seller=0"),
    env.DB.prepare("DELETE FROM plates WHERE owner=0")
  ]);
  /* реестр уникальных номеров: однажды выданный номер больше не выпадет никому, даже после продажи системе */
  await econV2(env);
  await env.DB.prepare("INSERT OR IGNORE INTO issued(k,ts) SELECT c||'|'||COALESCE(json_extract(data,'$.d'),'')||'|'||COALESCE(json_extract(data,'$.l'),'')||'|'||COALESCE(json_extract(data,'$.l1'),'')||'|'||COALESCE(json_extract(data,'$.l2'),'')||'|'||COALESCE(json_extract(data,'$.pre'),'')||'|'||COALESCE(json_extract(data,'$.suf'),'')||'|'||COALESCE(json_extract(data,'$.reg'),''),created FROM plates WHERE NOT EXISTS(SELECT 1 FROM issued LIMIT 1)").run();
})().catch(e=>{ready=null;throw e}));
/* админы: Telegram ID через запятую (переменная ADMIN_IDS либо значение по умолчанию) */
const ADMIN_DEFAULT='6329174504';
const isAdmin=(env,id)=>String(env.ADMIN_IDS||ADMIN_DEFAULT).split(',').map(x=>x.trim()).includes(String(id));

class HttpErr extends Error{constructor(s,code,extra){super(code);this.s=s;this.code=code;this.extra=extra||{}}}
const cors=(req,env)=>{
  const o=req.headers.get('origin')||'';
  const ok=ORIGINS.includes(o)||(env.ALLOW_ORIGIN&&o===env.ALLOW_ORIGIN)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return ok?{'access-control-allow-origin':o,'access-control-allow-headers':'content-type,x-init','access-control-allow-methods':'GET,POST,OPTIONS','access-control-max-age':'86400','vary':'origin'}:{};
};
const hm=async(key,data)=>{const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data))};
async function auth(req,env){
  if(!env.BOT_TOKEN)throw new HttpErr(500,'config');
  const raw=req.headers.get('x-init')||'';if(!raw)throw new HttpErr(401,'auth');
  const p=new URLSearchParams(raw),hash=p.get('hash')||'';p.delete('hash');
  const str=[...p.entries()].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0).map(([k,v])=>k+'='+v).join('\n');
  const enc=new TextEncoder();
  const secret=await hm(enc.encode('WebAppData'),enc.encode(env.BOT_TOKEN));
  const hex=[...await hm(secret,enc.encode(str))].map(b=>b.toString(16).padStart(2,'0')).join('');
  let d=hex.length^hash.length;for(let i=0;i<hex.length;i++)d|=hex.charCodeAt(i)^(hash.charCodeAt(i)||0);
  if(d!==0)throw new HttpErr(401,'auth');
  if(Date.now()/1000-(+p.get('auth_date')||0)>3*86400)throw new HttpErr(401,'expired');
  let u=null;try{u=JSON.parse(p.get('user')||'null')}catch(e){}
  if(!u||!u.id)throw new HttpErr(401,'auth');
  return{id:u.id,name:u.username?'@'+u.username:(u.first_name||'Игрок')};
}
async function getUser(env,a,now){
  let u=await env.DB.prepare('SELECT id,name,coins,spins,bonus_at,banned,streak,last_day,wheel_day FROM users WHERE id=?').bind(a.id).first();
  if(!u){
    await env.DB.prepare('INSERT OR IGNORE INTO users(id,name,coins,created) VALUES(?,?,?,?)').bind(a.id,a.name,START_COINS,now).run();
    u=await env.DB.prepare('SELECT id,name,coins,spins,bonus_at,banned,streak,last_day,wheel_day FROM users WHERE id=?').bind(a.id).first();
  }else if(u.name!==a.name){
    await env.DB.prepare('UPDATE users SET name=? WHERE id=?').bind(a.name,a.id).run();u.name=a.name;
  }
  return u;
}
const strip=p=>{const{id,paid,...r}=p;return r};
const plateOf=r=>({...JSON.parse(r.data),id:r.id,st:r.st,t:r.created});
const lotPlate=r=>({...JSON.parse(r.data),id:r.plate_id});
const userOut=(u,env)=>({id:u.id,name:u.name,coins:u.coins,spins:u.spins,admin:isAdmin(env,u.id)});
const REF_NEW=5000,REF_BONUS=15000,REF_MAX=50;
const BOT_USER='LayerPlates_bot';
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let curCtx=null;
const bg=p=>{if(curCtx&&curCtx.waitUntil)curCtx.waitUntil(p);return p};
const PLAY_KB=()=>({inline_keyboard:[[{text:'🎮 Играть',web_app:{url:WEBAPP}}]]});
/* сообщение игроку; если он заблокировал бота — больше не пишем */
async function notify(env,id,text){
  try{
    const r=await tgCall(env,'sendMessage',{chat_id:id,text,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:PLAY_KB()});
    if(r&&r.ok===false&&(r.error_code===403||r.error_code===400))await env.DB.prepare('UPDATE users SET notify=0 WHERE id=?').bind(id).run();
    return !!(r&&r.ok);
  }catch(e){return false}
}
async function regRef(env,id,ref,now){
  if(!ref||ref===id)return;
  if(await env.DB.prepare('SELECT 1 FROM users WHERE id=?').bind(id).first())return;
  if(!(await env.DB.prepare('SELECT 1 FROM users WHERE id=? AND banned=0').bind(ref).first()))return;
  await env.DB.prepare('INSERT OR IGNORE INTO refs(user,ref,at) VALUES(?,?,?)').bind(id,ref,now).run();
}
async function refPay(env,u,now){
  const r=await env.DB.prepare('SELECT ref FROM refs WHERE user=? AND paid=0').bind(u.id).first();
  if(!r)return 0;
  const cnt=(await env.DB.prepare('SELECT COUNT(*) n FROM refs WHERE ref=? AND paid=1').bind(r.ref).first()).n;
  const fl=await env.DB.prepare('UPDATE refs SET paid=1 WHERE user=? AND paid=0').bind(u.id).run();
  if(fl.meta.changes!==1)return 0;
  const st=[env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=?').bind(REF_NEW,u.id)];
  const pay=cnt<REF_MAX;
  if(pay)st.push(env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=?').bind(REF_BONUS,r.ref));
  await env.DB.batch(st);
  u.coins+=REF_NEW;
  if(pay)bg(notify(env,r.ref,`👥 По вашей ссылке пришёл ${esc(u.name)}. Начислено <b>+${fmtN(REF_BONUS)}</b> монет.`));
  return REF_NEW;
}
/* достижения: награда забирается вручную; выполненные фиксируются сразу, чтобы прогресс не терялся после продажи номера */
const ACH=[
  {k:'first_spin',t:'Первая крутка',d:'Крутите рулетку',m:'spins',g:1,r:1000},
  {k:'spins_50',t:'Азартный игрок',d:'50 круток',m:'spins',g:50,r:5000},
  {k:'spins_500',t:'Завсегдатай',d:'500 круток',m:'spins',g:500,r:30000},
  {k:'countries',t:'Четыре страны',d:'Номера KZ, RU, UA и BY в гараже',m:'countries',g:4,r:10000},
  {k:'garage_20',t:'Небольшой гараж',d:'20 номеров',m:'plates',g:20,r:5000},
  {k:'garage_100',t:'Автопарк',d:'100 номеров',m:'plates',g:100,r:25000},
  {k:'rare',t:'Охотник за редкими',d:'Номер редкости «Редкий» и выше',m:'r2',g:1,r:3000},
  {k:'epic',t:'Эпичная находка',d:'Номер «Эпичный» и выше',m:'r3',g:1,r:8000},
  {k:'legend',t:'Легенда',d:'Номер «Легендарный» и выше',m:'r4',g:1,r:25000},
  {k:'mythic',t:'Мифик',d:'Мифический номер',m:'r5',g:1,r:60000},
  {k:'elite',t:'Элитные цифры',d:'Номер с множителем цифр ×10 и выше',m:'dm10',g:1,r:15000},
  {k:'sale_1',t:'Первая сделка',d:'Продайте номер на рынке',m:'sold',g:1,r:3000},
  {k:'sale_10',t:'Торговец',d:'10 продаж на рынке',m:'sold',g:10,r:20000},
  {k:'streak_7',t:'Неделя подряд',d:'7 дней награды без пропуска',m:'streak',g:7,r:15000},
  {k:'friends_3',t:'Три друга',d:'Пригласите 3 друзей',m:'friends',g:3,r:10000}
];
async function achMetrics(env,u){
  const[pl,sold,fr,us]=await Promise.all([
    env.DB.prepare("SELECT COUNT(*) n,COUNT(DISTINCT c) cc,COALESCE(SUM(rar>=2),0) r2,COALESCE(SUM(rar>=3),0) r3,COALESCE(SUM(rar>=4),0) r4,COALESCE(SUM(rar>=5),0) r5,COALESCE(SUM(COALESCE(json_extract(data,'$.mx[0]'),0)>=10),0) dm10 FROM plates WHERE owner=?").bind(u.id).first(),
    env.DB.prepare("SELECT COUNT(*) n FROM lots WHERE seller=? AND st='sold'").bind(u.id).first(),
    env.DB.prepare("SELECT COUNT(*) n FROM refs WHERE ref=? AND paid=1").bind(u.id).first(),
    env.DB.prepare("SELECT spins,streak FROM users WHERE id=?").bind(u.id).first()
  ]);
  return{spins:us.spins,streak:us.streak,plates:pl.n,countries:pl.cc,r2:pl.r2,r3:pl.r3,r4:pl.r4,r5:pl.r5,dm10:pl.dm10,sold:sold.n,friends:fr.n};
}
async function achSync(env,u,now){
  try{
    const m=await achMetrics(env,u);
    const st=ACH.filter(a=>m[a.m]>=a.g).map(a=>env.DB.prepare('INSERT OR IGNORE INTO ach(user,k,at) VALUES(?,?,?)').bind(u.id,a.k,now));
    if(st.length)await env.DB.batch(st);
    return m;
  }catch(e){console.log('ach',e&&e.message);return null}
}
const achCount=async(env,u,now)=>{await achSync(env,u,now);return (await env.DB.prepare('SELECT COUNT(*) n FROM ach WHERE user=? AND claimed=0').bind(u.id).first()).n};
let remAt=0;
async function maybeReminders(env){
  const now=Date.now();if(now-remAt<6e5||!env.BOT_TOKEN)return;remAt=now;
  const h=new Date(now+TZ).getUTCHours();if(!env.REM_ANY&&(h<12||h>=21))return;
  const day=dayNum(now);
  const r=await env.DB.prepare("INSERT INTO meta(k,v) VALUES('rem',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v WHERE CAST(meta.v AS INTEGER)<CAST(excluded.v AS INTEGER)").bind(String(day)).run();
  if(r.meta.changes!==1)return;
  const rows=(await env.DB.prepare('SELECT id,streak,last_day FROM users WHERE notify=1 AND banned=0 AND last_day>=? AND last_day<? AND remind_day<? LIMIT 400').bind(day-3,day,day).all()).results;
  for(let i=0;i<rows.length;i+=15){
    await Promise.all(rows.slice(i,i+15).map(async u=>{
      const done=u.last_day===day-1?u.streak%7:0,amt=REWARDS[done];
      const txt=u.last_day===day-1?`🎁 Ежедневная награда ждёт: день ${done+1}, <b>+${fmtN(amt)}</b> монет. Зайдите до полуночи, иначе серия прервётся.`:`🎁 Награды ждут вас: <b>+${fmtN(amt)}</b> монет за вход. Зайдите и начните серию заново.`;
      await env.DB.prepare('UPDATE users SET remind_day=? WHERE id=?').bind(day,u.id).run();
      await notify(env,u.id,txt);
    }));
  }
}
let bcBusy=0;
async function sendBroadcast(env,ids,text){
  let ok=0,bad=0;
  for(let i=0;i<ids.length;i+=20){
    const res=await Promise.all(ids.slice(i,i+20).map(id=>notify(env,id,text)));
    res.forEach(x=>x?ok++:bad++);
  }
  console.log('broadcast done',ok,bad);
}
let topCache={t:0,d:null};
function dailyOf(u,now){
  const t=dayNum(now);
  if(u.last_day===t)return{rewards:REWARDS,claimed:true,done:u.streak,next:null};
  const done=u.last_day===t-1?u.streak%7:0;
  return{rewards:REWARDS,claimed:false,done,next:done+1};
}
const wheelOf=(u,now)=>({prizes:WHEEL.map(w=>w[0]),available:u.wheel_day<dayNum(now)});
function rnd100(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296*100}
function pickWheel(){let r=rnd100(),sum=WHEEL.reduce((a,w)=>a+w[1],0);r=r/100*sum;for(let i=0;i<WHEEL.length;i++){r-=WHEEL[i][1];if(r<0)return i}return WHEEL.length-1}
const normCode=x=>String(x==null?'':x).trim().toUpperCase();
const CODE_RE=/^[\p{L}\d_-]{3,24}$/u;
const promoFail=new Map();
const coinsOf=async(env,id)=>(await env.DB.prepare('SELECT coins FROM users WHERE id=?').bind(id).first()).coins;

async function housekeeping(env,now){
  if(now-lastClean<30000)return;lastClean=now;
  const D=env.DB;
  await D.batch([
    D.prepare("UPDATE lots SET st='expired' WHERE st='active' AND expires<?").bind(now),
    D.prepare("UPDATE plates SET st='own' WHERE st='listed' AND id IN(SELECT plate_id FROM lots WHERE st='expired' AND settled=0)"),
    D.prepare("UPDATE lots SET settled=1 WHERE st='expired' AND settled=0"),
    D.prepare("DELETE FROM lots WHERE st!='active' AND settled=1 AND created<?").bind(now-30*DAY)
  ]);
}
/* уникальный номер: ключ резервируется в реестре навсегда; при нехватке свободных комбинаций качество понижается */
const plateKey=p=>[p.c,p.d,p.l||'',p.l1||'',p.l2||'',p.pre||'',p.suf||'',p.reg||''].join('|');
async function claimPlate(env,c,g,now){
  for(let gg=g;gg>=0;gg--){
    for(let round=0;round<3;round++){
      const cands=Array.from({length:12},()=>makePlate(c,gg)),keys=cands.map(plateKey);
      const taken=new Set((await env.DB.prepare(`SELECT k FROM issued WHERE k IN(${keys.map(()=>'?').join(',')})`).bind(...keys).all()).results.map(r=>r.k));
      for(let i=0;i<cands.length;i++){
        if(taken.has(keys[i]))continue;
        const r=await env.DB.prepare('INSERT OR IGNORE INTO issued(k,ts) VALUES(?,?)').bind(keys[i],now).run();
        if(r.meta.changes===1)return cands[i];
        taken.add(keys[i]);
      }
    }
  }
  throw new HttpErr(503,'exhausted');
}
const int=(x,lo,hi)=>{x=Math.floor(+x);if(!Number.isFinite(x)||x<lo||x>hi)throw new HttpErr(400,'bad');return x};

const needAdmin=(env,u)=>{if(!isAdmin(env,u.id))throw new HttpErr(403,'forbidden')};
const routes={

  /* ---------- админка ---------- */
  async 'GET /api/admin/stats'(env,u,url,now){
    needAdmin(env,u);
    const q=async(sql,...b)=>(await env.DB.prepare(sql).bind(...b).first());
    const[pl,on,coins,plates,lots,sold,spins]=await Promise.all([
      q('SELECT COUNT(*) n FROM users'),
      q('SELECT COUNT(*) n FROM users WHERE seen>?',now-DAY),
      q('SELECT COALESCE(SUM(coins),0) n FROM users'),
      q("SELECT COUNT(*) n,COALESCE(SUM(v),0) s FROM plates"),
      q("SELECT COUNT(*) n FROM lots WHERE st='active' "),
      q("SELECT COUNT(*) n,COALESCE(SUM(price),0) s FROM lots WHERE st='sold'"),
      q('SELECT COALESCE(SUM(spins),0) n FROM users')
    ]);
    const hist=(await env.DB.prepare('SELECT COUNT(*) n FROM users WHERE created>?').bind(now-DAY).first()).n;
    return{players:pl.n,online24:on.n,new24:hist,coins:coins.n,plates:plates.n,platesValue:plates.s,lots:lots.n,sales:sold.n,salesVolume:sold.s,commission:Math.floor(sold.s*COMM/100),spins:spins.n};
  },
  async 'GET /api/admin/users'(env,u,url,now){
    needAdmin(env,u);
    const qq=(url.searchParams.get('q')||'').trim().slice(0,40),like='%'+qq.replace(/[%_]/g,'')+'%';
    const rows=(await env.DB.prepare("SELECT u.id,u.name,u.coins,u.spins,u.seen,u.banned,u.created,(SELECT COUNT(*) FROM plates p WHERE p.owner=u.id) pc FROM users u WHERE (?='' OR u.name LIKE ? OR CAST(u.id AS TEXT)=?) ORDER BY u.seen DESC LIMIT 40").bind(qq,like,qq).all()).results;
    return{users:rows.map(r=>({id:r.id,name:r.name,coins:r.coins,spins:r.spins,seen:r.seen,banned:!!r.banned,created:r.created,plates:r.pc}))};
  },
  async 'POST /api/admin/grant'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15),amt=int(b.amount,-1e9,1e9);
    const t=await env.DB.prepare('SELECT coins FROM users WHERE id=?').bind(id).first();
    if(!t)throw new HttpErr(404,'nouser');
    await env.DB.prepare('UPDATE users SET coins=MAX(0,coins+?) WHERE id=?').bind(amt,id).run();
    return{coins:await coinsOf(env,id)};
  },
  async 'POST /api/admin/ban'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15);
    if(isAdmin(env,id))throw new HttpErr(400,'bad');
    const r=await env.DB.prepare('UPDATE users SET banned=? WHERE id=?').bind(b.banned?1:0,id).run();
    if(r.meta.changes!==1)throw new HttpErr(404,'nouser');
    return{banned:!!b.banned};
  },
  async 'GET /api/admin/lots'(env,u,url,now){
    needAdmin(env,u);
    const rows=(await env.DB.prepare("SELECT l.id,l.price,l.seller,l.seller_name,l.expires,l.v,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.st='active' ORDER BY l.created DESC LIMIT 60").all()).results;
    return{lots:rows.map(r=>({id:r.id,price:r.price,seller:r.seller_name,sellerId:r.seller,expires:r.expires,plate:{...JSON.parse(r.data),id:r.pid}}))};
  },
  async 'POST /api/admin/cancel'(env,u,url,now,b){
    needAdmin(env,u);
    const id=String(b.lotId||'');
    const lot=await env.DB.prepare("SELECT plate_id,seller,st FROM lots WHERE id=?").bind(id).first();
    if(!lot||lot.st!=='active')throw new HttpErr(410,'gone');
    const res=await env.DB.batch([
      env.DB.prepare("UPDATE lots SET st='cancelled',settled=0 WHERE id=? AND st='active'").bind(id),
      env.DB.prepare("UPDATE plates SET st='own' WHERE id=(SELECT plate_id FROM lots WHERE id=?) AND EXISTS(SELECT 1 FROM lots WHERE id=? AND st='cancelled' AND settled=0)").bind(id,id),
      env.DB.prepare("UPDATE lots SET settled=1 WHERE id=? AND st='cancelled' AND settled=0").bind(id)
    ]);
    if(res[0].meta.changes!==1)throw new HttpErr(410,'gone');
    return{ok:true};
  },
  async 'GET /api/admin/promos'(env,u,url,now){
    needAdmin(env,u);
    const rows=(await env.DB.prepare('SELECT code,coins,max,used,expires,active,created FROM promos ORDER BY created DESC LIMIT 100').all()).results;
    return{promos:rows.map(r=>({code:r.code,coins:r.coins,max:r.max,used:r.used,expires:r.expires,active:!!r.active,created:r.created}))};
  },
  async 'POST /api/admin/promo'(env,u,url,now,b){
    needAdmin(env,u);
    let code=normCode(b.code);
    if(!code){const al='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=new Uint8Array(8);crypto.getRandomValues(a);code=[...a].map(x=>al[x%al.length]).join('')}
    if(!CODE_RE.test(code))throw new HttpErr(400,'bad');
    const coins=int(b.coins,1,1e9),max=int(b.max||0,0,1e7),days=int(b.days||0,0,3650);
    const r=await env.DB.prepare('INSERT OR IGNORE INTO promos(code,coins,max,expires,created) VALUES(?,?,?,?,?)').bind(code,coins,max,days?now+days*DAY:0,now).run();
    if(r.meta.changes!==1)throw new HttpErr(409,'exists');
    return{code};
  },
  async 'POST /api/admin/promo-toggle'(env,u,url,now,b){
    needAdmin(env,u);
    const r=await env.DB.prepare('UPDATE promos SET active=? WHERE code=?').bind(b.active?1:0,normCode(b.code)).run();
    if(r.meta.changes!==1)throw new HttpErr(404,'nopromo');
    return{active:!!b.active};
  },
  async 'POST /api/admin/promo-del'(env,u,url,now,b){
    needAdmin(env,u);
    const code=normCode(b.code);
    const res=await env.DB.batch([env.DB.prepare('DELETE FROM promos WHERE code=?').bind(code),env.DB.prepare('DELETE FROM promo_uses WHERE code=?').bind(code)]);
    if(res[0].meta.changes!==1)throw new HttpErr(404,'nopromo');
    return{ok:true};
  },
  async 'POST /api/admin/broadcast'(env,u,url,now,b){
    needAdmin(env,u);
    const text=String(b.text||'').trim().slice(0,1500);
    if(text.length<2)throw new HttpErr(400,'bad');
    const body=esc(text);
    if(b.test){const ok=await notify(env,u.id,body);return{sent:ok?1:0,test:true}}
    if(bcBusy&&now-bcBusy<2e4)throw new HttpErr(429,'busy');
    bcBusy=now;
    const ids=(await env.DB.prepare('SELECT id FROM users WHERE notify=1 AND banned=0').all()).results.map(r=>r.id);
    bg(sendBroadcast(env,ids,body));
    return{queued:ids.length};
  },
  async 'GET /api/ref'(env,u,url,now){
    const r=await env.DB.prepare('SELECT COUNT(*) n FROM refs WHERE ref=? AND paid=1').bind(u.id).first();
    return{link:`https://t.me/${BOT_USER}?start=ref_${u.id}`,count:r.n,earned:Math.min(r.n,REF_MAX)*REF_BONUS,bonus:REF_BONUS,newBonus:REF_NEW,max:REF_MAX};
  },
  async 'GET /api/top'(env,u,url,now){
    if(now-topCache.t>3e4||!topCache.d){
      const D=env.DB;
      const[val,pl]=await Promise.all([
        D.prepare("SELECT u.id,u.name,SUM(p.v) s,COUNT(*) n FROM plates p JOIN users u ON u.id=p.owner WHERE u.banned=0 GROUP BY p.owner ORDER BY s DESC LIMIT 20").all(),
        D.prepare("SELECT p.data,p.id,u.id uid,u.name FROM plates p JOIN users u ON u.id=p.owner WHERE u.banned=0 ORDER BY p.v DESC LIMIT 20").all()
      ]);
      topCache={t:now,d:{val:val.results,pl:pl.results}};
    }
    const mine=await env.DB.prepare('SELECT COALESCE(SUM(v),0) s,COUNT(*) n FROM plates WHERE owner=?').bind(u.id).first();
    const rank=mine.n?(await env.DB.prepare('SELECT COUNT(*)+1 r FROM (SELECT owner FROM plates GROUP BY owner HAVING SUM(v)>?)').bind(mine.s).first()).r:null;
    return{
      value:topCache.d.val.map(r=>({name:r.name,s:r.s,n:r.n,me:r.id===u.id})),
      plates:topCache.d.pl.map(r=>({name:r.name,me:r.uid===u.id,plate:{...JSON.parse(r.data),id:r.id}})),
      me:{s:mine.s,n:mine.n,rank}
    };
  },
  async 'GET /api/ach'(env,u,url,now){
    const m=await achSync(env,u,now)||await achMetrics(env,u);
    const rows=(await env.DB.prepare('SELECT k,claimed FROM ach WHERE user=?').bind(u.id).all()).results,st=new Map(rows.map(r=>[r.k,r.claimed]));
    return{list:ACH.map(a=>({k:a.k,t:a.t,d:a.d,g:a.g,r:a.r,p:Math.min(m[a.m],a.g),state:st.has(a.k)?(st.get(a.k)?'done':'ready'):'lock'}))};
  },
  async 'POST /api/ach/claim'(env,u,url,now,b){
    const a=ACH.find(x=>x.k===String(b.k||''));if(!a)throw new HttpErr(400,'bad');
    const res=await env.DB.batch([
      env.DB.prepare('UPDATE ach SET claimed=1 WHERE user=? AND k=? AND claimed=0').bind(u.id,a.k),
      env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=? AND (SELECT changes())=1').bind(a.r,u.id)
    ]);
    if(res[0].meta.changes!==1)throw new HttpErr(409,'gone');
    return{coins:await coinsOf(env,u.id),gained:a.r};
  },
  async 'GET /api/me'(env,u,url,now){
    await housekeeping(env,now);
    const sq=url.searchParams.get('since'),since=sq===null?now:+sq||0;
    const[inv,lots,sales]=await Promise.all([
      env.DB.prepare('SELECT id,st,data,created FROM plates WHERE owner=? ORDER BY rar DESC,v DESC LIMIT 1000').bind(u.id).all(),
      env.DB.prepare("SELECT COUNT(*) n FROM lots WHERE seller=? AND st='active'").bind(u.id).first(),
      env.DB.prepare(`SELECT COUNT(*) n,COALESCE(SUM(price*${100-COMM}/100),0) net FROM lots WHERE seller=? AND st='sold' AND sold_at>?`).bind(u.id,since).first()
    ]);
    await env.DB.prepare('UPDATE users SET seen=? WHERE id=?').bind(now,u.id).run();
    const refBonus=await refPay(env,u,now);
    await achSync(env,u,now);
    const ar=(await env.DB.prepare('SELECT COUNT(*) n FROM ach WHERE user=? AND claimed=0').bind(u.id).first()).n;
    return{refBonus,achReady:ar,user:{...userOut(u,env),subWarn:isAdmin(env,u.id)&&subErr>0&&now-subErr<36e5},inv:inv.results.map(plateOf),lots:lots.n,sales:{n:sales.n,net:sales.net},daily:dailyOf(u,now),wheel:wheelOf(u,now),reset:dayEnd(now),now};
  },
  async 'POST /api/spin'(env,u,url,now,b){
    const c=String(b.c);if(!C[c])throw new HttpErr(400,'bad');
    const T=TIERS[int(b.tier,0,TIERS.length-1)],n=int(b.n,1,5),cost=T.price*n;
    if(u.coins<cost)throw new HttpErr(402,'coins');
    const plates=[];for(let i=0;i<n;i++)plates.push(await claimPlate(env,c,wpick(T.w),now));
    const st=plates.map(p=>env.DB.prepare("INSERT INTO plates(id,owner,st,c,rar,v,data,created) SELECT ?,?,'own',?,?,?,?,? WHERE (SELECT coins FROM users WHERE id=?)>=?").bind(p.id,u.id,p.c,p.rar,p.v,JSON.stringify(strip(p)),now,u.id,cost));
    st.push(env.DB.prepare('UPDATE users SET coins=coins-?,spins=spins+? WHERE id=? AND coins>=?').bind(cost,n,u.id,cost));
    const res=await env.DB.batch(st);
    if(res[n].meta.changes!==1)throw new HttpErr(402,'coins');
    u.spins+=n;
    return{coins:u.coins-cost,spins:u.spins,achReady:await achCount(env,u,now),plates:plates.map(p=>({...p,paid:T.price,st:'own',t:now}))};
  },
  async 'POST /api/sell'(env,u,url,now,b){
    const ids=[...new Set(Array.isArray(b.ids)?b.ids.map(String):[])].slice(0,60);
    if(!ids.length)throw new HttpErr(400,'bad');
    const q=ids.map(()=>'?').join(',');
    const rows=(await env.DB.prepare(`SELECT id,v FROM plates WHERE owner=? AND st='own' AND id IN(${q})`).bind(u.id,...ids).all()).results;
    if(!rows.length)throw new HttpErr(409,'gone');
    const st=[];
    for(const r of rows){
      st.push(env.DB.prepare("UPDATE users SET coins=coins+? WHERE id=? AND EXISTS(SELECT 1 FROM plates WHERE id=? AND owner=? AND st='own')").bind(Math.floor(r.v*SELL),u.id,r.id,u.id));
      st.push(env.DB.prepare("DELETE FROM plates WHERE id=? AND owner=? AND st='own'").bind(r.id,u.id));
    }
    const res=await env.DB.batch(st);
    const sold=[];let gained=0;
    rows.forEach((r,i)=>{if(res[i*2+1].meta.changes===1){sold.push(r.id);gained+=Math.floor(r.v*SELL)}});
    return{coins:await coinsOf(env,u.id),sold,gained};
  },
  async 'POST /api/daily'(env,u,url,now){
    const t=dayNum(now),d=dailyOf(u,now);
    if(d.claimed)throw new HttpErr(429,'wait',{reset:dayEnd(now)});
    const gain=REWARDS[d.next-1];
    const r=await env.DB.prepare('UPDATE users SET coins=coins+?,streak=?,last_day=? WHERE id=? AND last_day<?').bind(gain,d.next,t,u.id,t).run();
    if(r.meta.changes!==1)throw new HttpErr(429,'wait',{reset:dayEnd(now)});
    const u2={...u,streak:d.next,last_day:t};
    return{coins:u.coins+gain,gained:gain,day:d.next,daily:dailyOf(u2,now),reset:dayEnd(now),achReady:await achCount(env,u2,now)};
  },
  async 'POST /api/wheel'(env,u,url,now){
    const t=dayNum(now);
    if(u.wheel_day>=t)throw new HttpErr(429,'wait',{reset:dayEnd(now)});
    const idx=pickWheel(),gain=WHEEL[idx][0];
    const r=await env.DB.prepare('UPDATE users SET coins=coins+?,wheel_day=? WHERE id=? AND wheel_day<?').bind(gain,t,u.id,t).run();
    if(r.meta.changes!==1)throw new HttpErr(429,'wait',{reset:dayEnd(now)});
    return{coins:u.coins+gain,gained:gain,idx,reset:dayEnd(now)};
  },
  async 'POST /api/promo'(env,u,url,now,b){
    const bad=promoFail.get(u.id)||[];const recent=bad.filter(x=>now-x<6e5);
    if(recent.length>=8)throw new HttpErr(429,'slow');
    const code=normCode(b.code);
    const fail=(s,c)=>{recent.push(now);promoFail.set(u.id,recent);throw new HttpErr(s,c)};
    if(!CODE_RE.test(code))fail(404,'nopromo');
    const has="EXISTS(SELECT 1 FROM promo_uses WHERE code=? AND user=? AND at=?)";
    const res=await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO promo_uses(code,user,at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM promos WHERE code=? AND active=1 AND (expires=0 OR expires>?) AND (max=0 OR used<max))").bind(code,u.id,now,code,now),
      env.DB.prepare(`UPDATE promos SET used=used+1 WHERE code=? AND ${has}`).bind(code,code,u.id,now),
      env.DB.prepare(`UPDATE users SET coins=coins+(SELECT coins FROM promos WHERE code=?) WHERE id=? AND ${has}`).bind(code,u.id,code,u.id,now)
    ]);
    if(res[0].meta.changes!==1){
      const p=await env.DB.prepare('SELECT code FROM promos WHERE code=?').bind(code).first();
      if(!p)fail(404,'nopromo');
      const used=await env.DB.prepare('SELECT 1 x FROM promo_uses WHERE code=? AND user=?').bind(code,u.id).first();
      if(used)throw new HttpErr(409,'promo_used');
      throw new HttpErr(410,'promo_over');
    }
    const p=await env.DB.prepare('SELECT coins FROM promos WHERE code=?').bind(code).first();
    return{coins:await coinsOf(env,u.id),gained:p.coins};
  },
  async 'GET /api/market'(env,u,url,now){
    await housekeeping(env,now);
    const c=url.searchParams.get('c')||'ALL';
    const rows=(await env.DB.prepare("SELECT l.id,l.price,l.seller,l.seller_name,l.expires,l.v,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.st='active' AND l.seller!=? AND (?='ALL' OR l.c=?) AND l.expires>? ORDER BY l.rar DESC,l.price*1.0/l.v ASC LIMIT 60").bind(u.id,c,c,now).all()).results;
    return{lots:rows.map(r=>({id:r.id,price:r.price,seller:r.seller_name,expires:r.expires,plate:{...JSON.parse(r.data),id:r.pid}})),now};
  },
  async 'GET /api/lots'(env,u,url,now){
    await housekeeping(env,now);
    const act=(await env.DB.prepare("SELECT l.id,l.price,l.expires,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.seller=? AND l.st='active' ORDER BY l.created DESC").bind(u.id).all()).results;
    const sold=(await env.DB.prepare("SELECT l.id,l.price,l.sold_at,l.buyer_name,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.seller=? AND l.st='sold' ORDER BY l.sold_at DESC LIMIT 10").bind(u.id).all()).results;
    return{active:act.map(r=>({id:r.id,price:r.price,net:Math.floor(r.price*(100-COMM)/100),expires:r.expires,plate:{...JSON.parse(r.data),id:r.pid}})),
      sold:sold.map(r=>({id:r.id,price:r.price,net:Math.floor(r.price*(100-COMM)/100),at:r.sold_at,buyer:r.buyer_name,plate:{...JSON.parse(r.data),id:r.pid}})),now};
  },
  async 'POST /api/list'(env,u,url,now,b){
    const id=String(b.plateId||'');
    const p=await env.DB.prepare("SELECT id,c,rar,v FROM plates WHERE id=? AND owner=? AND st='own'").bind(id,u.id).first();
    if(!p)throw new HttpErr(409,'gone');
    const price=int(b.price,Math.max(100,Math.ceil(p.v*SELL)),Math.ceil(p.v*3));
    const cnt=(await env.DB.prepare("SELECT COUNT(*) n FROM lots WHERE seller=? AND st='active'").bind(u.id).first()).n;
    if(cnt>=MAX_LOTS)throw new HttpErr(409,'limit');
    const lid=uid();
    const res=await env.DB.batch([
      env.DB.prepare("INSERT INTO lots(id,plate_id,seller,seller_name,price,created,expires,c,rar,v) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM plates WHERE id=? AND owner=? AND st='own')").bind(lid,id,u.id,u.name,price,now,now+LOT_TTL,p.c,p.rar,p.v,id,u.id),
      env.DB.prepare("UPDATE plates SET st='listed' WHERE id=? AND owner=? AND st='own'").bind(id,u.id)
    ]);
    if(res[0].meta.changes!==1)throw new HttpErr(409,'gone');
    return{lotId:lid,expires:now+LOT_TTL};
  },
  async 'POST /api/buy'(env,u,url,now,b){
    const id=String(b.lotId||'');
    const lot=await env.DB.prepare("SELECT id,plate_id,seller,price,st,expires FROM lots WHERE id=?").bind(id).first();
    if(!lot||lot.st!=='active'||lot.expires<now)throw new HttpErr(410,'gone');
    if(lot.seller===u.id)throw new HttpErr(400,'own');
    if(u.coins<lot.price)throw new HttpErr(402,'coins');
    const ok="EXISTS(SELECT 1 FROM lots WHERE id=? AND st='sold' AND buyer=? AND settled=0)";
    const res=await env.DB.batch([
      env.DB.prepare("UPDATE lots SET st='sold',buyer=?,buyer_name=?,sold_at=?,settled=0 WHERE id=? AND st='active' AND seller!=? AND expires>? AND (SELECT coins FROM users WHERE id=?)>=price").bind(u.id,u.name,now,id,u.id,now,u.id),
      env.DB.prepare(`UPDATE users SET coins=coins-(SELECT price FROM lots WHERE id=?) WHERE id=? AND ${ok}`).bind(id,u.id,id,u.id),
      env.DB.prepare(`UPDATE users SET coins=coins+(SELECT price*${100-COMM}/100 FROM lots WHERE id=?) WHERE id=(SELECT seller FROM lots WHERE id=?) AND ${ok}`).bind(id,id,id,u.id),
      env.DB.prepare(`UPDATE plates SET owner=?,st='own' WHERE id=(SELECT plate_id FROM lots WHERE id=?) AND ${ok}`).bind(u.id,id,id,u.id),
      env.DB.prepare("UPDATE lots SET settled=1 WHERE id=? AND st='sold' AND buyer=? AND settled=0").bind(id,u.id)
    ]);
    if(res[0].meta.changes!==1){
      const now2=await env.DB.prepare('SELECT st FROM lots WHERE id=?').bind(id).first();
      if(!now2||now2.st!=='active')throw new HttpErr(410,'gone');
      throw new HttpErr(402,'coins');
    }
    const pr=await env.DB.prepare('SELECT id,st,data,created FROM plates WHERE id=?').bind(lot.plate_id).first();
    const pp=plateOf(pr);
    bg(notify(env,lot.seller,`💰 Ваш номер <b>${esc(plateText(pp))}</b> купили за ${fmtN(lot.price)}. Начислено <b>+${fmtN(Math.floor(lot.price*(100-COMM)/100))}</b> монет.`));
    bg(achSync(env,{id:lot.seller},now));
    return{coins:await coinsOf(env,u.id),plate:pp,achReady:await achCount(env,u,now)};
  },
  async 'POST /api/cancel'(env,u,url,now,b){
    const id=String(b.lotId||'');
    const res=await env.DB.batch([
      env.DB.prepare("UPDATE lots SET st='cancelled',settled=0 WHERE id=? AND seller=? AND st='active'").bind(id,u.id),
      env.DB.prepare("UPDATE plates SET st='own' WHERE id=(SELECT plate_id FROM lots WHERE id=?) AND EXISTS(SELECT 1 FROM lots WHERE id=? AND st='cancelled' AND seller=? AND settled=0)").bind(id,id,u.id),
      env.DB.prepare("UPDATE lots SET settled=1 WHERE id=? AND st='cancelled' AND settled=0 AND seller=?").bind(id,u.id)
    ]);
    if(res[0].meta.changes!==1)throw new HttpErr(410,'gone');
    return{ok:true};
  }
};

/* ---------- бот: /start ---------- */
const fmtN=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const WELCOME=()=>`🚗 <b>Гараж номеров</b>

Крутите рулетку автомобильных номеров Казахстана, России, Украины и Беларуси. Редкие номера оставляйте себе или продавайте другим игрокам за монеты.

🎁 Стартовый баланс — ${fmtN(START_COINS)} монет
📅 Заходите каждый день: награды растут до ${fmtN(REWARDS[6])} монет за неделю
🎡 Бесплатное колесо удачи раз в сутки
🎟 Промокоды на монеты

📣 Для игры нужна подписка на канал @layerplates

Нажмите «Играть», чтобы начать.`;
/* проверка подписки: «да» кешируем на 5 минут, «нет» — на 3 секунды (чтобы кнопка «Проверить» работала сразу).
   Если Telegram не отвечает или бот не админ канала — не блокируем игроков, но помечаем ошибку для админа */
const subCache=new Map();let subErr=0;
async function isSub(env,id,now){
  const c=subCache.get(id);
  if(c&&now-c.t<(c.ok?3e5:3e3))return c.ok;
  let ok=true,cache=true;
  try{
    const r=await tgCall(env,'getChatMember',{chat_id:chanOf(env),user_id:id});
    if(r&&r.ok&&r.result&&r.result.status){
      const s=r.result.status;
      ok=s==='creator'||s==='administrator'||s==='member'||(s==='restricted'&&r.result.is_member!==false);
      subErr=0;
    }else if(r&&/user not found|PARTICIPANT_ID_INVALID/i.test(String(r.description||''))){ok=false}
    else{ok=true;cache=false;subErr=now;console.log('sub check failed',JSON.stringify(r))}
  }catch(e){ok=true;cache=false;subErr=now;console.log('sub check error',e&&e.message)}
  if(cache){if(subCache.size>5000)subCache.clear();subCache.set(id,{ok,t:now})}
  return ok;
}
const hookSecret=async env=>{const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('hook:'+env.BOT_TOKEN));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,48)};
async function tgCall(env,method,body){
  const r=await fetch(`${TG(env)}/bot${env.BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  return r.json().catch(()=>({}));
}
async function onHook(req,env){
  if(!env.BOT_TOKEN)return new Response('no',{status:500});
  const sec=req.headers.get('x-telegram-bot-api-secret-token')||'',want=await hookSecret(env);
  let d=sec.length^want.length;for(let i=0;i<want.length;i++)d|=sec.charCodeAt(i)^(want.charCodeAt(i));
  if(d!==0)return new Response('forbidden',{status:403});
  let up={};try{up=await req.json()}catch(e){}
  const m=up&&up.message;
  if(m&&m.chat&&m.chat.type==='private'&&!(m.from&&m.from.is_bot)){
    const mm=/^\/start\s+ref_(\d{1,15})\b/.exec(String(m.text||''));
    if(mm){try{await regRef(env,m.from.id,+mm[1],Date.now())}catch(e){console.log('ref',e&&e.message)}}
    try{await tgCall(env,'sendMessage',{chat_id:m.chat.id,text:WELCOME(),parse_mode:'HTML',disable_web_page_preview:true,reply_markup:{inline_keyboard:[[{text:'🎮 Играть',web_app:{url:WEBAPP}}],[{text:'📣 Канал',url:CHANNEL_URL}]]}})}catch(e){console.log('TG',e&&e.message)}
  }
  return new Response('ok');
}
let whAt=0;
async function ensureWebhook(env,origin){
  if(!env.BOT_TOKEN||Date.now()-whAt<6e5)return;whAt=Date.now();
  try{
    await init(env);
    const want=origin+'/tg/hook|v1|'+await hookSecret(env);
    const cur=await env.DB.prepare("SELECT v FROM meta WHERE k='wh'").first();
    if(cur&&cur.v===want)return;
    const r=await tgCall(env,'setWebhook',{url:origin+'/tg/hook',secret_token:await hookSecret(env),allowed_updates:['message'],max_connections:20});
    if(r&&r.ok)await env.DB.prepare("INSERT INTO meta(k,v) VALUES('wh',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(want).run();
    else console.log('setWebhook failed',JSON.stringify(r));
  }catch(e){console.log('wh',e&&e.message)}
}

export default{
  async scheduled(ev,env,ctx){curCtx=ctx;remAt=0;await init(env);await maybeReminders(env)},
  async fetch(req,env,ctx){
    const h=cors(req,env);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h});
    const out=(o,s)=>new Response(JSON.stringify(o),{status:s||200,headers:{'content-type':'application/json','cache-control':'no-store',...h}});
    try{
      const url=new URL(req.url),key=req.method+' '+url.pathname;
      curCtx=ctx;
      if(ctx&&ctx.waitUntil){ctx.waitUntil(ensureWebhook(env,url.origin));ctx.waitUntil(maybeReminders(env).catch(e=>console.log('rem',e&&e.message)))}
      if(key==='POST /tg/hook'){await init(env);return await onHook(req,env)}
      if(key==='GET /api/ping')return out({ok:true});
      const fn=routes[key];if(!fn)return out({error:'notfound'},404);
      await init(env);
      const a=await auth(req,env),now=Date.now();
      const u=await getUser(env,a,now);
      if(u.banned&&!isAdmin(env,u.id))throw new HttpErr(403,'banned');
      if(!(await isSub(env,u.id,now)))throw new HttpErr(403,'nosub',{url:CHANNEL_URL});
      let body={};
      if(req.method==='POST'){try{const t=await req.text();body=t?JSON.parse(t):{}}catch(e){throw new HttpErr(400,'bad')}}
      return out(await fn(env,u,url,now,body));
    }catch(e){
      if(e instanceof HttpErr)return out({error:e.code,...e.extra},e.s);
      console.log('ERR',e&&e.stack||e);
      return out({error:'server'},500);
    }
  }
};
