/* Номерки — сервер игры. Cloudflare Worker + D1. Секрет: BOT_TOKEN. Привязка D1: DB. */
const rnd=n=>Math.floor(Math.random()*n), pick=a=>a[rnd(a.length)], R=(a,b)=>a+rnd(b-a+1);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const BONUS=1500, START_COINS=20000, SELL=.85;
const RAR=[{n:'Обычный'},{n:'Необычный'},{n:'Редкий'},{n:'Эпичный'},{n:'Легендарный'},{n:'Мифический'}];
/* рулетки: цена, нижняя граница качества и шансы [обычный … мифический] */
const TIERS=[
  {n:'Обычная',price:1000,note:'любые номера',w:[95.24,3.61,.96,.16,.02,.01]},
  {n:'Редкая',price:2500,note:'от необычных',w:[0,92.52,6.17,1.09,.18,.04]},
  {n:'Эпическая',price:7000,note:'от редких',w:[0,0,91.96,6.55,1.23,.25]},
  {n:'Элитная',price:17500,note:'от эпичных',w:[0,0,0,92.02,6.88,1.1]},
  {n:'Легендарная',price:42000,note:'от легендарных',w:[0,0,0,0,95.5,4.5]}
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
  [[0,0],[0,0],[0,1],[1,0]],
  [[0,2],[2,0],[2,1],[1,2],[1,1]],
  [[0,3],[2,2],[3,0],[1,3],[2,2]],
  [[0,4],[3,1],[2,3],[4,0],[3,2],[1,4]],
  [[4,1],[4,2],[2,4],[3,3],[3,2]],
  [[3,4],[4,3],[4,4]]
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
  if(/^0[1-9]0$/.test(d)||d==='707'||d==='077')return 'Красивые нули';
  if(d===[...d].reverse().join(''))return 'Зеркало';
  if(/^(\d\d)\1$/.test(d))return 'Повтор';
  if(/(\d)\1(\d)\2/.test(d))return 'Две пары';
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
const UNIT=700;
/* множитель букв по качеству серии; отдельные «топовые» серии ценятся выше (по реальным ценникам: АМР, ААА, ТТТ и т.д.) */
const LMULT=[1,1.6,2.5,6,12];
const LTOP={
  KZ:{AAA:16,AMG:14,VIP:13,BMW:13,MMM:14,SSS:14,XXX:14,ZZZ:14},
  RU:{'АМР':30,'ЕКХ':24,'ААА':20,'МММ':18,'ООО':18,'ССС':16,'ММР':18,'ВМР':16,'ККК':14,'ТТТ':14,'ХХХ':14,'ВВВ':14,'ННН':14,'ВОР':9,'ХАМ':8,'МЕР':8,'АМО':10,'ААМ':9},
  UA:{},
  BY:{AA:12,MM:12,XX:12,OO:12}
};
const lmOf=(c,L,gl)=>(LTOP[c]&&LTOP[c][L])||LMULT[gl]||1;
const ELITE_M={'777':22,'888':20,'999':18,'0001':28,'0007':26,'7777':40,'0777':16};
/* границы редкости по оценке: ниже первой — обычный, выше последней — мифический */
const TH=[1500,3600,9000,22000,60000];
const rarOf=v=>{let r=0;while(r<TH.length&&v>=TH[r])r++;return r};
function digitMult(d){
  const n=d.length,t=digitTag(d);
  switch(t){
    case 'Элитные цифры':return ELITE_M[d]||(/^00[1-9]$/.test(d)?22:20);
    case 'Тройка':return 13;
    case 'Четвёрка':return 16;
    case 'Круглая сотня':return 12;
    case 'Нули впереди':return 10;
    case 'Лесенка':return n===3?5:8;
    case 'Зеркало':return n===3?1.5:2.4;
    case 'Повтор':return 2.2;
    case 'Две пары':return 2;
    case 'Красивые нули':return 5.5;
    case 'Два нуля':return 2.8;
    case 'Пара':return 1.3;
    case 'Круглый':return 2.4;
    default:return 1;
  }
}
function makePlate0(c,g){
  const [gd,gl]=pick(PAIRS[g]);
  return makeByPair(c,gd,gl,g);
}
function makeByPair(c,gd,gl,g){
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
  const dm=digitMult(d),lm=lmOf(c,L,gl),rm=reg[2];
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
 `CREATE TABLE IF NOT EXISTS ach(user INTEGER NOT NULL,k TEXT NOT NULL,at INTEGER NOT NULL,claimed INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user,k))`,
 `CREATE TABLE IF NOT EXISTS weekly(week INTEGER NOT NULL,place INTEGER NOT NULL,user INTEGER NOT NULL,prize INTEGER NOT NULL,val INTEGER NOT NULL,PRIMARY KEY(week,place))`,
 `CREATE TABLE IF NOT EXISTS auctions(id TEXT PRIMARY KEY,plate_id TEXT NOT NULL,seller INTEGER NOT NULL,start INTEGER NOT NULL,bid INTEGER NOT NULL DEFAULT 0,bidder INTEGER,bids INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,ends INTEGER NOT NULL,st TEXT NOT NULL DEFAULT 'active',c TEXT,rar INTEGER,v INTEGER)`,
 `CREATE INDEX IF NOT EXISTS auctions_act ON auctions(st,ends)`,
 `CREATE INDEX IF NOT EXISTS auctions_seller ON auctions(seller,st)`,
 `CREATE INDEX IF NOT EXISTS plates_created ON plates(created)`,
 `CREATE TABLE IF NOT EXISTS alog(id INTEGER PRIMARY KEY AUTOINCREMENT,ts INTEGER NOT NULL,admin INTEGER NOT NULL,act TEXT NOT NULL,target INTEGER NOT NULL DEFAULT 0,info TEXT)`,
 `CREATE INDEX IF NOT EXISTS alog_target ON alog(target,ts)`,
 `CREATE TABLE IF NOT EXISTS walert(id INTEGER PRIMARY KEY AUTOINCREMENT,ts INTEGER NOT NULL,user INTEGER NOT NULL,delta INTEGER NOT NULL,w_from INTEGER NOT NULL,w_to INTEGER NOT NULL,dt INTEGER NOT NULL,seen INTEGER NOT NULL DEFAULT 0)`
];
let ready=null,lastClean=0;
const MIG=['ALTER TABLE users ADD COLUMN seen INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN streak INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN last_day INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN wheel_day INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN notify INTEGER NOT NULL DEFAULT 1','ALTER TABLE users ADD COLUMN remind_day INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN dname TEXT','ALTER TABLE users ADD COLUMN photo TEXT','ALTER TABLE users ADD COLUMN avatar TEXT','ALTER TABLE users ADD COLUMN av INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN name_at INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN uname TEXT','ALTER TABLE users ADD COLUMN note TEXT','ALTER TABLE users ADD COLUMN mute INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN ban_reason TEXT','ALTER TABLE users ADD COLUMN csnap INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN wsnap INTEGER NOT NULL DEFAULT 0','ALTER TABLE users ADD COLUMN wsnap_at INTEGER NOT NULL DEFAULT 0','ALTER TABLE refs ADD COLUMN hold INTEGER NOT NULL DEFAULT 0','ALTER TABLE promos ADD COLUMN plate_rar INTEGER NOT NULL DEFAULT -1','ALTER TABLE promos ADD COLUMN plate_c TEXT'];
/* одноразовая переоценка старых номеров по новой схеме (множители цифр × букв × региона) */
function revalue(p){
  const c=p.c;if(!C[c]||!p.d)return null;
  const code=p.pre||p.reg,rg=C[c].reg.find(r=>r[0]===code),rm=rg?rg[2]:1;
  const tg=(p.tags||[]).join('|');
  let gl=0,L=null;const m=/Серия ([^|\s]+)/.exec(tg);
  if(/Минск · двойные/.test(tg))gl=3;
  else if(/Буквы как у региона/.test(tg))gl=(CAP[c]||[]).includes(code)?4:3;
  else if(m){const x=m[1];L=x;gl=(CMB[c].g4||[]).includes(x)?4:(CMB[c].g3||[]).includes(x)?3:2}
  else if(/Двойные буквы/.test(tg))gl=1;
  const dm=digitMult(p.d),lm=lmOf(c,L,gl),v=nice(UNIT*dm*lm*rm*(.95+Math.random()*.15));
  return{mx:[dm,lm,rm],v,rar:rarOf(v)};
}
async function econV3(env){
  const cur=await env.DB.prepare("SELECT v FROM meta WHERE k='econ'").first();
  if(cur&&cur.v==='v3')return;
  const rows=(await env.DB.prepare('SELECT id,data FROM plates').all()).results,st=[];
  for(const r of rows){
    let p;try{p=JSON.parse(r.data)}catch(e){continue}
    const re=revalue(p);if(!re)continue;
    p.mx=re.mx;p.v=re.v;p.rar=re.rar;
    st.push(env.DB.prepare('UPDATE plates SET rar=?,v=?,data=? WHERE id=?').bind(re.rar,re.v,JSON.stringify(p),r.id));
  }
  for(let i=0;i<st.length;i+=50)await env.DB.batch(st.slice(i,i+50));
  await env.DB.batch([
    env.DB.prepare("UPDATE lots SET rar=(SELECT rar FROM plates WHERE id=lots.plate_id),v=(SELECT v FROM plates WHERE id=lots.plate_id) WHERE st='active'"),
    env.DB.prepare("UPDATE lots SET price=CAST(v*"+SELL+"+1 AS INTEGER) WHERE st='active' AND price<CAST(v*"+SELL+"+1 AS INTEGER)"),
    env.DB.prepare("INSERT INTO meta(k,v) VALUES('econ','v3') ON CONFLICT(k) DO UPDATE SET v=excluded.v")
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
  await econV3(env);
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
  const nm=String(u.first_name||u.username||'Игрок').replace(/[\u0000-\u001f]/g,'').trim().slice(0,40)||'Игрок';
  const ph=/^https:\/\/[^\s]{1,300}$/.test(String(u.photo_url||''))?String(u.photo_url):'';
  const un=/^[A-Za-z0-9_]{3,40}$/.test(String(u.username||''))?String(u.username):'';
  return{id:u.id,name:nm,photo:ph,un};
}
async function getUser(env,a,now){
  const SEL='SELECT id,name,coins,spins,bonus_at,banned,ban_reason,streak,last_day,wheel_day,dname,photo,av,name_at,uname,mute FROM users WHERE id=?';
  let u=await env.DB.prepare(SEL).bind(a.id).first();
  if(!u){
    await env.DB.prepare('INSERT OR IGNORE INTO users(id,name,coins,created,photo,uname) VALUES(?,?,?,?,?,?)').bind(a.id,a.name,START_COINS,now,a.photo,a.un).run();
    u=await env.DB.prepare(SEL).bind(a.id).first();
  }else if(u.name!==a.name||(u.photo||'')!==a.photo||(u.uname||'')!==a.un){
    await env.DB.prepare('UPDATE users SET name=?,photo=?,uname=? WHERE id=?').bind(a.name,a.photo,a.un,a.id).run();u.name=a.name;u.photo=a.photo;u.uname=a.un;
  }
  return u;
}
const strip=p=>{const{id,paid,...r}=p;return r};
const plateOf=r=>({...JSON.parse(r.data),id:r.id,st:r.st,t:r.created});
const lotPlate=r=>({...JSON.parse(r.data),id:r.plate_id});
/* отображаемое имя: своё из профиля, иначе имя из Telegram */
const dnOf=u=>(u.dname&&String(u.dname).trim())||u.name||'Игрок';
const NAME_SQL=a=>`COALESCE(NULLIF(${a}.dname,''),${a}.name)`;
const avaOf=u=>u.av?`/api/ava/${u.id}?v=${u.av}`:(u.photo||'');
const userOut=(u,env)=>({id:u.id,name:dnOf(u),tname:u.name,custom:!!(u.dname&&String(u.dname).trim()),hasAva:!!u.av,ava:avaOf(u),coins:u.coins,spins:u.spins,admin:isAdmin(env,u.id)});
const REF_MAX=50;
/* настройки, которые админ меняет из панели; хранятся в meta('cfg') и подтягиваются раз в 15 с */
const CFG={prizes:[100000,50000,25000],refBonus:15000,refNew:5000,glimit:100000,refHoldN:5,alertThr:200000,maint:'',banner:null,sale:null,x2:null,t:0};
const CFG_KEYS=['prizes','refBonus','refNew','glimit','refHoldN','alertThr','maint','banner','sale','x2'];
async function loadCfg(env,now,force){
  if(!force&&now-CFG.t<15000)return;CFG.t=now;
  try{
    const r=await env.DB.prepare("SELECT v FROM meta WHERE k='cfg'").first();
    if(r){const o=JSON.parse(r.v);CFG_KEYS.forEach(k=>{if(o[k]!==undefined)CFG[k]=o[k]})}
  }catch(e){console.log('cfg',e&&e.message)}
}
async function saveCfg(env,patch,now){
  await loadCfg(env,now,true);
  CFG_KEYS.forEach(k=>{if(patch[k]!==undefined)CFG[k]=patch[k]});
  const o={};CFG_KEYS.forEach(k=>{o[k]=CFG[k]});
  await env.DB.prepare("INSERT INTO meta(k,v) VALUES('cfg',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(JSON.stringify(o)).run();
}
const onSale=now=>CFG.sale&&CFG.sale.pct>0&&now<CFG.sale.until?CFG.sale:null;
const onX2=now=>CFG.x2&&now<CFG.x2.until&&(CFG.x2.daily||CFG.x2.wheel)?CFG.x2:null;
const x2m=(k,now)=>{const e=onX2(now);return e&&e[k]?2:1};
const tierPrice=(T,i,now)=>{const sl=onSale(now);return sl&&sl.tiers.includes(i)?Math.max(1,Math.round(T.price*(100-sl.pct)/100)):T.price};
const cfgOut=now=>({refBonus:CFG.refBonus,refNew:CFG.refNew,sale:onSale(now),x2:onX2(now)});
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
async function payRef(env,u,refId,now){
  const cnt=(await env.DB.prepare('SELECT COUNT(*) n FROM refs WHERE ref=? AND paid=1').bind(refId).first()).n;
  const fl=await env.DB.prepare('UPDATE refs SET paid=1,hold=0 WHERE user=? AND paid=0').bind(u.id).run();
  if(fl.meta.changes!==1)return 0;
  const st=[env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=?').bind(CFG.refNew,u.id)];
  const pay=cnt<REF_MAX;
  if(pay)st.push(env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=?').bind(CFG.refBonus,refId));
  await env.DB.batch(st);
  u.coins+=CFG.refNew;
  if(pay)bg(notify(env,refId,`👥 По вашей ссылке пришёл ${esc(dnOf(u))}. Начислено <b>+${fmtN(CFG.refBonus)}</b> монет.`));
  return CFG.refNew;
}
/* антинакрутка: если по одной ссылке за час зарегистрировалось слишком много аккаунтов, бонусы замораживаются до решения админа */
async function refPay(env,u,now){
  const r=await env.DB.prepare('SELECT ref FROM refs WHERE user=? AND paid=0 AND hold=0').bind(u.id).first();
  if(!r)return 0;
  const burst=(await env.DB.prepare('SELECT COUNT(*) n FROM refs WHERE ref=? AND at>?').bind(r.ref,now-36e5).first()).n;
  if(burst>=CFG.refHoldN){
    await env.DB.prepare('UPDATE refs SET hold=1 WHERE ref=? AND paid=0 AND hold=0 AND at>?').bind(r.ref,now-36e5).run();
    return 0;
  }
  return payRef(env,u,r.ref,now);
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
    env.DB.prepare("SELECT (SELECT COUNT(*) FROM lots WHERE seller=? AND st='sold')+(SELECT COUNT(*) FROM auctions WHERE seller=? AND st='sold') n").bind(u.id,u.id).first(),
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
let bcBusy=0,gaBusy=0;
async function sendBroadcast(env,ids,text){
  let ok=0,bad=0;
  for(let i=0;i<ids.length;i+=20){
    const res=await Promise.all(ids.slice(i,i+20).map(id=>notify(env,id,text)));
    res.forEach(x=>x?ok++:bad++);
  }
  console.log('broadcast done',ok,bad);
}
let topCache={t:0,w:0,d:null};
function dailyOf(u,now){
  const t=dayNum(now);
  const m=x2m('daily',now),rw=m===1?REWARDS:REWARDS.map(x=>x*m);
  if(u.last_day===t)return{rewards:rw,claimed:true,done:u.streak,next:null};
  const done=u.last_day===t-1?u.streak%7:0;
  return{rewards:rw,claimed:false,done,next:done+1};
}
const wheelOf=(u,now)=>({prizes:WHEEL.map(w=>w[0]*x2m('wheel',now)),available:u.wheel_day<dayNum(now)});
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
    D.prepare("DELETE FROM lots WHERE st!='active' AND settled=1 AND created<?").bind(now-30*DAY),
    D.prepare("DELETE FROM auctions WHERE st!='active' AND ends<?").bind(now-14*DAY)
  ]);
  try{await weeklyPrizes(env,now)}catch(e){console.log('weekly',e&&e.message)}
  await settleAuctions(env,now);
  try{await wealthSweep(env,now)}catch(e){console.log('sweep',e&&e.message)}
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


/* ---------- призы недели ---------- */
const weekOf=t=>Math.floor((dayNum(t)+3)/7);          /* неделя начинается в понедельник (Астана) */
const weekStart=w=>(7*w-3)*DAY-TZ;
const NAME_CD=6e5;
async function weeklyPrizes(env,now){
  const w=weekOf(now);
  const cur=await env.DB.prepare("SELECT v FROM meta WHERE k='prize_week'").first();
  if(!cur){await env.DB.prepare("INSERT OR IGNORE INTO meta(k,v) VALUES('prize_week',?)").bind(String(w)).run();return}
  if(+cur.v>=w)return;
  const g=await env.DB.prepare("UPDATE meta SET v=? WHERE k='prize_week' AND CAST(v AS INTEGER)<?").bind(String(w),w).run();
  if(g.meta.changes!==1)return;
  const pw=w-1,a=weekStart(pw),e=weekStart(w);
  const top=(await env.DB.prepare("SELECT p.owner id,SUM(p.v) s FROM plates p JOIN users u ON u.id=p.owner WHERE p.created>=? AND p.created<? AND u.banned=0 GROUP BY p.owner ORDER BY s DESC LIMIT 3").bind(a,e).all()).results;
  if(!top.length)return;
  const st=[];
  top.forEach((r,i)=>{
    st.push(env.DB.prepare('INSERT OR IGNORE INTO weekly(week,place,user,prize,val) VALUES(?,?,?,?,?)').bind(pw,i+1,r.id,CFG.prizes[i],r.s));
    st.push(env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=? AND (SELECT changes())=1').bind(CFG.prizes[i],r.id));
  });
  await env.DB.batch(st);
  top.forEach((r,i)=>bg(notify(env,r.id,`🏆 Итоги недели: вы заняли <b>${i+1} место</b> в рейтинге. Приз <b>+${fmtN(CFG.prizes[i])}</b> монет уже на счёте.`)));
}
/* ---------- аукционы ---------- */
const AU_HOURS={1:36e5,6:216e5,24:DAY},MAX_AUC=3,AU_SNIPE=12e4;
const aucMin=a=>a.bidder?a.bid+Math.max(50,Math.ceil(a.bid*.05)):a.start;
const plateNm=async(env,id)=>{try{const r=await env.DB.prepare('SELECT data FROM plates WHERE id=?').bind(id).first();return r?plateText(JSON.parse(r.data)):'номер'}catch(e){return 'номер'}};
async function settleAuctions(env,now){
  const rows=(await env.DB.prepare("SELECT id,plate_id,seller,bid,bidder,bids FROM auctions WHERE st='active' AND ends<=? ORDER BY ends LIMIT 20").bind(now).all()).results;
  for(const a of rows){
    try{
      if(a.bidder){
        const net=Math.floor(a.bid*(100-COMM)/100);
        const res=await env.DB.batch([
          env.DB.prepare("UPDATE auctions SET st='sold' WHERE id=? AND st='active' AND ends<=? AND bids=? AND bidder=?").bind(a.id,now,a.bids,a.bidder),
          env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=? AND (SELECT changes())=1').bind(net,a.seller),
          env.DB.prepare("UPDATE plates SET owner=?,st='own' WHERE id=? AND (SELECT changes())=1").bind(a.bidder,a.plate_id)
        ]);
        if(res[0].meta.changes===1){
          const nm=esc(await plateNm(env,a.plate_id));
          bg(notify(env,a.bidder,`🔨 Аукцион выигран: номер <b>${nm}</b> теперь в вашем гараже. Ставка ${fmtN(a.bid)}.`));
          bg(notify(env,a.seller,`💰 Ваш номер <b>${nm}</b> ушёл с аукциона за ${fmtN(a.bid)}. Начислено <b>+${fmtN(net)}</b> монет.`));
          bg(achSync(env,{id:a.seller},now));
        }
      }else{
        const res=await env.DB.batch([
          env.DB.prepare("UPDATE auctions SET st='unsold' WHERE id=? AND st='active' AND ends<=? AND bidder IS NULL").bind(a.id,now),
          env.DB.prepare("UPDATE plates SET st='own' WHERE id=? AND (SELECT changes())=1").bind(a.plate_id)
        ]);
        if(res[0].meta.changes===1)bg(notify(env,a.seller,`⌛ Аукцион завершён без ставок: номер <b>${esc(await plateNm(env,a.plate_id))}</b> вернулся в гараж.`));
      }
    }catch(e){console.log('auc',e&&e.message)}
  }
}
async function ava(env,url){
  const id=+url.pathname.slice(9);
  const r=Number.isFinite(id)?await env.DB.prepare('SELECT avatar FROM users WHERE id=?').bind(id).first():null;
  if(!r||!r.avatar)return new Response('',{status:404,headers:{'cache-control':'no-store'}});
  const bin=Uint8Array.from(atob(r.avatar),c=>c.charCodeAt(0));
  return new Response(bin,{headers:{'content-type':'image/jpeg','cache-control':'public, max-age=86400'}});
}

const RAR_N=['Обычный','Необычный','Редкий','Эпичный','Легендарный','Мифический'];
/* ---------- админка: вспомогательное ---------- */
const logA=(env,u,act,target,info)=>env.DB.prepare('INSERT INTO alog(ts,admin,act,target,info) VALUES(?,?,?,?,?)').bind(Date.now(),u.id,act,target||0,String(info==null?'':info).slice(0,400)).run().catch(e=>console.log('alog',e&&e.message));
const nmOf=async(env,id)=>{const r=await env.DB.prepare('SELECT name,dname FROM users WHERE id=?').bind(id).first();return r?dnOf(r):String(id)};
const SEGS={all:'Все игроки',act7:'Активные за 7 дней',idle7:'Неактивные 7+ дней',new7:'Новые за 7 дней',rich:'Баланс от 100 000',poor:'Баланс до 2 000'};
function segSql(seg,now){
  switch(seg){
    case 'act7':return['banned=0 AND seen>?',[now-7*DAY]];
    case 'idle7':return['banned=0 AND seen<=?',[now-7*DAY]];
    case 'new7':return['banned=0 AND created>?',[now-7*DAY]];
    case 'rich':return['banned=0 AND coins>=100000',[]];
    case 'poor':return['banned=0 AND coins<2000',[]];
    default:return['banned=0',[]];
  }
}
const segOf=b=>{const k=String(b.seg||'all');if(!SEGS[k])throw new HttpErr(400,'bad');return k};
const bad=(c)=>new HttpErr(400,c||'bad');
/* ручной номер: цифры, буквы и регион задаёт админ, оценка считается по той же формуле, что и у выпавших (без случайного шума) */
function customPlate(c,dRaw,lRaw,regRaw){
  if(!C[c])throw bad('bad_c');
  const uaby=c==='UA'||c==='BY',n=uaby?4:3,nl=uaby?2:3;
  const d=String(dRaw||'').trim();
  if(!new RegExp('^\\d{'+n+'}$').test(d))throw bad('bad_d');
  const code=String(regRaw||'').trim().toUpperCase();
  const reg=C[c].reg.find(r=>String(r[0]).toUpperCase()===code);
  if(!reg)throw bad('bad_reg');
  const m=CMB[c],Ls=[...m.L],L=String(lRaw||'').toUpperCase().replace(/\s/g,'');
  if([...L].length!==nl||![...L].every(ch=>Ls.includes(ch)))throw bad('bad_l');
  const g2=m.g2||[],g3=m.g3||[],g4=m.g4||[],caps=CAP[c];
  let gl=0,lt=null;
  if(c==='UA'){
    if(L===reg[0]){gl=caps.includes(reg[0])?4:3;lt='Буквы как у региона'}
    else if(g2.includes(L)){gl=2;lt='Серия '+L}
    else if(dup(L)){gl=1;lt='Двойные буквы'}
  }else if(c==='BY'){
    if(g4.includes(L)){gl=4;lt='Серия '+L}
    else if(dup(L)&&caps.includes(reg[0])){gl=3;lt='Минск · двойные буквы'}
    else if(g2.includes(L)){gl=2;lt='Серия '+L}
    else if(dup(L)){gl=1;lt='Двойные буквы'}
  }else{
    if(g4.includes(L)){gl=4;lt='Серия '+L}
    else if(g3.includes(L)){gl=3;lt='Серия '+L}
    else if(g2.includes(L)){gl=2;lt='Серия '+L}
    else if(dup(L)){gl=1;lt='Двойные буквы'}
  }
  const p={id:uid(),c,rar:0,d,reg:reg[0],regName:reg[1]};
  if(c==='KZ')p.l=L;
  if(c==='RU'){p.l1=L[0];p.l2=L.slice(1)}
  if(c==='UA'){p.pre=reg[0];p.suf=L}
  if(c==='BY')p.l=L;
  p.tags=[digitTag(d),lt,reg[2]>=1.4?'Столичный регион':null].filter(Boolean);
  const dm=digitMult(d),lm=lmOf(c,L,gl),rm=reg[2];
  p.mx=[dm,lm,rm];p.v=nice(UNIT*dm*lm*rm);p.rar=rarOf(p.v);
  return{p,warn:banned(c,L)?'Нежелательная комбинация букв':''};
}
async function plateOwnerByKey(env,p){
  const rows=(await env.DB.prepare("SELECT id,owner,st,data FROM plates WHERE c=? AND json_extract(data,'$.d')=?").bind(p.c,p.d).all()).results;
  const k=plateKey(p),r=rows.find(x=>plateKey(JSON.parse(x.data))===k);
  return r?{id:r.id,owner:r.owner,st:r.st}:null;
}
/* снять номер с рынка/аукциона (с возвратом ставки) перед удалением или передачей */
async function unlistPlate(env,plateId,now){
  const lot=await env.DB.prepare("SELECT id FROM lots WHERE plate_id=? AND st='active'").bind(plateId).first();
  if(lot)await env.DB.batch([
    env.DB.prepare("UPDATE lots SET st='cancelled',settled=1 WHERE id=? AND st='active'").bind(lot.id),
    env.DB.prepare("UPDATE plates SET st='own' WHERE id=?").bind(plateId)]);
  const a=await env.DB.prepare("SELECT id,bid,bidder,seller FROM auctions WHERE plate_id=? AND st='active'").bind(plateId).first();
  if(a){
    const st=[env.DB.prepare("UPDATE auctions SET st='cancelled' WHERE id=? AND st='active'").bind(a.id)];
    if(a.bidder){st.push(env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=? AND (SELECT changes())=1').bind(a.bid,a.bidder));bg(notify(env,a.bidder,`↩️ Аукцион отменён администратором. Ставка ${fmtN(a.bid)} возвращена.`))}
    st.push(env.DB.prepare("UPDATE plates SET st='own' WHERE id=?").bind(plateId));
    await env.DB.batch(st);
  }
}
/* антианомалии: раз в 15 минут сравниваем баланс активных игроков со снимком */
let lastSweep=0;
async function wealthSweep(env,now){
  if(now-lastSweep<9e5)return;lastSweep=now;
  const rows=(await env.DB.prepare("SELECT id,coins,csnap,wsnap,wsnap_at,coins+COALESCE((SELECT SUM(v) FROM plates WHERE owner=users.id),0) w FROM users WHERE seen>? AND banned=0 LIMIT 500").bind(now-3*36e5).all()).results;
  for(let i=0;i<rows.length;i+=80){
    const st=[];
    for(const r of rows.slice(i,i+80)){
      if(r.wsnap_at>0&&now-r.wsnap_at<=3*36e5){
        const dc=r.coins-r.csnap,dw=r.w-r.wsnap;
        if(dc>=CFG.alertThr||dw>=CFG.alertThr*3)st.push(env.DB.prepare("INSERT INTO walert(ts,user,delta,w_from,w_to,dt) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM walert WHERE user=? AND ts>?)").bind(now,r.id,dc,r.wsnap,r.w,now-r.wsnap_at,r.id,now-36e5));
      }
      st.push(env.DB.prepare('UPDATE users SET csnap=?,wsnap=?,wsnap_at=? WHERE id=?').bind(r.coins,r.w,now,r.id));
    }
    if(st.length)await env.DB.batch(st);
  }
}

const needAdmin=(env,u)=>{if(!isAdmin(env,u.id))throw new HttpErr(403,'forbidden')};
const routes={

  /* ---------- админка ---------- */
  async 'GET /api/admin/stats'(env,u,url,now){
    needAdmin(env,u);
    const q=async(sql,...b)=>(await env.DB.prepare(sql).bind(...b).first());
    const qa=async(sql,...b)=>(await env.DB.prepare(sql).bind(...b).all()).results;
    const d1=dayNum(now),d0=d1-13,t0=d0*DAY-TZ;
    const[us,pl,lots,sold,aucA,aucS,refs,al,byRar,rich,sUsers,sPlates,sLots,sAuc]=await Promise.all([
      q('SELECT COUNT(*) n,SUM(seen>?) dau,SUM(seen>?) wau,SUM(seen>?) mau,SUM(created>?) n24,SUM(created>?) n7,SUM(banned=1) bn,SUM(mute=1) mt,COALESCE(SUM(coins),0) coins,COALESCE(SUM(spins),0) spins FROM users',now-DAY,now-7*DAY,now-30*DAY,now-DAY,now-7*DAY),
      q('SELECT COUNT(*) n,COALESCE(SUM(v),0) s FROM plates'),
      q("SELECT COUNT(*) n FROM lots WHERE st='active' AND expires>?",now),
      q("SELECT COUNT(*) n,COALESCE(SUM(price),0) s FROM lots WHERE st='sold'"),
      q("SELECT COUNT(*) n FROM auctions WHERE st='active'"),
      q("SELECT COUNT(*) n,COALESCE(SUM(bid),0) s FROM auctions WHERE st='sold'"),
      q('SELECT SUM(paid=1) p,SUM(hold=1) h FROM refs'),
      q('SELECT COUNT(*) n FROM walert WHERE seen=0'),
      qa('SELECT rar,COUNT(*) n,COALESCE(SUM(v),0) s FROM plates GROUP BY rar ORDER BY rar'),
      qa(`SELECT id,${NAME_SQL('users')} name,coins FROM users WHERE banned=0 ORDER BY coins DESC LIMIT 5`),
      qa('SELECT (created+?)/? d,COUNT(*) n FROM users WHERE created>=? GROUP BY d',TZ,DAY,t0),
      qa('SELECT (ts+?)/? d,COUNT(*) n FROM issued WHERE ts>=? GROUP BY d',TZ,DAY,t0),
      qa("SELECT (sold_at+?)/? d,COUNT(*) n FROM lots WHERE st='sold' AND sold_at>=? GROUP BY d",TZ,DAY,t0),
      qa("SELECT (ends+?)/? d,COUNT(*) n FROM auctions WHERE st='sold' AND ends>=? GROUP BY d",TZ,DAY,t0)
    ]);
    const days=Array.from({length:14},(_,i)=>d0+i),ser=rows=>days.map(d=>{const r=rows.find(x=>x.d===d);return r?r.n:0});
    const sales=ser(sLots).map((x,i)=>x+ser(sAuc)[i]);
    return{players:us.n,dau:us.dau||0,wau:us.wau||0,mau:us.mau||0,new24:us.n24||0,new7:us.n7||0,banned:us.bn||0,muted:us.mt||0,
      coins:us.coins,avgCoins:us.n?Math.round(us.coins/us.n):0,spins:us.spins,plates:pl.n,platesValue:pl.s,byRar,
      lots:lots.n,sales:sold.n,salesVolume:sold.s,commission:Math.floor(sold.s*COMM/100),
      aucActive:aucA.n,aucSold:aucS.n,aucVolume:aucS.s,refsPaid:refs.p||0,refsHold:refs.h||0,alerts:al.n,
      series:{days:days.map(d=>d*DAY-TZ),users:ser(sUsers),plates:ser(sPlates),sales},richest:rich,
      cfg:{maint:CFG.maint,banner:CFG.banner,sale:onSale(now),x2:onX2(now),prizes:CFG.prizes,refBonus:CFG.refBonus,refNew:CFG.refNew,glimit:CFG.glimit,refHoldN:CFG.refHoldN,alertThr:CFG.alertThr},
      subWarn:subErr>0&&now-subErr<36e5};
  },
  async 'GET /api/admin/users'(env,u,url,now){
    needAdmin(env,u);
    const qq=(url.searchParams.get('q')||'').trim().slice(0,40),like='%'+qq.replace(/[%_]/g,'')+'%';
    const SORT={seen:'u.seen DESC',coins:'u.coins DESC',created:'u.created DESC',plates:'pc DESC',val:'val DESC',spins:'u.spins DESC'};
    const FLT={all:'1',ban:'u.banned=1',mute:'u.mute=1',on24:`u.seen>${now-DAY}`,new24:`u.created>${now-DAY}`,idle7:`u.seen<=${now-7*DAY}`,rich:'u.coins>=100000',note:"COALESCE(u.note,'')!=''"};
    const sort=SORT[url.searchParams.get('sort')]||SORT.seen,flt=FLT[url.searchParams.get('flt')]||'1';
    const off=Math.max(0,Math.min(100000,+url.searchParams.get('off')||0));
    const W=`(?='' OR u.name LIKE ? OR u.dname LIKE ? OR u.uname LIKE ? OR CAST(u.id AS TEXT)=?) AND ${flt}`;
    const total=(await env.DB.prepare(`SELECT COUNT(*) n FROM users u WHERE ${W}`).bind(qq,like,like,like,qq).first()).n;
    const rows=(await env.DB.prepare(`SELECT u.id,${NAME_SQL('u')} name,u.uname,u.coins,u.spins,u.seen,u.banned,u.mute,u.created,u.note,(SELECT COUNT(*) FROM plates p WHERE p.owner=u.id) pc,(SELECT COALESCE(SUM(v),0) FROM plates p WHERE p.owner=u.id) val FROM users u WHERE ${W} ORDER BY ${sort} LIMIT 25 OFFSET ?`).bind(qq,like,like,like,qq,off).all()).results;
    return{total,off,users:rows.map(r=>({id:r.id,name:r.name,un:r.uname||'',coins:r.coins,spins:r.spins,seen:r.seen,banned:!!r.banned,mute:!!r.mute,created:r.created,note:r.note||'',plates:r.pc,val:r.val}))};
  },
  async 'GET /api/admin/user'(env,u,url,now){
    needAdmin(env,u);
    const id=int(url.searchParams.get('id'),1,1e15),D=env.DB;
    const r=await D.prepare('SELECT id,name,dname,uname,coins,spins,created,seen,banned,ban_reason,mute,note,streak,notify,av,photo FROM users WHERE id=?').bind(id).first();
    if(!r)throw new HttpErr(404,'nouser');
    const[agg,plates,lots,aucs,bids,rf,refN,refs2,logs,uses,wins]=await Promise.all([
      D.prepare('SELECT COUNT(*) n,COALESCE(SUM(v),0) s FROM plates WHERE owner=?').bind(id).first(),
      D.prepare('SELECT id,st,data,created FROM plates WHERE owner=? ORDER BY v DESC LIMIT 40').bind(id).all(),
      D.prepare("SELECT l.id,l.price,l.expires,p.data,p.id pid FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.seller=? AND l.st='active'").bind(id).all(),
      D.prepare("SELECT a.id,a.start,a.bid,a.bids,a.ends,p.data,p.id pid FROM auctions a JOIN plates p ON p.id=a.plate_id WHERE a.seller=? AND a.st='active'").bind(id).all(),
      D.prepare("SELECT a.id,a.bid,a.ends,p.data,p.id pid FROM auctions a JOIN plates p ON p.id=a.plate_id WHERE a.bidder=? AND a.st='active'").bind(id).all(),
      D.prepare('SELECT ref,at,paid,hold FROM refs WHERE user=?').bind(id).first(),
      D.prepare('SELECT COUNT(*) n,SUM(paid=1) p FROM refs WHERE ref=?').bind(id).first(),
      D.prepare(`SELECT r.user,r.at,r.paid,r.hold,${NAME_SQL('u')} name FROM refs r JOIN users u ON u.id=r.user WHERE r.ref=? ORDER BY r.at DESC LIMIT 10`).bind(id).all(),
      D.prepare(`SELECT l.ts,l.act,l.info,${NAME_SQL('a')} aname FROM alog l LEFT JOIN users a ON a.id=l.admin WHERE l.target=? ORDER BY l.ts DESC LIMIT 15`).bind(id).all(),
      D.prepare('SELECT code,at FROM promo_uses WHERE user=? ORDER BY at DESC LIMIT 10').bind(id).all(),
      D.prepare('SELECT week,place,prize FROM weekly WHERE user=? ORDER BY week DESC LIMIT 5').bind(id).all()
    ]);
    const referrer=rf?{id:rf.ref,name:await nmOf(env,rf.ref),paid:!!rf.paid,hold:rf.hold,at:rf.at}:null;
    return{id:r.id,name:dnOf(r),tname:r.name,un:r.uname||'',ava:avaOf(r),coins:r.coins,spins:r.spins,created:r.created,seen:r.seen,banned:!!r.banned,banReason:r.ban_reason||'',mute:!!r.mute,note:r.note||'',streak:r.streak,notify:!!r.notify,
      n:agg.n,val:agg.s,plates:plates.results.map(plateOf),
      lots:lots.results.map(x=>({id:x.id,price:x.price,expires:x.expires,plate:{...JSON.parse(x.data),id:x.pid}})),
      aucs:aucs.results.map(x=>({id:x.id,start:x.start,bid:x.bid,bids:x.bids,ends:x.ends,plate:{...JSON.parse(x.data),id:x.pid}})),
      bids:bids.results.map(x=>({id:x.id,bid:x.bid,ends:x.ends,plate:{...JSON.parse(x.data),id:x.pid}})),
      referrer,refs:{n:refN.n||0,paid:refN.p||0,list:refs2.results},log:logs.results,promos:uses.results,wins:wins.results};
  },
  async 'POST /api/admin/grant'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15),amt=int(b.amount,-1e9,1e9);
    if(!amt)throw bad();
    if(Math.abs(amt)>CFG.glimit&&!b.confirm)throw new HttpErr(409,'bigamt',{limit:CFG.glimit});
    const t=await env.DB.prepare('SELECT coins FROM users WHERE id=?').bind(id).first();
    if(!t)throw new HttpErr(404,'nouser');
    await env.DB.prepare('UPDATE users SET coins=MAX(0,coins+?) WHERE id=?').bind(amt,id).run();
    await logA(env,u,'grant',id,`${amt>0?'+':''}${amt}${b.reason?' · '+String(b.reason).slice(0,120):''}`);
    if(b.notify)bg(notify(env,id,amt>0?`🎁 Администратор начислил вам <b>+${fmtN(amt)}</b> монет${b.reason?': '+esc(String(b.reason).slice(0,120)):'.'}`:`ℹ️ Администратор списал <b>${fmtN(-amt)}</b> монет${b.reason?': '+esc(String(b.reason).slice(0,120)):'.'}`));
    return{coins:await coinsOf(env,id)};
  },
  async 'POST /api/admin/setcoins'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15),to=int(b.coins,0,1e10);
    const t=await env.DB.prepare('SELECT coins FROM users WHERE id=?').bind(id).first();
    if(!t)throw new HttpErr(404,'nouser');
    if(Math.abs(to-t.coins)>CFG.glimit&&!b.confirm)throw new HttpErr(409,'bigamt',{limit:CFG.glimit});
    await env.DB.prepare('UPDATE users SET coins=? WHERE id=?').bind(to,id).run();
    await logA(env,u,'setcoins',id,`${t.coins} → ${to}`);
    return{coins:to};
  },
  async 'POST /api/admin/ban'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15);
    if(isAdmin(env,id))throw new HttpErr(400,'bad');
    const reason=String(b.reason||'').trim().slice(0,200);
    const r=await env.DB.prepare('UPDATE users SET banned=?,ban_reason=? WHERE id=?').bind(b.banned?1:0,b.banned?reason:null,id).run();
    if(r.meta.changes!==1)throw new HttpErr(404,'nouser');
    await logA(env,u,b.banned?'ban':'unban',id,reason);
    return{banned:!!b.banned};
  },
  async 'POST /api/admin/mute'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15);
    const r=await env.DB.prepare('UPDATE users SET mute=? WHERE id=?').bind(b.mute?1:0,id).run();
    if(r.meta.changes!==1)throw new HttpErr(404,'nouser');
    await logA(env,u,b.mute?'mute':'unmute',id,'');
    return{mute:!!b.mute};
  },
  async 'POST /api/admin/note'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15),note=String(b.note||'').trim().slice(0,300);
    const r=await env.DB.prepare('UPDATE users SET note=? WHERE id=?').bind(note||null,id).run();
    if(r.meta.changes!==1)throw new HttpErr(404,'nouser');
    await logA(env,u,'note',id,note);
    return{note};
  },
  async 'POST /api/admin/resetprofile'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15),sets=[];
    if(b.name)sets.push('dname=NULL','name_at=0');
    if(b.avatar)sets.push('avatar=NULL','av=0');
    if(!sets.length)throw bad();
    const r=await env.DB.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).bind(id).run();
    if(r.meta.changes!==1)throw new HttpErr(404,'nouser');
    await logA(env,u,'resetprofile',id,(b.name?'имя ':'')+(b.avatar?'фото':''));
    return{ok:true};
  },
  async 'POST /api/admin/dm'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15),text=String(b.text||'').trim().slice(0,1000);
    if(text.length<2)throw bad();
    const ok=await notify(env,id,esc(text));
    await logA(env,u,'dm',id,text.slice(0,100));
    return{sent:ok};
  },
  /* ----- номера ----- */
  async 'GET /api/admin/plates'(env,u,url,now){
    needAdmin(env,u);
    const raw=String(url.searchParams.get('q')||'').toUpperCase().slice(0,30);
    const toks=raw.match(/[0-9]+|[A-ZА-ЯЁІЇЄ]+/g)||[];
    if(!toks.length||toks.every(t=>t.length<2))throw bad();
    const key=[...toks].sort((a,b)=>b.length-a.length)[0];
    const rows=(await env.DB.prepare(`SELECT p.id,p.owner,p.st,p.data,${NAME_SQL('u')} oname FROM plates p LEFT JOIN users u ON u.id=p.owner WHERE instr(p.data,?)>0 LIMIT 600`).bind(key).all()).results;
    const out=[];
    for(const r of rows){
      const p=JSON.parse(r.data),tx=plateText(p).toUpperCase().replace(/[\s-]/g,'');
      if(toks.every(t=>tx.includes(t)))out.push({id:r.id,st:r.st,owner:r.owner,oname:r.oname||'',text:plateText(p),plate:{...p,id:r.id}});
      if(out.length>=30)break;
    }
    return{list:out};
  },
  async 'POST /api/admin/plate-preview'(env,u,url,now,b){
    needAdmin(env,u);
    const{p,warn}=customPlate(String(b.c),b.d,b.l,b.reg);
    const taken=await plateOwnerByKey(env,p);
    const issued=await env.DB.prepare('SELECT 1 x FROM issued WHERE k=?').bind(plateKey(p)).first();
    return{plate:p,text:plateText(p),warn,taken:taken?{owner:taken.owner,oname:await nmOf(env,taken.owner)}:null,issued:!!issued};
  },
  async 'POST /api/admin/giveplate'(env,u,url,now,b){
    needAdmin(env,u);
    const id=int(b.id,1,1e15);
    if(!(await env.DB.prepare('SELECT 1 x FROM users WHERE id=?').bind(id).first()))throw new HttpErr(404,'nouser');
    let p;
    if(b.d!==undefined&&b.d!==null&&b.d!==''){
      p=customPlate(String(b.c),b.d,b.l,b.reg).p;
      const r=await env.DB.prepare('INSERT OR IGNORE INTO issued(k,ts) VALUES(?,?)').bind(plateKey(p),now).run();
      if(r.meta.changes!==1)throw new HttpErr(409,'taken');
    }else{
      const c=b.c==='ALL'||!b.c?pick(['KZ','RU','UA','BY']):String(b.c);
      if(!C[c])throw bad();
      p=await claimPlate(env,c,int(b.rar,0,5),now);
    }
    await env.DB.prepare("INSERT INTO plates(id,owner,st,c,rar,v,data,created) VALUES(?,?,'own',?,?,?,?,?)").bind(p.id,id,p.c,p.rar,p.v,JSON.stringify(strip(p)),now).run();
    await logA(env,u,'giveplate',id,`${plateText(p)} · ${p.v}`);
    bg(notify(env,id,`🎁 Администратор выдал вам номер <b>${esc(plateText(p))}</b>. Он уже в гараже.`));
    bg(achSync(env,{id},now));
    return{plate:{...p,st:'own',t:now},text:plateText(p)};
  },
  async 'POST /api/admin/delplate'(env,u,url,now,b){
    needAdmin(env,u);
    const pid=String(b.plateId||'');
    const r=await env.DB.prepare('SELECT id,owner,data FROM plates WHERE id=?').bind(pid).first();
    if(!r)throw new HttpErr(410,'gone');
    await unlistPlate(env,pid,now);
    await env.DB.prepare('DELETE FROM plates WHERE id=?').bind(pid).run();
    await logA(env,u,'delplate',r.owner,plateText(JSON.parse(r.data)));
    if(b.notify)bg(notify(env,r.owner,`ℹ️ Администратор удалил из вашего гаража номер <b>${esc(plateText(JSON.parse(r.data)))}</b>.`));
    return{ok:true};
  },
  async 'POST /api/admin/transfer'(env,u,url,now,b){
    needAdmin(env,u);
    const pid=String(b.plateId||''),to=int(b.to,1,1e15);
    const r=await env.DB.prepare('SELECT id,owner,data FROM plates WHERE id=?').bind(pid).first();
    if(!r)throw new HttpErr(410,'gone');
    if(r.owner===to)throw bad();
    if(!(await env.DB.prepare('SELECT 1 x FROM users WHERE id=?').bind(to).first()))throw new HttpErr(404,'nouser');
    await unlistPlate(env,pid,now);
    await env.DB.prepare("UPDATE plates SET owner=?,st='own' WHERE id=?").bind(to,pid).run();
    const t=plateText(JSON.parse(r.data));
    await logA(env,u,'transfer',to,`${t} от ${r.owner}`);
    bg(notify(env,to,`🎁 Вам передан номер <b>${esc(t)}</b>.`));
    bg(notify(env,r.owner,`ℹ️ Номер <b>${esc(t)}</b> передан другому игроку администратором.`));
    return{ok:true};
  },
  /* ----- рынок: лоты, аукционы, сделки ----- */
  async 'GET /api/admin/lots'(env,u,url,now){
    needAdmin(env,u);
    const rows=(await env.DB.prepare("SELECT l.id,l.price,l.seller,(SELECT COALESCE(NULLIF(dname,''),name) FROM users WHERE id=l.seller) seller_name,l.expires,l.v,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.st='active' ORDER BY l.created DESC LIMIT 60").all()).results;
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
    await logA(env,u,'lot-cancel',lot.seller,id);
    return{ok:true};
  },
  async 'GET /api/admin/auctions'(env,u,url,now){
    needAdmin(env,u);
    const SQ=`SELECT a.id,a.st,a.start,a.bid,a.bids,a.ends,a.seller,a.bidder,p.data,p.id pid,${NAME_SQL('su')} sname,${NAME_SQL('bu')} bname FROM auctions a JOIN plates p ON p.id=a.plate_id JOIN users su ON su.id=a.seller LEFT JOIN users bu ON bu.id=a.bidder`;
    const act=(await env.DB.prepare(SQ+" WHERE a.st='active' ORDER BY a.ends ASC LIMIT 60").all()).results;
    const row=r=>({id:r.id,st:r.st,start:r.start,bid:r.bidder?r.bid:0,bids:r.bids,ends:r.ends,seller:{id:r.seller,name:r.sname},leader:r.bidder?{id:r.bidder,name:r.bname}:null,plate:{...JSON.parse(r.data),id:r.pid}});
    return{list:act.map(row),now};
  },
  async 'POST /api/admin/auc-cancel'(env,u,url,now,b){
    needAdmin(env,u);
    const id=String(b.id||'');
    const a=await env.DB.prepare("SELECT id,plate_id,seller,bid,bidder,st FROM auctions WHERE id=?").bind(id).first();
    if(!a||a.st!=='active')throw new HttpErr(410,'gone');
    const st=[env.DB.prepare("UPDATE auctions SET st='cancelled' WHERE id=? AND st='active'").bind(id)];
    if(a.bidder)st.push(env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=? AND (SELECT changes())=1').bind(a.bid,a.bidder));
    st.push(env.DB.prepare("UPDATE plates SET st='own' WHERE id=? AND EXISTS(SELECT 1 FROM auctions WHERE id=? AND st='cancelled')").bind(a.plate_id,id));
    const res=await env.DB.batch(st);
    if(res[0].meta.changes!==1)throw new HttpErr(410,'gone');
    const nm=esc(await plateNm(env,a.plate_id));
    bg(notify(env,a.seller,`ℹ️ Администратор отменил аукцион номера <b>${nm}</b>. Номер вернулся в гараж.`));
    if(a.bidder)bg(notify(env,a.bidder,`↩️ Аукцион номера <b>${nm}</b> отменён. Ваша ставка ${fmtN(a.bid)} возвращена.`));
    await logA(env,u,'auc-cancel',a.seller,`${id} ${a.bidder?'возврат '+a.bid+' → '+a.bidder:''}`);
    return{ok:true};
  },
  async 'GET /api/admin/deals'(env,u,url,now){
    needAdmin(env,u);
    const N=a=>NAME_SQL(a);
    const lots=(await env.DB.prepare(`SELECT l.id,l.price,l.sold_at at,l.seller,l.buyer,${N('s')} sname,${N('b')} bname,p.data,p.id pid,p.owner FROM lots l JOIN plates p ON p.id=l.plate_id JOIN users s ON s.id=l.seller JOIN users b ON b.id=l.buyer WHERE l.st='sold' ORDER BY l.sold_at DESC LIMIT 25`).all()).results;
    const aucs=(await env.DB.prepare(`SELECT a.id,a.bid price,a.ends at,a.seller,a.bidder buyer,${N('s')} sname,${N('b')} bname,p.data,p.id pid,p.owner FROM auctions a JOIN plates p ON p.id=a.plate_id JOIN users s ON s.id=a.seller JOIN users b ON b.id=a.bidder WHERE a.st='sold' ORDER BY a.ends DESC LIMIT 25`).all()).results;
    const row=k=>r=>({kind:k,id:r.id,price:r.price,at:r.at,seller:{id:r.seller,name:r.sname},buyer:{id:r.buyer,name:r.bname},movable:r.owner===r.buyer,plate:{...JSON.parse(r.data),id:r.pid}});
    return{list:[...lots.map(row('lot')),...aucs.map(row('auc'))].sort((a,b)=>b.at-a.at).slice(0,40)};
  },
  async 'POST /api/admin/rollback'(env,u,url,now,b){
    needAdmin(env,u);
    const kind=b.kind==='auc'?'auc':'lot',id=String(b.id||'');
    let d;
    if(kind==='lot')d=await env.DB.prepare("SELECT id,plate_id,seller,buyer,price,st FROM lots WHERE id=?").bind(id).first();
    else{d=await env.DB.prepare("SELECT id,plate_id,seller,bidder buyer,bid price,st FROM auctions WHERE id=?").bind(id).first()}
    if(!d||d.st!=='sold')throw new HttpErr(410,'gone');
    const pl=await env.DB.prepare('SELECT owner,st FROM plates WHERE id=?').bind(d.plate_id).first();
    if(!pl||pl.owner!==d.buyer||pl.st!=='own')throw new HttpErr(409,'moved');
    const net=Math.floor(d.price*(100-COMM)/100);
    const sc=(await env.DB.prepare('SELECT coins FROM users WHERE id=?').bind(d.seller).first()||{coins:0}).coins;
    const tbl=kind==='lot'?'lots':'auctions';
    const res=await env.DB.batch([
      env.DB.prepare(`UPDATE plates SET owner=? WHERE id=? AND owner=? AND st='own' AND EXISTS(SELECT 1 FROM ${tbl} WHERE id=? AND st='sold')`).bind(d.seller,d.plate_id,d.buyer,id),
      env.DB.prepare(`UPDATE ${tbl} SET st='rolled' WHERE id=? AND st='sold' AND (SELECT changes())=1`).bind(id),
      env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=? AND (SELECT changes())=1').bind(d.price,d.buyer),
      env.DB.prepare('UPDATE users SET coins=MAX(0,coins-?) WHERE id=? AND (SELECT changes())=1').bind(net,d.seller)
    ]);
    if(res[1].meta.changes!==1)throw new HttpErr(409,'moved');
    const nm=esc(await plateNm(env,d.plate_id));
    bg(notify(env,d.buyer,`↩️ Сделка по номеру <b>${nm}</b> отменена администратором. Вам возвращено <b>${fmtN(d.price)}</b> монет.`));
    bg(notify(env,d.seller,`↩️ Сделка по номеру <b>${nm}</b> отменена администратором. Номер вернулся в гараж, ${fmtN(net)} монет списано.`));
    await logA(env,u,'rollback',d.buyer,`${kind} ${id}: ${d.price} монет, продавец ${d.seller}${sc<net?' (не хватило '+(net-sc)+')':''}`);
    return{ok:true,short:Math.max(0,net-sc)};
  },
  /* ----- промокоды ----- */
  async 'GET /api/admin/promos'(env,u,url,now){
    needAdmin(env,u);
    const rows=(await env.DB.prepare('SELECT code,coins,max,used,expires,active,created,plate_rar,plate_c FROM promos ORDER BY created DESC LIMIT 100').all()).results;
    return{promos:rows.map(r=>({code:r.code,coins:r.coins,max:r.max,used:r.used,expires:r.expires,active:!!r.active,created:r.created,plateRar:r.plate_rar,plateC:r.plate_c||'ALL'}))};
  },
  async 'POST /api/admin/promo'(env,u,url,now,b){
    needAdmin(env,u);
    let code=normCode(b.code);
    if(!code){const al='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=new Uint8Array(8);crypto.getRandomValues(a);code=[...a].map(x=>al[x%al.length]).join('')}
    if(!CODE_RE.test(code))throw new HttpErr(400,'bad');
    const rar=b.rar===undefined||b.rar===null||b.rar===''?-1:int(b.rar,-1,5),pc=b.plateC&&b.plateC!=='ALL'?String(b.plateC):null;
    if(pc&&!C[pc])throw bad();
    const coins=int(b.coins||0,rar>=0?0:1,1e9),max=int(b.max||0,0,1e7),days=int(b.days||0,0,3650);
    const r=await env.DB.prepare('INSERT OR IGNORE INTO promos(code,coins,max,expires,created,plate_rar,plate_c) VALUES(?,?,?,?,?,?,?)').bind(code,coins,max,days?now+days*DAY:0,now,rar,pc).run();
    if(r.meta.changes!==1)throw new HttpErr(409,'exists');
    await logA(env,u,'promo-new',0,`${code}: ${coins} монет${rar>=0?', номер '+RAR_N[rar]:''}, лимит ${max||'∞'}`);
    return{code};
  },
  async 'POST /api/admin/promo-toggle'(env,u,url,now,b){
    needAdmin(env,u);
    const r=await env.DB.prepare('UPDATE promos SET active=? WHERE code=?').bind(b.active?1:0,normCode(b.code)).run();
    if(r.meta.changes!==1)throw new HttpErr(404,'nopromo');
    await logA(env,u,b.active?'promo-on':'promo-off',0,normCode(b.code));
    return{active:!!b.active};
  },
  async 'POST /api/admin/promo-del'(env,u,url,now,b){
    needAdmin(env,u);
    const code=normCode(b.code);
    const res=await env.DB.batch([env.DB.prepare('DELETE FROM promos WHERE code=?').bind(code),env.DB.prepare('DELETE FROM promo_uses WHERE code=?').bind(code)]);
    if(res[0].meta.changes!==1)throw new HttpErr(404,'nopromo');
    await logA(env,u,'promo-del',0,code);
    return{ok:true};
  },
  async 'GET /api/admin/promo-uses'(env,u,url,now){
    needAdmin(env,u);
    const code=normCode(url.searchParams.get('code'));
    const rows=(await env.DB.prepare(`SELECT pu.user,pu.at,${NAME_SQL('u')} name FROM promo_uses pu LEFT JOIN users u ON u.id=pu.user WHERE pu.code=? ORDER BY pu.at DESC LIMIT 40`).bind(code).all()).results;
    return{list:rows};
  },
  /* ----- рассылки и раздачи ----- */
  async 'GET /api/admin/audience'(env,u,url,now){
    needAdmin(env,u);
    const[w,a]=segSql(String(url.searchParams.get('seg')||'all'),now);
    const r=await env.DB.prepare(`SELECT COUNT(*) n,SUM(notify=1) r FROM users WHERE ${w}`).bind(...a).first();
    return{all:r.n,reach:r.r||0};
  },
  async 'POST /api/admin/broadcast'(env,u,url,now,b){
    needAdmin(env,u);
    const text=String(b.text||'').trim().slice(0,1500);
    if(text.length<2)throw new HttpErr(400,'bad');
    const body=esc(text);
    if(b.test){const ok=await notify(env,u.id,body);return{sent:ok?1:0,test:true}}
    if(bcBusy&&now-bcBusy<2e4)throw new HttpErr(429,'busy');
    const seg=segOf(b),[w,a]=segSql(seg,now);
    bcBusy=now;
    const ids=(await env.DB.prepare(`SELECT id FROM users WHERE notify=1 AND ${w}`).bind(...a).all()).results.map(r=>r.id);
    bg(sendBroadcast(env,ids,body));
    await logA(env,u,'broadcast',0,`${SEGS[seg]}: ${ids.length} · ${text.slice(0,80)}`);
    return{queued:ids.length};
  },
  async 'POST /api/admin/grant-all'(env,u,url,now,b){
    needAdmin(env,u);
    const amt=int(b.amount,1,1e7),seg=segOf(b),[w,a]=segSql(seg,now);
    if(gaBusy&&now-gaBusy<5e3)throw new HttpErr(429,'busy');
    gaBusy=now;
    const r=await env.DB.prepare(`UPDATE users SET coins=coins+? WHERE ${w}`).bind(amt,...a).run();
    const text=String(b.text||'').trim().slice(0,300);
    if(b.notify){
      const ids=(await env.DB.prepare(`SELECT id FROM users WHERE notify=1 AND ${w}`).bind(...a).all()).results.map(x=>x.id);
      bg(sendBroadcast(env,ids,`🎁 Вам начислено <b>+${fmtN(amt)}</b> монет${text?': '+esc(text):'.'}`));
    }
    await logA(env,u,'grant-all',0,`${SEGS[seg]}: +${amt} × ${r.meta.changes}${text?' · '+text:''}`);
    return{count:r.meta.changes};
  },
  async 'POST /api/admin/grant-list'(env,u,url,now,b){
    needAdmin(env,u);
    const rows=(Array.isArray(b.rows)?b.rows:[]).slice(0,200).map(x=>({id:int(x.id,1,1e15),amount:int(x.amount,-1e9,1e9)})).filter(x=>x.amount);
    if(!rows.length)throw bad();
    if(!b.confirm&&rows.some(x=>Math.abs(x.amount)>CFG.glimit))throw new HttpErr(409,'bigamt',{limit:CFG.glimit});
    const res=await env.DB.batch(rows.map(x=>env.DB.prepare('UPDATE users SET coins=MAX(0,coins+?) WHERE id=?').bind(x.amount,x.id)));
    const ok=[],fail=[];rows.forEach((x,i)=>(res[i].meta.changes===1?ok:fail).push(x.id));
    const text=String(b.text||'').trim().slice(0,200);
    if(b.notify)rows.filter((x,i)=>res[i].meta.changes===1&&x.amount>0).forEach(x=>bg(notify(env,x.id,`🎁 Вам начислено <b>+${fmtN(x.amount)}</b> монет${text?': '+esc(text):'.'}`)));
    await logA(env,u,'grant-list',0,`${ok.length} игрокам, сумма ${rows.reduce((a,x,i)=>a+(res[i].meta.changes===1?x.amount:0),0)}${text?' · '+text:''}`);
    return{ok:ok.length,fail};
  },
  /* ----- рефералы: антинакрутка ----- */
  async 'GET /api/admin/refs'(env,u,url,now){
    needAdmin(env,u);
    const D=env.DB,N=NAME_SQL;
    const hold=(await D.prepare(`SELECT r.user,r.ref,r.at,${N('u')} uname,${N('rr')} rname FROM refs r JOIN users u ON u.id=r.user JOIN users rr ON rr.id=r.ref WHERE r.hold=1 ORDER BY r.at DESC LIMIT 100`).all()).results;
    const top=(await D.prepare(`SELECT r.ref,COUNT(*) n,SUM(r.paid=1) paid,SUM(r.hold=1) held,MIN(r.at) a,MAX(r.at) b,${N('rr')} name,rr.banned FROM refs r JOIN users rr ON rr.id=r.ref GROUP BY r.ref ORDER BY n DESC LIMIT 20`).all()).results;
    return{hold,top:top.map(r=>({ref:r.ref,name:r.name,n:r.n,paid:r.paid||0,held:r.held||0,first:r.a,last:r.b,banned:!!r.banned,fast:r.n>=CFG.refHoldN&&(r.b-r.a)<=r.n*6e5}))};
  },
  async 'POST /api/admin/ref-approve'(env,u,url,now,b){
    needAdmin(env,u);
    const uid_=int(b.user,1,1e15);
    const r=await env.DB.prepare('SELECT ref FROM refs WHERE user=? AND hold=1 AND paid=0').bind(uid_).first();
    if(!r)throw new HttpErr(410,'gone');
    const us=await env.DB.prepare('SELECT id,name,dname,coins FROM users WHERE id=?').bind(uid_).first();
    if(!us)throw new HttpErr(404,'nouser');
    await env.DB.prepare('UPDATE refs SET hold=0 WHERE user=?').bind(uid_).run();
    await payRef(env,us,r.ref,now);
    await logA(env,u,'ref-approve',uid_,'реферер '+r.ref);
    return{ok:true};
  },
  async 'POST /api/admin/ref-reject'(env,u,url,now,b){
    needAdmin(env,u);
    const uid_=int(b.user,1,1e15);
    const r=await env.DB.prepare('UPDATE refs SET hold=2 WHERE user=? AND hold=1 AND paid=0').bind(uid_).run();
    if(r.meta.changes!==1)throw new HttpErr(410,'gone');
    if(b.ban&&!isAdmin(env,uid_))await env.DB.prepare("UPDATE users SET banned=1,ban_reason='накрутка рефералов' WHERE id=?").bind(uid_).run();
    await logA(env,u,'ref-reject',uid_,b.ban?'с блокировкой':'');
    return{ok:true};
  },
  async 'POST /api/admin/ref-revoke'(env,u,url,now,b){
    needAdmin(env,u);
    const ref=int(b.ref,1,1e15);
    const rows=(await env.DB.prepare('SELECT user,paid FROM refs WHERE ref=?').bind(ref).all()).results;
    if(!rows.length)throw new HttpErr(404,'nouser');
    const paid=rows.filter(x=>x.paid===1),n=Math.min(paid.length,REF_MAX),st=[];
    if(n)st.push(env.DB.prepare('UPDATE users SET coins=MAX(0,coins-?) WHERE id=?').bind(n*CFG.refBonus,ref));
    for(const x of paid)st.push(env.DB.prepare('UPDATE users SET coins=MAX(0,coins-?) WHERE id=?').bind(CFG.refNew,x.user));
    st.push(env.DB.prepare('UPDATE refs SET paid=0,hold=2 WHERE ref=?').bind(ref));
    if(b.ban){
      if(!isAdmin(env,ref))st.push(env.DB.prepare("UPDATE users SET banned=1,ban_reason='накрутка рефералов' WHERE id=?").bind(ref));
      for(const x of rows)if(!isAdmin(env,x.user))st.push(env.DB.prepare("UPDATE users SET banned=1,ban_reason='накрутка рефералов' WHERE id=?").bind(x.user));
    }
    for(let i=0;i<st.length;i+=90)await env.DB.batch(st.slice(i,i+90));
    await logA(env,u,'ref-revoke',ref,`${rows.length} аккаунтов, откат ${n*CFG.refBonus}+${paid.length*CFG.refNew}${b.ban?', блокировка цепочки':''}`);
    return{accounts:rows.length,paid:paid.length};
  },
  /* ----- мониторинг ----- */
  async 'GET /api/admin/alerts'(env,u,url,now){
    needAdmin(env,u);
    const rows=(await env.DB.prepare(`SELECT w.id,w.ts,w.user,w.delta,w.w_from,w.w_to,w.dt,w.seen,${NAME_SQL('u')} name,u.coins,u.banned FROM walert w JOIN users u ON u.id=w.user ORDER BY w.ts DESC LIMIT 50`).all()).results;
    return{list:rows.map(r=>({...r,banned:!!r.banned})),thr:CFG.alertThr};
  },
  async 'POST /api/admin/alert-seen'(env,u,url,now,b){
    needAdmin(env,u);
    if(b.all)await env.DB.prepare('UPDATE walert SET seen=1').run();
    else await env.DB.prepare('UPDATE walert SET seen=1 WHERE id=?').bind(int(b.id,1,1e15)).run();
    return{ok:true};
  },
  async 'GET /api/admin/integrity'(env,u,url,now){
    needAdmin(env,u);
    const D=env.DB,one=async s=>(await D.prepare(s).first()).n;
    const KEY="c||'|'||COALESCE(json_extract(data,'$.d'),'')||'|'||COALESCE(json_extract(data,'$.l'),'')||'|'||COALESCE(json_extract(data,'$.l1'),'')||'|'||COALESCE(json_extract(data,'$.l2'),'')||'|'||COALESCE(json_extract(data,'$.pre'),'')||'|'||COALESCE(json_extract(data,'$.suf'),'')||'|'||COALESCE(json_extract(data,'$.reg'),'')";
    const[orph,badLots,badAuc,noOwner,neg,dups]=await Promise.all([
      one("SELECT COUNT(*) n FROM plates WHERE st='listed' AND id NOT IN(SELECT plate_id FROM lots WHERE st='active') AND id NOT IN(SELECT plate_id FROM auctions WHERE st='active')"),
      one("SELECT COUNT(*) n FROM lots WHERE st='active' AND plate_id NOT IN(SELECT id FROM plates WHERE st='listed')"),
      one("SELECT COUNT(*) n FROM auctions WHERE st='active' AND plate_id NOT IN(SELECT id FROM plates WHERE st='listed')"),
      one('SELECT COUNT(*) n FROM plates WHERE owner NOT IN(SELECT id FROM users)'),
      one('SELECT COUNT(*) n FROM users WHERE coins<0'),
      (await D.prepare(`SELECT ${KEY} k,COUNT(*) n FROM plates GROUP BY k HAVING n>1 LIMIT 20`).all()).results
    ]);
    const bids=await D.prepare("SELECT COALESCE(SUM(bid),0) s,COUNT(*) n FROM auctions WHERE st='active' AND bidder IS NOT NULL").first();
    return{orphans:orph,badLots,badAuc,noOwner,negative:neg,dups:dups.map(d=>({key:d.k.replace(/\|+/g,' '),n:d.n})),escrow:bids.s,escrowN:bids.n,at:now};
  },
  async 'POST /api/admin/integrity-fix'(env,u,url,now,b){
    needAdmin(env,u);
    let n=0;
    if(b.kind==='orphans'){
      const r=await env.DB.prepare("UPDATE plates SET st='own' WHERE st='listed' AND id NOT IN(SELECT plate_id FROM lots WHERE st='active') AND id NOT IN(SELECT plate_id FROM auctions WHERE st='active')").run();n=r.meta.changes;
    }else if(b.kind==='badlots'){
      const r=await env.DB.prepare("UPDATE lots SET st='cancelled',settled=1 WHERE st='active' AND plate_id NOT IN(SELECT id FROM plates WHERE st='listed')").run();n=r.meta.changes;
    }else throw bad();
    await logA(env,u,'integrity-fix',0,`${b.kind}: ${n}`);
    return{fixed:n};
  },
  /* ----- настройки, акции, события ----- */
  async 'POST /api/admin/settings'(env,u,url,now,b){
    needAdmin(env,u);
    const patch={},info=[];
    if(b.maint!==undefined){patch.maint=String(b.maint||'').trim().slice(0,300);info.push('техработы: '+(patch.maint||'выкл'))}
    if(b.banner!==undefined){const t=String(b.banner||'').trim().slice(0,500);patch.banner=t?{id:String(now),text:t}:null;info.push('объявление: '+(t?t.slice(0,40):'снято'))}
    if(b.prizes!==undefined){
      if(!Array.isArray(b.prizes)||b.prizes.length!==3)throw bad();
      patch.prizes=b.prizes.map(x=>int(x,0,1e8));info.push('призы: '+patch.prizes.join('/'));
    }
    if(b.refBonus!==undefined){patch.refBonus=int(b.refBonus,0,1e7);info.push('реф-бонус '+patch.refBonus)}
    if(b.refNew!==undefined){patch.refNew=int(b.refNew,0,1e7);info.push('бонус новичку '+patch.refNew)}
    if(b.glimit!==undefined){patch.glimit=int(b.glimit,1000,1e9);info.push('лимит выдачи '+patch.glimit)}
    if(b.refHoldN!==undefined){patch.refHoldN=int(b.refHoldN,2,1000);info.push('порог рефералов '+patch.refHoldN)}
    if(b.alertThr!==undefined){patch.alertThr=int(b.alertThr,1000,1e10);info.push('порог алерта '+patch.alertThr)}
    if(b.sale!==undefined){
      if(!b.sale||!b.sale.pct){patch.sale=null;info.push('акция выкл')}
      else{
        const tiers=(Array.isArray(b.sale.tiers)?b.sale.tiers:[]).map(x=>int(x,0,TIERS.length-1));
        if(!tiers.length)throw bad();
        patch.sale={pct:int(b.sale.pct,1,90),tiers:[...new Set(tiers)],until:now+int(b.sale.hours,1,24*30)*36e5};
        info.push(`акция −${patch.sale.pct}% на ${patch.sale.tiers.map(x=>x+1).join(',')}`);
      }
    }
    if(b.x2!==undefined){
      if(!b.x2||(!b.x2.daily&&!b.x2.wheel)){patch.x2=null;info.push('×2 выкл')}
      else{patch.x2={daily:!!b.x2.daily,wheel:!!b.x2.wheel,until:now+int(b.x2.hours,1,24*30)*36e5};info.push('×2 '+[b.x2.daily?'награды':'',b.x2.wheel?'колесо':''].filter(Boolean).join('+'))}
    }
    if(!info.length)throw bad();
    await saveCfg(env,patch,now);
    await logA(env,u,'settings',0,info.join('; '));
    return{cfg:{maint:CFG.maint,banner:CFG.banner,sale:onSale(now),x2:onX2(now),prizes:CFG.prizes,refBonus:CFG.refBonus,refNew:CFG.refNew,glimit:CFG.glimit,refHoldN:CFG.refHoldN,alertThr:CFG.alertThr}};
  },
  async 'GET /api/admin/log'(env,u,url,now){
    needAdmin(env,u);
    const off=Math.max(0,Math.min(100000,+url.searchParams.get('off')||0));
    const rows=(await env.DB.prepare(`SELECT l.ts,l.act,l.target,l.info,${NAME_SQL('a')} aname,${NAME_SQL('t')} tname FROM alog l LEFT JOIN users a ON a.id=l.admin LEFT JOIN users t ON t.id=l.target ORDER BY l.id DESC LIMIT 40 OFFSET ?`).bind(off).all()).results;
    return{list:rows,off};
  },
  async 'GET /api/ref'(env,u,url,now){
    const r=await env.DB.prepare('SELECT COUNT(*) n FROM refs WHERE ref=? AND paid=1').bind(u.id).first();
    return{link:`https://t.me/${BOT_USER}?start=ref_${u.id}`,count:r.n,earned:Math.min(r.n,REF_MAX)*CFG.refBonus,bonus:CFG.refBonus,newBonus:CFG.refNew,max:REF_MAX};
  },
  async 'GET /api/top'(env,u,url,now){
    await housekeeping(env,now);
    const w=weekOf(now),ws=weekStart(w),we=weekStart(w+1);
    if(now-topCache.t>3e4||!topCache.d||topCache.w!==w){
      const D=env.DB,N=NAME_SQL('u');
      const[val,pl,wk,last]=await Promise.all([
        D.prepare(`SELECT u.id,${N} name,u.av,u.photo,SUM(p.v) s,COUNT(*) n FROM plates p JOIN users u ON u.id=p.owner WHERE u.banned=0 GROUP BY p.owner ORDER BY s DESC LIMIT 20`).all(),
        D.prepare(`SELECT p.data,p.id,u.id uid,${N} name,u.av,u.photo FROM plates p JOIN users u ON u.id=p.owner WHERE u.banned=0 ORDER BY p.v DESC LIMIT 20`).all(),
        D.prepare(`SELECT u.id,${N} name,u.av,u.photo,SUM(p.v) s,COUNT(*) n FROM plates p JOIN users u ON u.id=p.owner WHERE p.created>=? AND u.banned=0 GROUP BY p.owner ORDER BY s DESC LIMIT 20`).bind(ws).all(),
        D.prepare(`SELECT w.week,w.place,w.prize,w.val,u.id,${N} name,u.av,u.photo FROM weekly w JOIN users u ON u.id=w.user WHERE w.week=(SELECT MAX(week) FROM weekly) ORDER BY w.place`).all()
      ]);
      topCache={t:now,w,d:{val:val.results,pl:pl.results,wk:wk.results,last:last.results}};
    }
    const mine=await env.DB.prepare('SELECT COALESCE(SUM(v),0) s,COUNT(*) n FROM plates WHERE owner=?').bind(u.id).first();
    const rank=mine.n?(await env.DB.prepare('SELECT COUNT(*)+1 r FROM (SELECT owner FROM plates GROUP BY owner HAVING SUM(v)>?)').bind(mine.s).first()).r:null;
    const mw=await env.DB.prepare('SELECT COALESCE(SUM(v),0) s,COUNT(*) n FROM plates WHERE owner=? AND created>=?').bind(u.id,ws).first();
    const rw=mw.n?(await env.DB.prepare('SELECT COUNT(*)+1 r FROM (SELECT owner FROM plates WHERE created>=? GROUP BY owner HAVING SUM(v)>?)').bind(ws,mw.s).first()).r:null;
    const row=(r,extra)=>({id:r.id,name:r.name,ava:avaOf(r),me:r.id===u.id,...extra});
    const d=topCache.d;
    return{
      value:d.val.map(r=>row(r,{s:r.s,n:r.n})),
      plates:d.pl.map(r=>({id:r.uid,name:r.name,ava:avaOf({id:r.uid,av:r.av,photo:r.photo}),me:r.uid===u.id,plate:{...JSON.parse(r.data),id:r.id}})),
      week:{list:d.wk.map(r=>row(r,{s:r.s,n:r.n})),me:{s:mw.s,n:mw.n,rank:rw},start:ws,end:we,prizes:CFG.prizes,
        last:d.last.map(r=>row(r,{place:r.place,prize:r.prize,s:r.val}))},
      me:{s:mine.s,n:mine.n,rank}
    };
  },
  async 'GET /api/player'(env,u,url,now){
    const id=int(url.searchParams.get('id'),1,1e15);
    const r=await env.DB.prepare('SELECT id,name,dname,photo,av,spins,created,banned FROM users WHERE id=?').bind(id).first();
    if(!r||(r.banned&&!isAdmin(env,u.id)))throw new HttpErr(404,'nouser');
    const[agg,top,wins]=await Promise.all([
      env.DB.prepare('SELECT COUNT(*) n,COALESCE(SUM(v),0) s FROM plates WHERE owner=?').bind(id).first(),
      env.DB.prepare('SELECT id,st,data,created FROM plates WHERE owner=? ORDER BY v DESC LIMIT 5').bind(id).all(),
      env.DB.prepare('SELECT place,COUNT(*) n FROM weekly WHERE user=? GROUP BY place').bind(id).all()
    ]);
    const wn={1:0,2:0,3:0};wins.results.forEach(x=>{wn[x.place]=x.n});
    return{id,name:dnOf(r),ava:avaOf(r),spins:r.spins,since:r.created,n:agg.n,total:agg.s,top:top.results.map(plateOf),wins:wn,me:id===u.id};
  },
  async 'POST /api/profile'(env,u,url,now,b){
    const sets=[],args=[];
    if(b.resetName)sets.push('dname=NULL');
    else if(typeof b.name==='string'){
      const nm=b.name.replace(/\s+/g,' ').trim();
      if(nm!==dnOf(u)){
        if(!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,19}$/u.test(nm)||/админ|admin|support|поддержк|layer|модератор/i.test(nm))throw new HttpErr(400,'badname');
        if(now-u.name_at<NAME_CD)throw new HttpErr(429,'namewait',{wait:u.name_at+NAME_CD-now});
        sets.push('dname=?','name_at=?');args.push(nm,now);
      }
    }
    if(b.resetAvatar)sets.push('avatar=NULL','av=0');
    else if(typeof b.avatar==='string'){
      const m=/^data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)$/.exec(b.avatar);
      if(!m||m[1].length>70000||!m[1].startsWith('/9j/'))throw new HttpErr(400,'badava');
      sets.push('avatar=?','av=?');args.push(m[1],now);
    }
    if(sets.length)await env.DB.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).bind(...args,u.id).run();
    const u2=await env.DB.prepare('SELECT id,name,dname,photo,av,coins,spins FROM users WHERE id=?').bind(u.id).first();
    return{user:userOut(u2,env)};
  },
  /* ---------- аукционы ---------- */
  async 'GET /api/auctions'(env,u,url,now){
    await settleAuctions(env,now);
    const SQ=`SELECT a.*,p.data,${NAME_SQL('su')} sname,su.av sav,su.photo sphoto,${NAME_SQL('bu')} bname FROM auctions a JOIN plates p ON p.id=a.plate_id JOIN users su ON su.id=a.seller LEFT JOIN users bu ON bu.id=a.bidder`;
    const act=(await env.DB.prepare(SQ+" WHERE a.st='active' AND a.ends>? ORDER BY a.ends ASC LIMIT 60").bind(now).all()).results;
    const done=(await env.DB.prepare(SQ+" WHERE a.st IN('sold','unsold') AND (a.seller=? OR a.bidder=?) AND a.ends>? ORDER BY a.ends DESC LIMIT 10").bind(u.id,u.id,now-7*DAY).all()).results;
    const row=r=>({id:r.id,st:r.st,start:r.start,bid:r.bidder?r.bid:0,bids:r.bids,min:aucMin(r),ends:r.ends,v:r.v,
      seller:{id:r.seller,name:r.sname,ava:avaOf({id:r.seller,av:r.sav,photo:r.sphoto})},leader:r.bidder?{id:r.bidder,name:r.bname}:null,
      mine:r.seller===u.id,leading:r.bidder===u.id,net:r.st==='sold'?Math.floor(r.bid*(100-COMM)/100):0,plate:{...JSON.parse(r.data),id:r.plate_id}});
    return{list:act.map(row),done:done.map(row),now,max:MAX_AUC};
  },
  async 'POST /api/auction/create'(env,u,url,now,b){
    if(u.mute)throw new HttpErr(403,'muted');
    const id=String(b.plateId||''),hours=int(b.hours,1,24);
    if(!AU_HOURS[hours])throw new HttpErr(400,'bad');
    const p=await env.DB.prepare("SELECT id,c,rar,v FROM plates WHERE id=? AND owner=? AND st='own'").bind(id,u.id).first();
    if(!p)throw new HttpErr(409,'gone');
    const start=int(b.start,Math.max(100,Math.ceil(p.v*SELL)),Math.ceil(p.v*3));
    const cnt=(await env.DB.prepare("SELECT COUNT(*) n FROM auctions WHERE seller=? AND st='active'").bind(u.id).first()).n;
    if(cnt>=MAX_AUC)throw new HttpErr(409,'limit');
    const aid=uid(),ends=now+AU_HOURS[hours];
    const res=await env.DB.batch([
      env.DB.prepare("INSERT INTO auctions(id,plate_id,seller,start,created,ends,c,rar,v) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM plates WHERE id=? AND owner=? AND st='own')").bind(aid,id,u.id,start,now,ends,p.c,p.rar,p.v,id,u.id),
      env.DB.prepare("UPDATE plates SET st='listed' WHERE id=? AND owner=? AND st='own' AND (SELECT changes())=1").bind(id,u.id)
    ]);
    if(res[0].meta.changes!==1)throw new HttpErr(409,'gone');
    return{id:aid,ends};
  },
  async 'POST /api/auction/bid'(env,u,url,now,b){
    const id=String(b.id||''),amt=int(b.amount,1,1e9);
    const a=await env.DB.prepare('SELECT id,seller,start,bid,bidder,bids,ends,st,plate_id FROM auctions WHERE id=?').bind(id).first();
    if(!a||a.st!=='active'||a.ends<=now)throw new HttpErr(410,'gone');
    if(a.seller===u.id)throw new HttpErr(400,'own');
    if(a.bidder===u.id)throw new HttpErr(409,'lead');
    const min=aucMin(a);
    if(amt<min)throw new HttpErr(409,'low',{min});
    if(u.coins<amt)throw new HttpErr(402,'coins');
    const ends=Math.max(a.ends,now+AU_SNIPE);
    const st=[
      env.DB.prepare("UPDATE auctions SET bid=?,bidder=?,bids=bids+1,ends=? WHERE id=? AND st='active' AND ends>? AND seller!=? AND bids=? AND COALESCE(bidder,0)=? AND (SELECT coins FROM users WHERE id=?)>=?").bind(amt,u.id,ends,id,now,u.id,a.bids,a.bidder||0,u.id,amt),
      env.DB.prepare('UPDATE users SET coins=coins-? WHERE id=? AND (SELECT changes())=1').bind(amt,u.id)
    ];
    if(a.bidder)st.push(env.DB.prepare('UPDATE users SET coins=coins+? WHERE id=? AND (SELECT changes())=1').bind(a.bid,a.bidder));
    const res=await env.DB.batch(st);
    if(res[0].meta.changes!==1){
      const c=await env.DB.prepare('SELECT bid,bidder,start,st,ends FROM auctions WHERE id=?').bind(id).first();
      if(!c||c.st!=='active'||c.ends<=now)throw new HttpErr(410,'gone');
      if(c.bidder===u.id)throw new HttpErr(409,'lead');
      throw new HttpErr(409,'low',{min:aucMin(c)});
    }
    if(a.bidder)bg((async()=>notify(env,a.bidder,`📈 Вашу ставку на номер <b>${esc(await plateNm(env,a.plate_id))}</b> перебили: теперь ${fmtN(amt)}. Ваши ${fmtN(a.bid)} вернулись на счёт.`))());
    return{coins:u.coins-amt,bid:amt,ends,min:aucMin({bidder:u.id,bid:amt,start:a.start})};
  },
  async 'POST /api/auction/cancel'(env,u,url,now,b){
    const id=String(b.id||'');
    const res=await env.DB.batch([
      env.DB.prepare("UPDATE auctions SET st='cancelled' WHERE id=? AND seller=? AND st='active' AND bids=0 AND ends>?").bind(id,u.id,now),
      env.DB.prepare("UPDATE plates SET st='own' WHERE id=(SELECT plate_id FROM auctions WHERE id=?) AND (SELECT changes())=1").bind(id)
    ]);
    if(res[0].meta.changes!==1)throw new HttpErr(409,'gone');
    return{ok:true};
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
    u.coins=await coinsOf(env,u.id);
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
    return{refBonus,achReady:ar,cfg:cfgOut(now),banner:CFG.banner&&CFG.banner.text?CFG.banner:null,user:{...userOut(u,env),subWarn:isAdmin(env,u.id)&&subErr>0&&now-subErr<36e5},inv:inv.results.map(plateOf),lots:lots.n,sales:{n:sales.n,net:sales.net},daily:dailyOf(u,now),wheel:wheelOf(u,now),reset:dayEnd(now),now};
  },
  async 'POST /api/spin'(env,u,url,now,b){
    const c=String(b.c);if(!C[c])throw new HttpErr(400,'bad');
    const ti=int(b.tier,0,TIERS.length-1),T=TIERS[ti],n=int(b.n,1,5),cost=tierPrice(T,ti,now)*n;
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
    const gain=d.rewards[d.next-1];
    const r=await env.DB.prepare('UPDATE users SET coins=coins+?,streak=?,last_day=? WHERE id=? AND last_day<?').bind(gain,d.next,t,u.id,t).run();
    if(r.meta.changes!==1)throw new HttpErr(429,'wait',{reset:dayEnd(now)});
    const u2={...u,streak:d.next,last_day:t};
    return{coins:u.coins+gain,gained:gain,day:d.next,daily:dailyOf(u2,now),reset:dayEnd(now),achReady:await achCount(env,u2,now)};
  },
  async 'POST /api/wheel'(env,u,url,now){
    const t=dayNum(now);
    if(u.wheel_day>=t)throw new HttpErr(429,'wait',{reset:dayEnd(now)});
    const idx=pickWheel(),gain=WHEEL[idx][0]*x2m('wheel',now);
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
    const p=await env.DB.prepare('SELECT coins,plate_rar,plate_c FROM promos WHERE code=?').bind(code).first();
    let plate=null;
    if(p.plate_rar>=0){
      try{
        const c=p.plate_c&&C[p.plate_c]?p.plate_c:pick(['KZ','RU','UA','BY']);
        const pp=await claimPlate(env,c,p.plate_rar,now);
        await env.DB.prepare("INSERT INTO plates(id,owner,st,c,rar,v,data,created) VALUES(?,?,'own',?,?,?,?,?)").bind(pp.id,u.id,pp.c,pp.rar,pp.v,JSON.stringify(strip(pp)),now).run();
        plate={...pp,st:'own',t:now};
      }catch(e){console.log('promo plate',e&&e.message)}
    }
    return{coins:await coinsOf(env,u.id),gained:p.coins,plate};
  },
  async 'GET /api/market'(env,u,url,now){
    await housekeeping(env,now);
    const c=url.searchParams.get('c')||'ALL';
    const rows=(await env.DB.prepare("SELECT l.id,l.price,l.seller,(SELECT COALESCE(NULLIF(dname,''),name) FROM users WHERE id=l.seller) seller_name,(SELECT av FROM users WHERE id=l.seller) sav,(SELECT photo FROM users WHERE id=l.seller) sphoto,l.expires,l.v,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.st='active' AND l.seller!=? AND (?='ALL' OR l.c=?) AND l.expires>? ORDER BY l.rar DESC,l.price*1.0/l.v ASC LIMIT 60").bind(u.id,c,c,now).all()).results;
    return{lots:rows.map(r=>({id:r.id,price:r.price,seller:r.seller_name,sellerId:r.seller,sellerAva:avaOf({id:r.seller,av:r.sav,photo:r.sphoto}),expires:r.expires,plate:{...JSON.parse(r.data),id:r.pid}})),now};
  },
  async 'GET /api/lots'(env,u,url,now){
    await housekeeping(env,now);
    const act=(await env.DB.prepare("SELECT l.id,l.price,l.expires,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.seller=? AND l.st='active' ORDER BY l.created DESC").bind(u.id).all()).results;
    const sold=(await env.DB.prepare("SELECT l.id,l.price,l.sold_at,(SELECT COALESCE(NULLIF(dname,''),name) FROM users WHERE id=l.buyer) buyer_name,p.id pid,p.data FROM lots l JOIN plates p ON p.id=l.plate_id WHERE l.seller=? AND l.st='sold' ORDER BY l.sold_at DESC LIMIT 10").bind(u.id).all()).results;
    return{active:act.map(r=>({id:r.id,price:r.price,net:Math.floor(r.price*(100-COMM)/100),expires:r.expires,plate:{...JSON.parse(r.data),id:r.pid}})),
      sold:sold.map(r=>({id:r.id,price:r.price,net:Math.floor(r.price*(100-COMM)/100),at:r.sold_at,buyer:r.buyer_name,plate:{...JSON.parse(r.data),id:r.pid}})),now};
  },
  async 'POST /api/list'(env,u,url,now,b){
    if(u.mute)throw new HttpErr(403,'muted');
    const id=String(b.plateId||'');
    const p=await env.DB.prepare("SELECT id,c,rar,v FROM plates WHERE id=? AND owner=? AND st='own'").bind(id,u.id).first();
    if(!p)throw new HttpErr(409,'gone');
    const price=int(b.price,Math.max(100,Math.ceil(p.v*SELL)),Math.ceil(p.v*3));
    const cnt=(await env.DB.prepare("SELECT COUNT(*) n FROM lots WHERE seller=? AND st='active'").bind(u.id).first()).n;
    if(cnt>=MAX_LOTS)throw new HttpErr(409,'limit');
    const lid=uid();
    const res=await env.DB.batch([
      env.DB.prepare("INSERT INTO lots(id,plate_id,seller,seller_name,price,created,expires,c,rar,v) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM plates WHERE id=? AND owner=? AND st='own')").bind(lid,id,u.id,dnOf(u),price,now,now+LOT_TTL,p.c,p.rar,p.v,id,u.id),
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
      env.DB.prepare("UPDATE lots SET st='sold',buyer=?,buyer_name=?,sold_at=?,settled=0 WHERE id=? AND st='active' AND seller!=? AND expires>? AND (SELECT coins FROM users WHERE id=?)>=price").bind(u.id,dnOf(u),now,id,u.id,now,u.id),
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
  async scheduled(ev,env,ctx){curCtx=ctx;remAt=0;await init(env);await loadCfg(env,Date.now(),true);await settleAuctions(env,Date.now());await maybeReminders(env)},
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
      if(req.method==='GET'&&url.pathname.startsWith('/api/ava/')){await init(env);return await ava(env,url)}
      const fn=routes[key];if(!fn)return out({error:'notfound'},404);
      await init(env);
      const a=await auth(req,env),now=Date.now();
      const u=await getUser(env,a,now);
      if(u.banned&&!isAdmin(env,u.id))throw new HttpErr(403,'banned',{reason:u.ban_reason||''});
      await loadCfg(env,now);
      if(CFG.maint&&!isAdmin(env,u.id))throw new HttpErr(503,'maint',{text:CFG.maint});
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
