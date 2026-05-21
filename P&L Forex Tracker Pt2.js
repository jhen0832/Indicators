/* ================================================================
   Liquid Charts Pro — P&L Card v5 (Final)
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode:           UDI + Framework
   5. Trading action: Confirm
   6. Click ADD
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$htmlCreated       = false;
        this.$openingBalance    = null;
        this.$todayDateStr      = new Date().toISOString().slice(0, 10);
        this.$currency          = "$";
        this.$lastParams        = {};
        this.$waitingForRestore = true;
        this.$posX              = null;
        this.$posY              = 14;

        var self = this;
        setInterval(function() { self._tick(); }, 1000);

        return {
            caption:        "P&L Card",
            isOverlay:      true,
            plots:          [],
            settingsFields: [
                {
                    id: "accountName", caption: "Account Name",
                    type: "text", defaultValue: "Profit Stats"
                },
                {
                    id: "accentColor", caption: "Accent Color",
                    type: "color", defaultValue: "#3ddc84"
                }
            ]
        };
    }

    onContextChange(data) {}
    onParameterChange(data) { this.$lastParams = data.parameters; }

    onCalculate(data, output) {
        this.$lastParams = data.parameters;
        if (!this.$htmlCreated) {
            this.$htmlCreated = true;
            this._buildCard();
        }
        var todayStr = new Date().toISOString().slice(0, 10);
        if (todayStr !== this.$todayDateStr) {
            this.$todayDateStr      = todayStr;
            this.$openingBalance    = null;
            this.$waitingForRestore = false;
            this.sendHTMLMessage({clearBalance: true});
        }
    }

    onHTMLMessage(msg) {
        if (!msg) return;

        // Reset button clicked on card
        if (msg.action === "resetBalance") {
            this.$openingBalance    = null;
            this.$waitingForRestore = false;
            return;
        }

        // Panel restored saved balance on load
        if (msg.action === "restoreBalance" && msg.balance > 0) {
            var today = new Date().toISOString().slice(0, 10);
            if (msg.date === today) {
                this.$openingBalance    = msg.balance;
                this.$waitingForRestore = false;
            }
        }

        // Panel ready but nothing saved
        if (msg.action === "ready") {
            this.$waitingForRestore = false;
        }

        // Drag position
        if (msg.action === "drag") {
            if (this.$posX === null) {
                this.$posX = Math.max(0, (msg.winW || 800) - 254 - 20);
            }
            this.$posX = Math.max(0, this.$posX + (msg.dx || 0));
            this.$posY = Math.max(0, this.$posY + (msg.dy || 0));
            this.sendHTMLMessage({ moveX: this.$posX, moveY: this.$posY });
        }
    }

    _tick() {
        if (!this.$htmlCreated) return;
        if (this.$waitingForRestore) return;

        var balance     = 0;
        var floating    = 0;
        var currency    = this.$currency;
        var accountType = "active";

        try {
            var acct = Framework.Account;
            if (acct) {
                balance  = acct.balance    || 0;
                floating = acct.floatingPL || 0;
                currency = acct.currencySymbol || acct.depositCurrency || "$";
                this.$currency = currency;

                var name = String(acct.accountName || acct.name || acct.login || acct.id || "").toLowerCase();
                if (name.indexOf("dem") === 0 || name.indexOf("demo") >= 0 || acct.isDemo === true) {
                    accountType = "demo";
                } else if (name.indexOf("ecn") === 0 || name.indexOf("live") === 0 ||
                           name.indexOf("real") === 0 || acct.isDemo === false) {
                    accountType = "live";
                }
            }
        } catch(e) { return; }

        if (this.$openingBalance === null && balance > 0) {
            this.$openingBalance = balance - floating;
            // Persist to panel — survives refresh, logout, sleep
            this.sendHTMLMessage({
                saveBalance: this.$openingBalance,
                saveDate:    this.$todayDateStr
            });
        }
        if (this.$openingBalance === null) return;

        var realised = (balance - floating) - this.$openingBalance;
        var total    = realised + floating;
        var p        = this.$lastParams || {};

        this.sendHTMLMessage({
            acctName:    p.accountName || "Profit Stats",
            accent:      p.accentColor || "#3ddc84",
            balance:     currency + this._num(balance),
            floating:    this._pnl(floating, currency),
            floatingRaw: floating,
            total:       this._pnl(total, currency),
            totalRaw:    total,
            accountType: accountType
        });
    }

    _buildCard() {
        var html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%; height: 100%;
  background: transparent;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  pointer-events: none;
}
#card { pointer-events: all; }
#card {
  position: absolute;
  top: 14px; right: 14px;
  width: 234px;
  background: #12151e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.75);
  user-select: none;
}
#card.mini { border-radius: 28px; width: 190px; }
.abar { height: 3px; width: 100%; background: #3ddc84; }
#dbar {
  height: 26px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px;
  cursor: grab;
  background: rgba(255,255,255,0.025);
}
#dbar:active { cursor: grabbing; }
.dots { display: flex; gap: 3px; }
.dot  { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.12); }
.mbtn {
  background: transparent; border: none;
  color: rgba(255,255,255,0.35); font-size: 14px;
  cursor: pointer; padding: 0 2px; line-height: 1; font-family: inherit;
}
.mbtn:hover { color: rgba(255,255,255,0.7); }
#minibar {
  display: none; padding: 9px 14px;
  align-items: center; justify-content: space-between;
}
.mini-val { font-size: 16px; font-weight: 800; }
.mini-val.pos { color: #3ddc84; }
.mini-val.neg { color: #ff5252; }
.mini-val.neu { color: rgba(255,255,255,0.5); }
#cnt { padding: 12px 14px 0; display: flex; flex-direction: column; gap: 9px; }
.toprow { display: flex; align-items: center; justify-content: space-between; }
.aname  { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.4); }
.badge  {
  display: flex; align-items: center; gap: 5px;
  border-radius: 20px; padding: 3px 9px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  border: 1px solid rgba(61,220,132,0.35);
  background: rgba(61,220,132,0.1);
  color: #3ddc84;
}
.pdot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #3ddc84; box-shadow: 0 0 5px #3ddc84;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
.blk {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px; padding: 11px 13px;
}
.blk-lbl {
  font-size: 9px; font-weight: 700;
  letter-spacing: 1.4px; text-transform: uppercase;
  color: rgba(255,255,255,0.25); margin-bottom: 5px;
}
.bal-val { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
.pnl-val { font-size: 28px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
.pnl-val.pos { color: #3ddc84; }
.pnl-val.neg { color: #ff5252; }
.pnl-val.neu { color: rgba(255,255,255,0.4); }
.flt-val { font-size: 22px; font-weight: 800; letter-spacing: -0.8px; line-height: 1; }
.flt-val.pos { color: #3ddc84; }
.flt-val.neg { color: #ff5252; }
.flt-val.neu { color: rgba(255,255,255,0.4); }

/* Footer — date + reset bar */
.card-footer { margin-top: 6px; }
.date-row {
  padding: 8px 14px 5px;
  text-align: center;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.date-txt {
  font-size: 11px; font-weight: 600;
  color: rgba(255,255,255,0.25);
}
.reset-bar {
  padding: 8px 14px 11px;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  cursor: pointer;
  border-top: 1px solid rgba(255,255,255,0.04);
  border-radius: 0 0 16px 16px;
  transition: background 0.2s;
}
.reset-bar:hover { background: rgba(255,255,255,0.04); }
.reset-icon { font-size: 10px; color: rgba(255,255,255,0.2); }
.reset-txt  {
  font-size: 9px; font-weight: 600;
  letter-spacing: 1.4px; text-transform: uppercase;
  color: rgba(255,255,255,0.2);
}
</style>
</head>
<body>

<div id="card">
  <div class="abar" id="abar"></div>

  <div id="dbar">
    <div class="dots">
      <div class="dot"></div><div class="dot"></div>
      <div class="dot"></div><div class="dot"></div>
    </div>
    <button class="mbtn" id="mbtn" onclick="toggleMin()">—</button>
  </div>

  <div id="minibar">
    <div style="display:flex;align-items:center;gap:7px">
      <span class="pdot"></span>
      <span class="mini-val neu" id="mini-v">$0.00</span>
    </div>
    <button class="mbtn" onclick="toggleMin()">＋</button>
  </div>

  <div id="cnt">
    <div class="toprow">
      <span class="aname" id="aname">PROFIT STATS</span>
      <div class="badge" id="badge">
        <span class="pdot" id="bdot"></span>
        <span id="btxt">ACTIVE</span>
      </div>
    </div>

    <div class="blk">
      <div class="blk-lbl">Balance</div>
      <div class="bal-val" id="bal">$0.00</div>
    </div>

    <div class="blk">
      <div class="blk-lbl">Today's P&amp;L</div>
      <div class="pnl-val neu" id="pnl">$0.00</div>
    </div>

    <div class="blk">
      <div class="blk-lbl">Floating P&amp;L</div>
      <div class="flt-val neu" id="flt">$0.00</div>
    </div>

    <div class="card-footer">
      <div class="date-row">
        <span class="date-txt" id="card-date"></span>
      </div>
      <div class="reset-bar" onclick="doReset()">
        <span class="reset-icon">↺</span>
        <span class="reset-txt">Reset Today's P&amp;L</span>
      </div>
    </div>

  </div>
</div>

<script>
var card  = document.getElementById('card');
var isMin = false;

// ── Triple-redundant persistence ──────────────────────────
var SAVE_KEY = "pnlcard_v5_ob";

function saveBalance(balance, date) {
  var val = JSON.stringify({b: balance, d: date});
  try { sessionStorage.setItem(SAVE_KEY, val); } catch(e) {}
  try {
    var wn = {}; try { wn = JSON.parse(window.name)||{}; } catch(e2) {}
    wn[SAVE_KEY] = val; window.name = JSON.stringify(wn);
  } catch(e) {}
  try {
    var exp = new Date(); exp.setHours(23,59,59,999);
    document.cookie = SAVE_KEY+"="+encodeURIComponent(val)+"; expires="+exp.toUTCString()+"; path=/; SameSite=Lax";
  } catch(e) {}
}

function loadBalance() {
  var val = null;
  try { val = sessionStorage.getItem(SAVE_KEY); } catch(e) {}
  if (!val) {
    try { var wn=JSON.parse(window.name)||{}; val=wn[SAVE_KEY]||null; } catch(e) {}
  }
  if (!val) {
    try {
      var cookies = document.cookie.split(";");
      for (var i=0; i<cookies.length; i++) {
        var c = cookies[i].trim();
        if (c.indexOf(SAVE_KEY+"=")===0) {
          val = decodeURIComponent(c.substring(SAVE_KEY.length+1)); break;
        }
      }
    } catch(e) {}
  }
  if (!val) return null;
  try { return JSON.parse(val); } catch(e) { return null; }
}

function clearBalance() {
  try { sessionStorage.removeItem(SAVE_KEY); } catch(e) {}
  try {
    var wn={}; try{wn=JSON.parse(window.name)||{};}catch(e2){}
    delete wn[SAVE_KEY]; window.name=JSON.stringify(wn);
  } catch(e) {}
  try { document.cookie=SAVE_KEY+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; } catch(e) {}
}

// Restore on load — send saved balance back to indicator
(function() {
  var today = new Date().toISOString().slice(0,10);
  var saved = loadBalance();
  if (saved && saved.b > 0 && saved.d === today) {
    window.parent.postMessage({action:"restoreBalance", balance:saved.b, date:saved.d}, "*");
  } else {
    window.parent.postMessage({action:"ready"}, "*");
  }
})();

// ── Date ──────────────────────────────────────────────────
function updateDate() {
  var now=new Date();
  var days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var el=document.getElementById('card-date');
  if (el) el.textContent=days[now.getDay()]+', '+months[now.getMonth()]+' '+now.getDate()+' '+now.getFullYear();
}
updateDate();
setInterval(updateDate, 60000);

// ── Reset ─────────────────────────────────────────────────
function doReset() {
  clearBalance();
  var p=document.getElementById('pnl'); if(p){p.textContent='$0.00'; p.className='pnl-val neu';}
  var f=document.getElementById('flt'); if(f){f.textContent='$0.00'; f.className='flt-val neu';}
  var mv=document.getElementById('mini-v'); if(mv){mv.textContent='$0.00'; mv.className='mini-val neu';}
  window.parent.postMessage({action:'resetBalance'}, '*');
}

// ── Minimize ──────────────────────────────────────────────
function toggleMin() {
  isMin = !isMin;
  document.getElementById('cnt').style.display     = isMin ? 'none' : 'flex';
  document.getElementById('minibar').style.display = isMin ? 'flex' : 'none';
  document.getElementById('mbtn').textContent      = isMin ? '＋' : '—';
  card.className = isMin ? 'mini' : '';
}

// ── Drag ──────────────────────────────────────────────────
var dragging=false, startX, startY, startL, startT;
document.getElementById('dbar').addEventListener('mousedown', function(e) {
  if (e.target.tagName==='BUTTON') return;
  dragging=true; startX=e.clientX; startY=e.clientY;
  var r=card.getBoundingClientRect(); startL=r.left; startT=r.top;
  card.style.right='auto'; card.style.left=startL+'px'; card.style.top=startT+'px';
  e.preventDefault();
});
document.addEventListener('mousemove', function(e) {
  if (!dragging) return;
  card.style.left=Math.max(0,startL+(e.clientX-startX))+'px';
  card.style.top =Math.max(0,startT+(e.clientY-startY))+'px';
});
document.addEventListener('mouseup', function() { dragging=false; });
document.getElementById('dbar').addEventListener('touchstart', function(e) {
  if (e.target.tagName==='BUTTON') return;
  dragging=true; var t=e.touches[0]; startX=t.clientX; startY=t.clientY;
  var r=card.getBoundingClientRect(); startL=r.left; startT=r.top;
  card.style.right='auto'; card.style.left=startL+'px'; card.style.top=startT+'px';
  e.preventDefault();
}, {passive:false});
document.addEventListener('touchmove', function(e) {
  if (!dragging) return;
  var t=e.touches[0];
  card.style.left=Math.max(0,startL+(t.clientX-startX))+'px';
  card.style.top =Math.max(0,startT+(t.clientY-startY))+'px';
}, {passive:true});
document.addEventListener('touchend', function() { dragging=false; });

// ── Helpers ───────────────────────────────────────────────
function cls(v) { return v>0?'pos':v<0?'neg':'neu'; }
function hexRgb(h) {
  h=h.replace('#','');
  if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16);
}

// ── Messages ──────────────────────────────────────────────
window.addEventListener('message', function(e) {
  var d=e.data; if(!d) return;

  if (d.saveBalance && d.saveBalance>0) { saveBalance(d.saveBalance, d.saveDate); }
  if (d.clearBalance) { clearBalance(); }

  if (d.accent) {
    var rgb=hexRgb(d.accent);
    document.getElementById('abar').style.background=d.accent;
    var bdot=document.getElementById('bdot'), badge=document.getElementById('badge');
    bdot.style.background=d.accent; bdot.style.boxShadow='0 0 5px '+d.accent;
    badge.style.color=d.accent; badge.style.borderColor='rgba('+rgb+',0.35)';
    badge.style.background='rgba('+rgb+',0.10)';
  }
  if (d.acctName) document.getElementById('aname').textContent=d.acctName.toUpperCase();
  if (d.balance)  document.getElementById('bal').textContent=d.balance;
  if (d.total!==undefined) {
    var p=document.getElementById('pnl'); p.textContent=d.total; p.className='pnl-val '+cls(d.totalRaw||0);
    var mv=document.getElementById('mini-v'); mv.textContent=d.total; mv.className='mini-val '+cls(d.totalRaw||0);
  }
  if (d.floating!==undefined) {
    var f=document.getElementById('flt'); f.textContent=d.floating; f.className='flt-val '+cls(d.floatingRaw||0);
  }
  if (d.accountType) {
    var btxt=document.getElementById('btxt'), bdot2=document.getElementById('bdot'), badge2=document.getElementById('badge');
    var col,lbl;
    if      (d.accountType==='demo') { col='#f59e0b'; lbl='DEMO'; }
    else if (d.accountType==='live') { col='#3ddc84'; lbl='LIVE'; }
    else                              { col='#3ddc84'; lbl='ACTIVE'; }
    btxt.textContent=lbl; bdot2.style.background=col; bdot2.style.boxShadow='0 0 5px '+col;
    badge2.style.color=col; badge2.style.borderColor=col; badge2.style.background='rgba('+hexRgb(col)+',0.10)';
  }
  if (d.moveX!==undefined) {
    card.style.right='auto'; card.style.left=d.moveX+'px'; card.style.top=d.moveY+'px';
  }
});
</script>
</body>
</html>`;

        this.createHTML({
            foreground: true,
            style: { width:"100%", height:"100%", left:"0", top:"0" },
            html: html
        });
    }

    _num(v) {
        return (parseFloat(v)||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    }
    _pnl(v, cur) {
        var n=parseFloat(v)||0;
        var a=Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
        if(n>0) return "+"+(cur||"$")+a;
        if(n<0) return "-"+(cur||"$")+a;
        return (cur||"$")+"0.00";
    }
}
