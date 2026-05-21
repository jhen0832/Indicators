/* ================================================================
   Liquid Charts Pro — Floating P&L Card
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode:           UDI + Framework
   5. Trading action: Confirm
   6. Click ADD

   Shows a floating card with:
   - Today's total P&L (big number, green or red)
   - Realised P&L (closed trades today)
   - Floating P&L (open trades right now)
   - Account balance
   - Minimize button to collapse to just the number
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$htmlCreated    = false;
        this.$todayDateStr   = new Date().toISOString().slice(0, 10);
        this.$histLoaded     = true;
        this.$currency       = "$";
        this.$openingBalance = null;
        this.$waitingForRestore = true;
        this.$pendingReset = false;  // set true to reset on next tick

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
        var doReset = p.resetPnL === true || p.resetPnL === "true" || p.resetPnL === 1;
        if (doReset) {
            // Set flag — _tick will handle it on next second
            // (safer than calling sendHTMLMessage here which may not be ready)
            this.$pendingReset = true;
        }
    }

    onHTMLMessage(msg) {
        if (!msg) return;
        // User clicked RESET button on the card
        if (msg.action === "resetBalance") {
            this.$openingBalance    = null;
            this.$waitingForRestore = false;
            // _tick will set a fresh openingBalance on next second
            return;
        }
        // Panel sends back saved opening balance on load
        if (msg.action === "restoreBalance" && msg.balance > 0) {
            var today = new Date().toISOString().slice(0, 10);
            if (msg.date === today) {
                this.$openingBalance    = msg.balance;
                this.$waitingForRestore = false;
            }
        }
        if (msg.action === "ready") {
            this.$waitingForRestore = false;
        }
    }

    onCalculate(data, output) {
        if (!this.$htmlCreated) {
            this.$htmlCreated = true;
            this._buildCard();
        }

        // Reset opening balance on new calendar day
        var todayStr = new Date().toISOString().slice(0, 10);
        if (todayStr !== this.$todayDateStr) {
            this.$todayDateStr   = todayStr;
            this.$openingBalance = null;
            this.$waitingForRestore = false;
            this.sendHTMLMessage({clearBalance: true});
        }
    }

    _tick() {
        if (!this.$htmlCreated) return;

        // Handle pending manual reset
        if (this.$pendingReset) {
            this.$pendingReset      = false;
            this.$openingBalance    = null;
            this.$waitingForRestore = false;
            // Clear all saved storage in the panel
            this.sendHTMLMessage({clearBalance: true});
            // Show zeros immediately
            var cur = this.$currency || "$";
            this.sendHTMLMessage({
                balance:     cur + "0.00",
                realised:    cur + "0.00",
                floating:    cur + "0.00",
                total:       cur + "0.00",
                totalRaw:    0,
                realisedRaw: 0,
                floatingRaw: 0,
                loading:     false
            });
            return;
        }

        if (this.$waitingForRestore) return;

        var balance  = 0;
        var floating = 0;
        var currency = this.$currency || "$";

        try {
            var acct = Framework.Account;
            if (acct) {
                balance  = acct.balance    || 0;
                floating = acct.floatingPL || 0;
                currency = acct.currencySymbol || acct.depositCurrency || "$";
                this.$currency = currency;
            }
        } catch(e) { return; }

        if (this.$openingBalance === null && balance > 0) {
            this.$openingBalance = balance - floating;
            // Send to panel to save — panel uses sessionStorage + window.name
            // both of which survive soft reloads and sleep mode
            this.sendHTMLMessage({
                saveBalance: this.$openingBalance,
                saveDate:    this.$todayDateStr
            });
        }

        if (this.$openingBalance === null) return;

        var realised = (balance - floating) - this.$openingBalance;
        var total    = realised + floating;

        this.sendHTMLMessage({
            balance:     currency + this._num(balance),
            realised:    this._pnl(realised, currency),
            floating:    this._pnl(floating, currency),
            total:       this._pnl(total, currency),
            totalRaw:    total,
            realisedRaw: realised,
            floatingRaw: floating,
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
        <span class="title">Today's P&amp;L</span>
      </div>
      <button class="minimize-btn" onclick="toggleMin()" id="min-btn">—</button>
    </div>

    <div class="big-pnl neu" id="big-pnl">—</div>
    <div class="day-label">Today's total performance</div>

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
      <span class="reset-bar-txt">Reset Today's P&amp;L</span>
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

// ── Persistent balance storage ────────────────────────────
// Uses THREE methods so at least one always survives:
// 1. sessionStorage  — survives page refresh
// 2. window.name     — survives navigation/reload
// 3. cookie          — survives logout and sleep

var SAVE_KEY = "pnlcard_ob_v2";

function saveBalance(balance, date) {
  var val = JSON.stringify({b: balance, d: date});
  // Method 1: sessionStorage
  try { sessionStorage.setItem(SAVE_KEY, val); } catch(e) {}
  // Method 2: window.name (survives page reload)
  try {
    var wn = {};
    try { wn = JSON.parse(window.name) || {}; } catch(e2) {}
    wn[SAVE_KEY] = val;
    window.name = JSON.stringify(wn);
  } catch(e) {}
  // Method 3: document.cookie (survives logout)
  try {
    var exp = new Date();
    exp.setHours(23, 59, 59, 999);
    document.cookie = SAVE_KEY + "=" + encodeURIComponent(val)
        + "; expires=" + exp.toUTCString() + "; path=/; SameSite=Lax";
  } catch(e) {}
}

function loadBalance() {
  var val = null;
  // Try sessionStorage first
  try { val = sessionStorage.getItem(SAVE_KEY); } catch(e) {}
  // Try window.name
  if (!val) {
    try {
      var wn = JSON.parse(window.name) || {};
      val = wn[SAVE_KEY] || null;
    } catch(e) {}
  }
  // Try cookie
  if (!val) {
    try {
      var cookies = document.cookie.split(";");
      for (var i = 0; i < cookies.length; i++) {
        var c = cookies[i].trim();
        if (c.indexOf(SAVE_KEY + "=") === 0) {
          val = decodeURIComponent(c.substring(SAVE_KEY.length + 1));
          break;
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
    var wn = {};
    try { wn = JSON.parse(window.name) || {}; } catch(e2) {}
    delete wn[SAVE_KEY];
    window.name = JSON.stringify(wn);
  } catch(e) {}
  try {
    document.cookie = SAVE_KEY + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  } catch(e) {}
}

// On load — try to restore saved balance and send it to the indicator
(function() {
  var today = new Date().toISOString().slice(0, 10);
  var saved = loadBalance();
  if (saved && saved.b > 0 && saved.d === today) {
    // Send saved balance back to indicator
    window.parent.postMessage({action: "restoreBalance", balance: saved.b, date: saved.d}, "*");
  } else {
    // Nothing saved — tell indicator we're ready
    window.parent.postMessage({action: "ready"}, "*");
  }
})();

// ── Date ──────────────────────────────────────────────────
function updateDate() {
  var now    = new Date();
  var days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var str    = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ' ' + now.getFullYear();
  var el = document.getElementById('card-date');
  if (el) el.textContent = str;
}
updateDate();
setInterval(updateDate, 60000);

function doReset() {
  // Clear all saved storage immediately
  clearBalance();
  // Reset all displays to zero
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
  // Tell the indicator to wipe its openingBalance
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

  // Save/clear balance commands from indicator
  if (d.saveBalance !== undefined && d.saveBalance > 0) {
    saveBalance(d.saveBalance, d.saveDate);
  }
  if (d.clearBalance) {
    clearBalance();
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
                height: "260px",
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
    _todayStartMs() {
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }
}
