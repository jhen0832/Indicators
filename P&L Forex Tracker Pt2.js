/* ================================================================
   Liquid Charts Pro — P&L Card v5 (Final)
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Remove the old P&L Card v5 from the chart
   3. Indicators → Advanced → Add UDI
   4. Paste this file into the Code tab
   5. Mode:           UDI + Framework
   6. Trading action: Confirm
   7. Click ADD

   The P&L stays through page refreshes, broker stalls, logouts and
   new days. It only clears when you click Reset on the card.

   The starting balance is saved outside the card's HTML, which is a
   sandboxed iframe that can't keep data. It is saved in two places:
   - the platform's own settings storage
   - the browser's IndexedDB
   Each account keeps its own record, and the newest record wins.
================================================================ */

var PNL_SETTINGS_ID = "jcash-pnl-card-v5-stats";
var PNL_DB_NAME     = "jcash-pnl-card-v5-stats";
var PNL_DB_STORE    = "state";
var PNL_LOAD_WAIT   = 15000;   // ms to wait for saved data before starting fresh

// The card's frame is only as big as the card, so the mouse wheel and
// clicks reach the chart everywhere else.
var PNL_FRAME       = {w: 246, h: 400};

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$htmlCreated = false;
        this.$currency    = "$";
        this.$lastParams  = {};
        this.$frameRight  = 8;
        this.$frameTop    = 8;
        this.$isMin       = false;
        this.$lastMsg     = null;
        this.$store       = {};     // account key → {o: starting balance, t: saved at, s: since}
        this.$catLoaded   = false;
        this.$idbLoaded   = false;
        this.$catDirty    = false;
        this.$resetWanted = false;
        this.$startedAt   = Date.now();

        this._loadSaved();

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
    }

    onHTMLMessage(msg) {
        if (!msg) return;

        // Reset button clicked on card
        if (msg.action === "resetBalance") {
            this.$resetWanted = true;
            return;
        }

        // Card has loaded: fill it straight away, even if the broker is stalled
        if (msg.action === "ready") {
            if (this.$lastMsg) this.sendHTMLMessage(this.$lastMsg);
            return;
        }

        // Card dragged and dropped: remove the frame, add a new one in the new spot
        if (msg.action === "move") {
            this.$frameRight = Math.max(0, this.$frameRight - (msg.dx || 0));
            this.$frameTop   = Math.max(0, this.$frameTop   + (msg.dy || 0));
            var self = this;
            this.removeHTML();
            clearTimeout(this.$moveTimer);
            this.$moveTimer = setTimeout(function() { self._placeFrame(); }, 150);
            return;
        }

        // Remember minimized, so the card stays that way after a move
        if (msg.action === "min") {
            this.$isMin = !!msg.min;
        }
    }

    // ── Saving and loading ───────────────────────────────────

    _loadSaved() {
        var self = this;

        // Platform settings storage
        try {
            Framework.LoadCategorySettings(PNL_SETTINGS_ID, function(settings) {
                self._merge(settings && settings.accounts);
                self.$catLoaded = true;
                self._afterLoad();
            });
            // A reset on another chart reaches this copy too
            Framework.AddMessageHandler(function(Msg) {
                if (Msg.is(FXB.MessageTypes.CATEGORY_SETTINGS_CHANGE)) {
                    var s = Msg.categorySettings || Framework.categorySettings;
                    self._merge(s && s.accounts);
                }
            });
        } catch (e) {
            this.$catLoaded = true;
        }

        // Browser IndexedDB
        this._withDB(function(db) {
            var req = db.transaction(PNL_DB_STORE, "readonly")
                        .objectStore(PNL_DB_STORE).get("accounts");
            req.onsuccess = function() {
                self._merge(req.result);
                db.close();
                self.$idbLoaded = true;
                self._afterLoad();
            };
            req.onerror = function() {
                db.close();
                self.$idbLoaded = true;
                self._afterLoad();
            };
        }, function() {
            self.$idbLoaded = true;
            self._afterLoad();
        });
    }

    _afterLoad() {
        if (this.$catLoaded && this.$catDirty) {
            this.$catDirty = false;
            this._persist();
            return;
        }
        // Both stores have answered: copy the newest records to both
        if (this.$catLoaded && this.$idbLoaded && Object.keys(this.$store).length > 0) {
            this._persist();
        }
    }

    _withDB(onOpen, onFail) {
        try {
            var open = indexedDB.open(PNL_DB_NAME, 1);
            open.onupgradeneeded = function() {
                open.result.createObjectStore(PNL_DB_STORE);
            };
            open.onsuccess = function() { onOpen(open.result); };
            open.onerror   = function() { onFail(); };
            open.onblocked = function() { onFail(); };
        } catch (e) {
            onFail();
        }
    }

    _merge(accounts) {
        if (!accounts) return;
        for (var key in accounts) {
            var rec = accounts[key];
            if (!rec || typeof rec.o !== "number") continue;
            var cur = this.$store[key];
            if (!cur || rec.t > cur.t) this.$store[key] = rec;
        }
    }

    _persist() {
        var accounts = this.$store;

        if (this.$catLoaded) {
            try { Framework.SaveCategorySettings({accounts: accounts}); } catch (e) {}
        } else {
            this.$catDirty = true;   // the platform requires a load before a save
        }

        this._withDB(function(db) {
            try {
                var tx = db.transaction(PNL_DB_STORE, "readwrite");
                tx.objectStore(PNL_DB_STORE).put(accounts, "accounts");
                tx.oncomplete = function() { db.close(); };
                tx.onerror    = function() { db.close(); };
            } catch (e) {
                db.close();
            }
        }, function() {});
    }

    // ── Main loop ────────────────────────────────────────────

    _tick() {
        if (!this.$htmlCreated) return;

        var acct;
        try { acct = Framework.Account; } catch (e) { return; }
        if (!acct || acct.accountId === undefined || acct.accountId === null) return;

        var balance  = acct.balance    || 0;
        var floating = acct.floatingPL || 0;

        // Broker stalled or still connecting: leave the card as it is
        if (!(balance > 0)) return;

        var currency = acct.currencySymbol || acct.depositCurrency || this.$currency || "$";
        this.$currency = currency;

        var accountType = "active";
        var name = String(acct.accountName || acct.name || acct.login || acct.id || "").toLowerCase();
        if (name.indexOf("dem") === 0 || name.indexOf("demo") >= 0 || acct.isDemo === true) {
            accountType = "demo";
        } else if (name.indexOf("ecn") === 0 || name.indexOf("live") === 0 ||
                   name.indexOf("real") === 0 || acct.isDemo === false) {
            accountType = "live";
        }

        var features = acct.features || {};
        var key = (features.platformInstance || "") + ":" + acct.accountId;
        var now = Date.now();

        if (this.$resetWanted) {
            this.$resetWanted = false;
            this.$store[key] = {o: balance - floating, t: now, s: now};
            this._persist();
        }

        var rec = this.$store[key];
        if (!rec) {
            // Never start fresh until saved data has had the chance to arrive
            var settled = this.$catLoaded && this.$idbLoaded;
            if (!settled && now - this.$startedAt < PNL_LOAD_WAIT) return;

            // t:0 means saved data that arrives late still takes priority
            rec = {o: balance - floating, t: settled ? now : 0, s: now};
            this.$store[key] = rec;
            this._persist();
        }

        var realised = (balance - floating) - rec.o;
        var total    = realised + floating;
        var p        = this.$lastParams || {};

        this.$lastMsg = {
            acctName:    p.accountName || "Profit Stats",
            accent:      p.accentColor || "#3ddc84",
            balance:     currency + this._num(balance),
            floating:    this._pnl(floating, currency),
            floatingRaw: floating,
            total:       this._pnl(total, currency),
            totalRaw:    total,
            since:       rec.s,
            accountType: accountType
        };
        this.sendHTMLMessage(this.$lastMsg);
    }

    _buildCard() {
        this.$html = `<!DOCTYPE html>
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
}
#card {
  position: absolute;
  top: 6px; right: 6px;
  width: 234px;
  background: #12151e;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.6);
  user-select: none;
}
#card.mini { border-radius: 28px; width: 190px; }
#card.moving { opacity: 0.55; }
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
.since-txt { font-size: 10px; color: rgba(255,255,255,0.25); margin-top: 6px; }
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
      <div class="blk-lbl">Total P&amp;L</div>
      <div class="pnl-val neu" id="pnl">$0.00</div>
      <div class="since-txt" id="since">Loading...</div>
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
        <span class="reset-txt">Reset P&amp;L</span>
      </div>
    </div>

  </div>
</div>

<script>
var card  = document.getElementById('card');
var isMin = __PNL_MIN__;

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
  var p=document.getElementById('pnl'); if(p){p.textContent='$0.00'; p.className='pnl-val neu';}
  var f=document.getElementById('flt'); if(f){f.textContent='$0.00'; f.className='flt-val neu';}
  var mv=document.getElementById('mini-v'); if(mv){mv.textContent='$0.00'; mv.className='mini-val neu';}
  window.parent.postMessage({action:'resetBalance'}, '*');
}

// ── Minimize ──────────────────────────────────────────────
function applyMin() {
  document.getElementById('cnt').style.display     = isMin ? 'none' : 'flex';
  document.getElementById('minibar').style.display = isMin ? 'flex' : 'none';
  document.getElementById('mbtn').textContent      = isMin ? '＋' : '—';
  card.className = isMin ? 'mini' : '';
}
applyMin();
function toggleMin() {
  isMin = !isMin;
  applyMin();
  window.parent.postMessage({action:'min', min:isMin}, '*');
}

// ── Drag ──────────────────────────────────────────────────
// The card moves to where you let go. Pointer capture keeps the
// positions coming even when the pointer is outside the frame.
var dragging=false, dragPointer=null, startX, startY, lastX, lastY;
function onHandleDown(e) {
  if (e.target.tagName==='BUTTON') return;
  dragging=true; dragPointer=e.pointerId;
  startX=lastX=e.screenX; startY=lastY=e.screenY;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err) {}
  card.classList.add('moving');
  e.preventDefault();
}
function onHandleMove(e) {
  if (!dragging || e.pointerId!==dragPointer) return;
  lastX=e.screenX; lastY=e.screenY;
}
function dragEnd(e) {
  if (!dragging) return;
  if (e && e.screenX!==undefined && e.type==='pointerup') { lastX=e.screenX; lastY=e.screenY; }
  dragging=false; dragPointer=null;
  card.classList.remove('moving');
  var dx=lastX-startX, dy=lastY-startY;
  if (Math.abs(dx)>3 || Math.abs(dy)>3) {
    window.parent.postMessage({action:'move', dx:dx, dy:dy}, '*');
  }
}
['dbar','minibar'].forEach(function(id) {
  var h=document.getElementById(id);
  h.style.touchAction='none';
  h.addEventListener('pointerdown', onHandleDown);
  h.addEventListener('pointermove', onHandleMove);
  h.addEventListener('pointerup', dragEnd);
  h.addEventListener('pointercancel', dragEnd);
});
document.addEventListener('pointerup', dragEnd);
window.addEventListener('blur', dragEnd);

// ── Helpers ───────────────────────────────────────────────
function cls(v) { return v>0?'pos':v<0?'neg':'neu'; }
function sinceText(ms) {
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var d=new Date(ms), h=d.getHours(), ap=h>=12?'PM':'AM', m=d.getMinutes();
  h=h%12||12;
  return 'Since '+months[d.getMonth()]+' '+d.getDate()+', '+h+':'+(m<10?'0':'')+m+' '+ap;
}
function hexRgb(h) {
  h=h.replace('#','');
  if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16);
}

// ── Messages ──────────────────────────────────────────────
window.addEventListener('message', function(e) {
  var d=e.data; if(!d) return;

  if (d.accent) {
    var rgb=hexRgb(d.accent);
    document.getElementById('abar').style.background=d.accent;
    var bdot=document.getElementById('bdot'), badge=document.getElementById('badge');
    bdot.style.background=d.accent; bdot.style.boxShadow='0 0 5px '+d.accent;
    badge.style.color=d.accent; badge.style.borderColor='rgba('+rgb+',0.35)';
    badge.style.background='rgba('+rgb+',0.10)';
  }
  if (d.since) document.getElementById('since').textContent=sinceText(d.since);
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
});

window.parent.postMessage({action:'ready'}, '*');
</script>
</body>
</html>`;

        this._placeFrame();
    }

    _placeFrame() {
        this.createHTML({
            foreground: true,
            style: {
                width:  PNL_FRAME.w + "px",
                height: PNL_FRAME.h + "px",
                right:  this.$frameRight + "px",
                top:    this.$frameTop + "px"
            },
            html: this.$html.replace("__PNL_MIN__", this.$isMin ? "true" : "false")
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
