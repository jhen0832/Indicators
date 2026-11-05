/* ================================================================
   Liquid Charts Pro — Floating P&L Card
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Remove the old P&L Card from the chart
   3. Indicators → Advanced → Add UDI
   4. Paste this file into the Code tab
   5. Mode:           UDI + Framework
   6. Trading action: Confirm
   7. Click ADD

   Shows a floating card with:
   - Total P&L (big number, green or red)
   - Realised P&L (closed trades)
   - Floating P&L (open trades right now)
   - Account balance
   - Minimize button to collapse to just the number

   The P&L stays through page refreshes, broker stalls, logouts and
   new days. It only clears when you click Reset on the card.

   The starting balance is saved outside the card's HTML, which is a
   sandboxed iframe that can't keep data. It is saved in two places:
   - the platform's own settings storage
   - the browser's IndexedDB
   Each account keeps its own record, and the newest record wins.
================================================================ */

var PNL_SETTINGS_ID = "jcash-pnl-card-v3";
var PNL_DB_NAME     = "jcash-pnl-card";
var PNL_DB_STORE    = "state";
var PNL_LOAD_WAIT   = 15000;   // ms to wait for saved data before starting fresh

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$htmlCreated = false;
        this.$currency    = "$";
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
            settingsFields: []
        };
    }

    onContextChange(data) {}

    onParameterChange(data) {
        var p = data.parameters;
        if (p.resetPnL === true || p.resetPnL === "true" || p.resetPnL === 1) {
            this.$resetWanted = true;
        }
    }

    onHTMLMessage(msg) {
        if (msg && msg.action === "resetBalance") {
            this.$resetWanted = true;
        }
    }

    onCalculate(data, output) {
        if (!this.$htmlCreated) {
            this.$htmlCreated = true;
            this._buildCard();
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

        this.sendHTMLMessage({
            balance:     currency + this._num(balance),
            realised:    this._pnl(realised, currency),
            floating:    this._pnl(floating, currency),
            total:       this._pnl(total, currency),
            totalRaw:    total,
            realisedRaw: realised,
            floatingRaw: floating,
            since:       rec.s,
            loading:     false
        });
    }

    _buildCard() {
        var html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: transparent;
  overflow: hidden;
  padding: 0;
}
#card {
  background: linear-gradient(160deg, rgba(15,17,26,0.97) 0%, rgba(20,24,38,0.97) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  padding: 18px 20px 14px;
  width: 220px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  transition: all 0.3s ease;
}
#card.mini {
  padding: 10px 16px;
  width: 140px;
  border-radius: 30px;
}
.header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.header-left { display: flex; align-items: center; gap: 6px; }
.dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #44ee44; box-shadow: 0 0 5px #44ee44;
  animation: pulse 2s infinite; flex-shrink: 0;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
.title {
  font-size: 10px; font-weight: 600; letter-spacing: 1.5px;
  color: rgba(255,255,255,0.35); text-transform: uppercase;
}
.minimize-btn {
  background: rgba(255,255,255,0.06); border: none; border-radius: 6px;
  color: rgba(255,255,255,0.4); font-size: 12px; cursor: pointer;
  padding: 2px 7px; line-height: 1.4; transition: background 0.2s;
}
.minimize-btn:hover { background: rgba(255,255,255,0.12); }
.reset-bar {
  margin: 0 -20px -14px -20px;
  padding: 9px 20px;
  background: rgba(59,130,246,0.08);
  border-top: 1px solid rgba(59,130,246,0.18);
  border-radius: 0 0 18px 18px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  gap: 6px;
}
.reset-bar:hover { background: rgba(59,130,246,0.16); }
.reset-bar-icon {
  font-size: 11px;
  color: rgba(255,255,255,0.25);
}
.reset-bar-txt {
  font-size: 9px; font-weight: 600;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: rgba(255,255,255,0.25);
}
.big-pnl {
  font-size: 28px; font-weight: 800; letter-spacing: -1px;
  line-height: 1.1; margin: 6px 0 2px; transition: color 0.4s;
}
.big-pnl.pos { color: #3ddc84; }
.big-pnl.neg { color: #ff5f5f; }
.big-pnl.neu { color: rgba(255,255,255,0.6); }
.day-label {
  font-size: 10px; color: rgba(255,255,255,0.25);
  letter-spacing: 0.5px; margin-bottom: 14px;
}
.bar-wrap {
  height: 3px; background: rgba(255,255,255,0.07);
  border-radius: 2px; overflow: hidden; margin-bottom: 14px;
}
.bar-fill {
  height: 100%; border-radius: 2px; width: 0%;
  transition: width 0.6s ease, background 0.4s ease;
}
.bar-fill.pos { background: linear-gradient(90deg, #1a6640, #3ddc84); }
.bar-fill.neg { background: linear-gradient(90deg, #6b1a1a, #ff5f5f); }
.divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0 0 12px; }
.rows { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
.stat-row { display: flex; justify-content: space-between; align-items: center; }
.stat-label { font-size: 10px; color: rgba(255,255,255,0.28); letter-spacing: 0.5px; }
.stat-val { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.55); }
.stat-val.pos { color: #3ddc84; }
.stat-val.neg { color: #ff5f5f; }
.balance-row {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 10px;
}
.bal-label { font-size: 9px; color: rgba(255,255,255,0.2); letter-spacing: 1px; text-transform: uppercase; }
.bal-val { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); }
.date-footer {
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.date-txt {
  font-size: 10px; font-weight: 600;
  color: rgba(255,255,255,0.25);
}
.mini-pnl { font-size: 15px; font-weight: 700; letter-spacing: -0.5px; }
.mini-pnl.pos { color: #3ddc84; }
.mini-pnl.neg { color: #ff5f5f; }
.mini-pnl.neu { color: rgba(255,255,255,0.5); }
</style>
</head>
<body>
<div id="card">

  <!-- Normal mode -->
  <div id="normal-view">
    <div class="header">
      <div class="header-left">
        <span class="dot"></span>
        <span class="title">Total P&amp;L</span>
      </div>
      <button class="minimize-btn" onclick="toggleMin()" id="min-btn">—</button>
    </div>

    <div class="big-pnl neu" id="big-pnl">—</div>
    <div class="day-label" id="day-label">Loading...</div>

    <div class="bar-wrap">
      <div class="bar-fill" id="bar"></div>
    </div>

    <hr class="divider">

    <div class="rows">
      <div class="stat-row">
        <span class="stat-label">Realised</span>
        <span class="stat-val" id="realised">—</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Floating</span>
        <span class="stat-val" id="floating">—</span>
      </div>
    </div>

    <div class="balance-row">
      <span class="bal-label">Balance</span>
      <span class="bal-val" id="balance">Loading...</span>
    </div>

    <div class="date-footer">
      <span class="date-txt" id="card-date"></span>
    </div>

    <div class="reset-bar" onclick="doReset()">
      <span class="reset-bar-icon">↺</span>
      <span class="reset-bar-txt">Reset P&amp;L</span>
    </div>
  </div>

  <!-- Mini mode -->
  <div id="mini-view" style="display:none">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="dot"></span>
        <span class="mini-pnl neu" id="mini-pnl">—</span>
      </div>
      <button class="minimize-btn" onclick="toggleMin()" id="max-btn">＋</button>
    </div>
  </div>

</div>

<script>
var isMin = false;
var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Date ──────────────────────────────────────────────────
function updateDate() {
  var now  = new Date();
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var str  = days[now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate() + ' ' + now.getFullYear();
  var el = document.getElementById('card-date');
  if (el) el.textContent = str;
}
updateDate();
setInterval(updateDate, 60000);

function sinceText(ms) {
  var d = new Date(ms);
  var h = d.getHours();
  var ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  var m = d.getMinutes();
  return 'Since ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
}

function doReset() {
  var pnlEl = document.getElementById('big-pnl');
  if (pnlEl) { pnlEl.textContent = '$0.00'; pnlEl.className = 'big-pnl neu'; }
  var miniEl = document.getElementById('mini-pnl');
  if (miniEl) { miniEl.textContent = '$0.00'; miniEl.className = 'mini-pnl neu'; }
  var rEl = document.getElementById('realised');
  if (rEl) { rEl.textContent = '$0.00'; rEl.className = 'stat-val neu'; }
  var fEl = document.getElementById('floating');
  if (fEl) { fEl.textContent = '$0.00'; fEl.className = 'stat-val neu'; }
  var bar = document.getElementById('bar');
  if (bar) { bar.style.width = '0%'; bar.className = 'bar-fill'; }
  window.parent.postMessage({action: 'resetBalance'}, '*');
}

function toggleMin() {
  isMin = !isMin;
  var card       = document.getElementById('card');
  var normalView = document.getElementById('normal-view');
  var miniView   = document.getElementById('mini-view');
  if (isMin) {
    card.classList.add('mini');
    normalView.style.display = 'none';
    miniView.style.display   = 'block';
  } else {
    card.classList.remove('mini');
    normalView.style.display = 'block';
    miniView.style.display   = 'none';
  }
}

function cls(val) { return val > 0 ? 'pos' : val < 0 ? 'neg' : 'neu'; }

window.addEventListener('message', function(e) {
  var d = e.data; if (!d) return;

  if (d.since) {
    document.getElementById('day-label').textContent = sinceText(d.since);
  }
  if (d.balance !== undefined) {
    document.getElementById('balance').textContent = d.balance;
  }
  if (d.total !== undefined) {
    var bigEl  = document.getElementById('big-pnl');
    var miniEl = document.getElementById('mini-pnl');
    var c      = cls(d.totalRaw || 0);
    bigEl.textContent  = d.total;
    bigEl.className    = 'big-pnl ' + c;
    miniEl.textContent = d.total;
    miniEl.className   = 'mini-pnl ' + c;
    var absVal = Math.abs(d.totalRaw || 0);
    var pct    = Math.min(absVal / Math.max(absVal + 1, 1) * 100, 100);
    var bar    = document.getElementById('bar');
    bar.style.width = Math.max(pct, d.totalRaw !== 0 ? 4 : 0) + '%';
    bar.className   = 'bar-fill ' + c;
  }
  if (d.realised !== undefined) {
    var el = document.getElementById('realised');
    el.textContent = d.realised;
    el.className   = 'stat-val ' + cls(d.realisedRaw || 0);
  }
  if (d.floating !== undefined) {
    var el = document.getElementById('floating');
    el.textContent = d.floating;
    el.className   = 'stat-val ' + cls(d.floatingRaw || 0);
  }
});
</script>
</body></html>`;

        this.createHTML({
            foreground: true,
            style: {
                width:  "240px",
                height: "300px",
                right:  "14px",
                top:    "14px"
            },
            html: html
        });
    }

    _num(v) {
        return (parseFloat(v) || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }
    _pnl(v, currency) {
        var n   = parseFloat(v) || 0;
        var abs = Math.abs(n).toLocaleString("en-US", {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
        if (n > 0) return "+" + (currency || "$") + abs;
        if (n < 0) return "-" + (currency || "$") + abs;
        return (currency || "$") + "0.00";
    }
}
