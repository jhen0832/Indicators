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
        this.$openingBalance = null;  // balance at start of day — set once
        this.$todayDateStr   = new Date().toISOString().slice(0, 10);
        this.$histLoaded     = true;  // not using history — always ready
        this.$currency       = "$";

        var self = this;
        // Tick every second — all P&L calculated from balance delta
        setInterval(function() { self._tick(); }, 1000);

        return {
            caption:        "P&L Card",
            isOverlay:      true,
            plots:          [],
            settingsFields: []
        };
    }

    onContextChange(data) {}
    onParameterChange(data) {}

    onCalculate(data, output) {
        if (!this.$htmlCreated) {
            this.$htmlCreated = true;
            this._buildCard();
        }
        // Reset opening balance on new calendar day
        var todayStr = new Date().toISOString().slice(0, 10);
        if (todayStr !== this.$todayDateStr) {
            this.$todayDateStr   = todayStr;
            this.$openingBalance = null;  // will be set on next tick
        }
    }



    _tick() {
        if (!this.$htmlCreated) return;

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

        // Set opening balance once at the start of the day
        // This is the anchor — everything is measured against it
        if (this.$openingBalance === null && balance > 0) {
            // Opening balance = current balance minus any open floating P&L
            // so we start from a clean "before today's trades" number
            this.$openingBalance = balance - floating;
        }

        if (this.$openingBalance === null) return;

        // Today's realised P&L = current balance vs opening balance
        // When you close a trade, balance changes permanently — this captures it
        // floating P&L disappears when trade closes, balance absorbs it
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

/* ── Full card ── */
#card {
  background: linear-gradient(160deg, rgba(15,17,26,0.97) 0%, rgba(20,24,38,0.97) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px;
  padding: 18px 20px 16px;
  width: 220px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  transition: all 0.3s ease;
}

/* ── Mini card (minimized) ── */
#card.mini {
  padding: 10px 16px;
  width: 140px;
  border-radius: 30px;
}

/* ── Header row ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #44ee44;
  box-shadow: 0 0 5px #44ee44;
  animation: pulse 2s infinite;
  flex-shrink: 0;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
.title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
}
.minimize-btn {
  background: rgba(255,255,255,0.06);
  border: none;
  border-radius: 6px;
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 7px;
  line-height: 1.4;
  transition: background 0.2s;
}
.minimize-btn:hover { background: rgba(255,255,255,0.12); }

/* ── Big P&L number ── */
.big-pnl {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.1;
  margin: 6px 0 2px;
  transition: color 0.4s;
}
.big-pnl.pos { color: #3ddc84; }
.big-pnl.neg { color: #ff5f5f; }
.big-pnl.neu { color: rgba(255,255,255,0.6); }

.day-label {
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

/* ── Progress bar ── */
.bar-wrap {
  height: 3px;
  background: rgba(255,255,255,0.07);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 14px;
}
.bar-fill {
  height: 100%;
  border-radius: 2px;
  width: 0%;
  transition: width 0.6s ease, background 0.4s ease;
}
.bar-fill.pos { background: linear-gradient(90deg, #1a6640, #3ddc84); }
.bar-fill.neg { background: linear-gradient(90deg, #6b1a1a, #ff5f5f); }

/* ── Divider ── */
.divider {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.06);
  margin: 0 0 12px;
}

/* ── Row stats ── */
.rows { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-label {
  font-size: 10px;
  color: rgba(255,255,255,0.28);
  letter-spacing: 0.5px;
}
.stat-val {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
}
.stat-val.pos { color: #3ddc84; }
.stat-val.neg { color: #ff5f5f; }

/* ── Balance row ── */
.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.bal-label {
  font-size: 9px;
  color: rgba(255,255,255,0.2);
  letter-spacing: 1px;
  text-transform: uppercase;
}
.bal-val {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
}

/* ── Loading state ── */
.loading-txt {
  font-size: 10px;
  color: rgba(255,255,255,0.2);
  text-align: center;
  letter-spacing: 1px;
  margin-top: 4px;
}

/* ── Mini mode ── */
.mini-pnl {
  display: none;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.mini-pnl.pos { color: #3ddc84; }
.mini-pnl.neg { color: #ff5f5f; }
.mini-pnl.neu { color: rgba(255,255,255,0.5); }
.mini-header {
  display: none;
  align-items: center;
  justify-content: space-between;
}
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

    <div class="loading-txt" id="loading-txt" style="display:none">Loading history...</div>
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

function cls(val) {
  return val > 0 ? 'pos' : val < 0 ? 'neg' : 'neu';
}

window.addEventListener('message', function(e) {
  var d = e.data;
  if (!d) return;

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

    // Progress bar — scales to abs value, capped at full
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

  if (d.loading !== undefined) {
    document.getElementById('loading-txt').style.display =
      d.loading ? 'block' : 'none';
  }
});
</script>
</body></html>`;

        this.createHTML({
            foreground: true,
            style: {
                width:  "240px",
                height: "230px",
                right:  "14px",
                top:    "14px"
            },
            html: html
        });
    }

    /* helpers */
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