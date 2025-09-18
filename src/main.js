/* ---------- State ---------- */
const S = {
  companyName: "",
  legalForm: "GmbH",
  foundedMonthsAgo: 18,
  monthlyRevenue: 25000,
  monthlyExpenses: 18000,
  avgBankBalance: 12000,
  missedPaymentsLast12M: 0,
  creditUtilizationPct: 22,
  activeLoans: 0,
  industry: "Services",
};

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
const num = (n) => (Number(n) || 0).toLocaleString("de-DE");
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
const scale  = (v,a,b)=>(v-a)/(b-a);

/* ---------- Scoring ---------- */
const computeRunway = (d) => {
  const burn = Math.max(0, d.monthlyExpenses - d.monthlyRevenue);
  return burn <= 0 ? 24 : d.avgBankBalance / burn;
};
const computeMargin = (d) => (d.monthlyRevenue <= 0 ? 0 : Math.max(0,(d.monthlyRevenue - d.monthlyExpenses) / d.monthlyRevenue));

function computeScore(d){
  const rw = computeRunway(d), m = computeMargin(d);
  const liquidity       = clamp(scale(rw,0,12)*100,0,100);
  const profitability   = clamp(m*100,0,100);
  const paymentHistory  = clamp(100 - d.missedPaymentsLast12M*25, 0, 100);
  const leverage        = clamp(100 - d.creditUtilizationPct, 0, 100);
  const age             = clamp(scale(d.foundedMonthsAgo,0,36)*100,0,100);
  const total0to100 = liquidity*.28 + profitability*.27 + paymentHistory*.23 + leverage*.12 + age*.10;
  return { total: Math.round(total0to100*9), liquidity, profitability, paymentHistory, leverage, age };
}
const gradeFrom = (t)=> t>=800?"A+": t>=740?"A": t>=680?"B+": t>=620?"B": t>=560?"C+": t>=500?"C":"D";
const gradeLabel = (g)=>({ "A+":"excellent","A":"very good","B+":"good","B":"fair","C+":"watchlist","C":"weak" }[g]||"high risk");

function riskFlags(d){
  const list=[], m=computeMargin(d), r=computeRunway(d);
  if(m<0.05) list.push("Sehr dünne Marge (<5%).");
  if(r<2) list.push("Runway unter 2 Monaten.");
  if(d.missedPaymentsLast12M>=2) list.push("Mehrere Zahlungsverzüge in den letzten 12 Monaten.");
  if(d.creditUtilizationPct>=70) list.push("Hohe Kreditauslastung (≥70%).");
  if(d.foundedMonthsAgo<6) list.push("Junges Unternehmen (<6 Monate).");
  if(!list.length) list.push("Keine kritischen Risiken in den angegebenen Daten erkannt.");
  return list;
}
function recommendations(d){
  const out=[], m=computeMargin(d), r=computeRunway(d);
  if(m<0.15) out.push("Marge auf 20%+ heben (Pricing/Kosten).");
  if(r<3) out.push("Liquidität stärken: 3–6 Monate Runway anstreben.");
  if(d.missedPaymentsLast12M>0) out.push("12 Monate ohne Zahlungsverzug anpeilen.");
  if(d.creditUtilizationPct>40) out.push("Kreditauslastung unter 30% senken.");
  if(d.activeLoans>2) out.push("Kredite bündeln erwägen.");
  if(!out.length) out.push("Weiter so: gesunde Marge und niedrige Auslastung.");
  return out;
}

/* ---------- Form binding ---------- */
function bindForm(){
  [
    ["f-companyName","companyName",v=>v],
    ["f-legalForm","legalForm",v=>v],
    ["f-foundedMonthsAgo","foundedMonthsAgo",n=>Number(n||0)],
    ["f-monthlyRevenue","monthlyRevenue",n=>Number(n||0)],
    ["f-monthlyExpenses","monthlyExpenses",n=>Number(n||0)],
    ["f-avgBankBalance","avgBankBalance",n=>Number(n||0)],
    ["f-missedPaymentsLast12M","missedPaymentsLast12M",n=>Number(n||0)],
    ["f-creditUtilizationPct","creditUtilizationPct",n=>Number(n||0)],
    ["f-activeLoans","activeLoans",n=>Number(n||0)],
    ["f-industry","industry",v=>v],
  ].forEach(([id,key,cast])=>{
    const el=$(id); if(!el) return;
    el.addEventListener("input",(e)=>{ S[key]=cast(e.target.value); updatePreview(); });
  });
}
function syncInputs(){
  $("f-companyName").value=S.companyName;
  $("f-legalForm").value=S.legalForm;
  $("f-foundedMonthsAgo").value=S.foundedMonthsAgo;
  $("f-monthlyRevenue").value=S.monthlyRevenue;
  $("f-monthlyExpenses").value=S.monthlyExpenses;
  $("f-avgBankBalance").value=S.avgBankBalance;
  $("f-missedPaymentsLast12M").value=S.missedPaymentsLast12M;
  $("f-creditUtilizationPct").value=S.creditUtilizationPct;
  $("f-activeLoans").value=S.activeLoans;
  $("f-industry").value=S.industry;
}
function loadExample(){
  Object.assign(S,{
    companyName:"Demo GmbH", legalForm:"GmbH", foundedMonthsAgo:18,
    monthlyRevenue:25000, monthlyExpenses:18000, avgBankBalance:12000,
    missedPaymentsLast12M:0, creditUtilizationPct:22, activeLoans:0, industry:"Services"
  });
  syncInputs(); updatePreview();
}

/* ---------- Preview & Report ---------- */
function updatePreview(){
  const sc=computeScore(S), g=gradeFrom(sc.total);
  set("prev-score", sc.total);
  set("prev-grade", g);
  set("prev-runway", computeRunway(S).toFixed(1)+" mo");
  set("prev-margin", Math.round(computeMargin(S)*100)+"%");
  $("prev-bar").style.width = Math.min(100, sc.total/9)+"%";
}

function renderReport(){
  const sc=computeScore(S), g=gradeFrom(sc.total);
  const rw=computeRunway(S), m=computeMargin(S);
  set("r-score", sc.total);
  set("r-runway", rw.toFixed(1)+" mo");
  set("r-margin", Math.round(m*100)+"%");
  set("r-util", S.creditUtilizationPct+"%");
  $("r-bar").style.width = Math.min(100, sc.total/9)+"%";

  const badge=$("r-badge");
  badge.textContent=g;
  badge.className="badge "+(g.startsWith("A")?"badge-A":g.startsWith("B")?"badge-B":g.startsWith("C")?"badge-C":"badge-D");

  $("r-intro").textContent =
    `${S.companyName||"Das Unternehmen"} zeigt ${gradeLabel(g)}e Kreditwürdigkeit (Score ${sc.total}, ${g}). `+
    `Runway ${rw.toFixed(1)} Monate, Marge ${Math.round(m*100)}%. `+
    (m>=0.15?"Operativ solide.":"Verbesserungspotenzial bei Effizienz.");

  set("r-company", S.companyName||"—");
  set("r-date", new Date().toLocaleString());

  const tb=$("r-pillars"); tb.innerHTML="";
  [
    ["Liquidity","28%",sc.liquidity, rw>=6?"Komfortabler Runway.":"Runway knapp — Cash erhöhen oder Burn senken."],
    ["Profitability","27%",sc.profitability, m>=0.15?"Solide Marge.":"Unter 15% — Preise/Kosten prüfen."],
    ["Payment history","23%",sc.paymentHistory, S.missedPaymentsLast12M===0?"Keine Verzüge.":"Verzüge drücken den Score."],
    ["Leverage","12%",sc.leverage, S.creditUtilizationPct<=30?"Niedrige Auslastung.":"Hohe Auslastung erhöht Risiko."],
    ["Company age","10%",sc.age, S.foundedMonthsAgo>=18?"Ausreichende Historie.":"Junge Firma — begrenzter Track-Record."],
  ].forEach(([p,w,s,c])=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${p}</td><td>${w}</td><td>${Math.round(s)}</td><td class="muted">${c}</td>`;
    tb.appendChild(tr);
  });

  const snap=$("r-snapshot"); snap.innerHTML="";
  [
    ["Company", S.companyName||"—"],
    ["Legal form", S.legalForm],
    ["Industry", S.industry||"—"],
    ["Monthly revenue", "€ "+num(S.monthlyRevenue)],
    ["Monthly expenses", "€ "+num(S.monthlyExpenses)],
    ["Average bank balance", "€ "+num(S.avgBankBalance)],
    ["Missed payments (12m)", S.missedPaymentsLast12M],
    ["Credit utilization", S.creditUtilizationPct+"%"],
    ["Active loans", S.activeLoans],
  ].forEach(([k,v])=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${k}</td><td><b>${v}</b></td>`;
    snap.appendChild(tr);
  });

  const R=$("r-risks"); R.innerHTML="";
  riskFlags(S).forEach(t=>{ const li=document.createElement("li"); li.textContent=t; R.appendChild(li); });

  const T=$("r-tips"); T.innerHTML="";
  recommendations(S).forEach(t=>{ const li=document.createElement("li"); li.textContent=t; T.appendChild(li); });
}

/* ---------- Router ---------- */
function go(v){ location.hash = "#/"+v; }
function current(){ const v=(location.hash||"").replace(/^#\/?/,"").split("/")[0]; return ["home","form","report","how","data","security","imprint","privacy"].includes(v)?v:"home"; }
function show(v){
  ["how","data","security"].forEach(id=>{ const a=document.getElementById("nav-"+id); if(a) a.classList.toggle("active", v===id); });
  ["home","form","report","how","data","security","imprint","privacy"].forEach(id=>{
    const s=document.getElementById("view-"+id); if(s) s.classList.toggle("hidden", id!==v);
  });
  if(v==="form"){ syncInputs(); updatePreview(); }
  if(v==="report"){ renderReport(); attachPDF(); }
}
window.addEventListener("hashchange", ()=>show(current()));

/* ---------- PDF ---------- */
function attachPDF(){
  const b=document.getElementById("btn-download-pdf"); if(!b) return;
  b.onclick=()=>{
    const el=document.getElementById("report-area"); if(!el) return;
    const now=new Date(), pad=n=>String(n).padStart(2,"0");
    const fname=`Puls_Credit_Report_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.pdf`;
    const opt={ margin:[10,10,10,10], filename:fname, image:{type:"jpeg",quality:.98}, html2pdf:{scale:2,useCORS:true}, jsPDF:{unit:"mm",format:"a4",orientation:"portrait"} };
    html2pdf().set(opt).from(el).save();
  };
}

/* ---------- Init ---------- */
document.getElementById("y").textContent = new Date().getFullYear();
bindForm(); loadExample(); show(current());
