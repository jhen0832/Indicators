/* ================================================================
   Liquid Charts Pro — P&L Card v5
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
        this.$htmlCreated    = false;
        this.$openingBalance = null;
        this.$todayDateStr   = new Date().toISOString().slice(0, 10);
        this.$currency       = "$";
        this.$lastParams     = {};
        this.$panelLeft      = null;  // set on first move
        this.$panelTop       = 14;

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
            this.$todayDateStr   = todayStr;
            this.$openingBalance = null;
        }
    }

    onHTMLMessage(msg) {
        if (!msg) return;
        if (msg.action === "move") {
            try {
                // On first drag, initialise left from reported chart width
                // Default start position: right side of chart (approx 800px wide)
                if (this.$panelLeft === null) {
                    var chartW = msg.chartW || 800;
                    this.$panelLeft = chartW - 260 - 14;
                }
                this.$panelLeft = Math.max(0, this.$panelLeft + (msg.dx || 0));
                this.$panelTop  = Math.max(0, (this.$panelTop || 14) + (msg.dy || 0));
                this.changeHTML({
                    style: {
                        width:  "260px",
                        height: "360px",
                        left:   this.$panelLeft + "px",
                        top:    this.$panelTop  + "px"
                    }
                });
            } catch(e) {}
        }
    }

    _tick() {
        if (!this.$htmlCreated) return;

        var balance  = 0;
        var floating = 0;
        var currency = this.$currency;

        // Detect demo vs live account
        var accountType = "active";
        try {
            var acct = Framework.Account;
            if (acct) {
                balance  = acct.balance    || 0;
                floating = acct.floatingPL || 0;
                currency = acct.currencySymbol || acct.depositCurrency || "$";
                this.$currency = currency;

                // Read the account name string — the platform puts it
                // right in Framework.Account. From the UI we can see:
                //   ECN_248617_9  = real live account
                //   Dem...        = demo account
                // So we check what the account name starts with.
                var acctNameStr = acct.accountName || acct.name ||
                                  acct.login       || acct.id   || "";
                acctNameStr = String(acctNameStr);

                var nameLower = acctNameStr.toLowerCase();

                var isDemo = false;
                var isLive = false;

                // Demo detection — starts with "dem" or contains "demo"
                if (nameLower.indexOf("dem") === 0)    isDemo = true;
                if (nameLower.indexOf("demo") >= 0)    isDemo = true;

                // Live detection — starts with "ecn", "live", "real", "pro"
                if (nameLower.indexOf("ecn")  === 0)   isLive = true;
                if (nameLower.indexOf("live") === 0)   isLive = true;
                if (nameLower.indexOf("real") === 0)   isLive = true;
                if (nameLower.indexOf("pro")  === 0)   isLive = true;

                // Also check known Framework properties as fallback
                if (acct.isDemo === true)              isDemo = true;
                if (acct.isDemo === false)             isLive = true;

                // Demo wins if both somehow trigger
                if (isDemo)      accountType = "demo";
                else if (isLive) accountType = "live";
            }
        } catch(e) { return; }

        if (this.$openingBalance === null && balance > 0) {
            this.$openingBalance = balance - floating;
        }
        if (this.$openingBalance === null) return;

        var realised = (balance - floating) - this.$openingBalance;
        var total    = realised + floating;
        var p        = this.$lastParams || {};

        this.sendHTMLMessage({
            acctName:     p.accountName || "Profit Stats",
            accent:       p.accentColor || "#3ddc84",
            balance:      this._fmt(balance, currency),
            floating:     this._pnl(floating, currency),
            floatingRaw:  floating,
            total:        this._pnl(total, currency),
            totalRaw:     total,
            accountType:  accountType
        });
    }

    _buildCard() {
        var html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
* { box-sizing:border-box; margin:0; padding:0; }
html,body { width:100%; overflow:hidden; background:transparent; }
body { font-family:'Inter',sans-serif; }

/* ── Card ── */
#card {
  width: 240px;
  background: #12151e;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.7);
}
#card.mini { border-radius: 28px; width: 200px; }

/* ── Drag bar ── */
#dbar {
  height: 24px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px;
  cursor: grab;
  background: rgba(255,255,255,0.02);
}
#dbar:active { cursor: grabbing; }
.ddots { display:flex; gap:3px; }
.ddot  { width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,0.10); }
.ibtn  {
  background: transparent; border: none;
  color: rgba(255,255,255,0.3); font-size:13px;
  cursor:pointer; padding: 0 4px; line-height:1;
  font-family: inherit;
}
.ibtn:hover { color: rgba(255,255,255,0.6); }

/* ── Mini mode ── */
#minibar {
  display: none; padding: 10px 16px;
  align-items: center; justify-content: space-between;
}
.mini-num { font-size:17px; font-weight:800; }
.mini-num.pos { color:#3ddc84; }
.mini-num.neg { color:#ff5252; }
.mini-num.neu { color:rgba(255,255,255,0.45); }

/* ── Full content ── */
#content { padding: 14px 16px 16px; display:flex; flex-direction:column; gap:10px; }

/* ── Top row: name + badge ── */
.top-row {
  display: flex; align-items: center; justify-content: space-between;
}
.acct-name {
  font-size: 11px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}
.badge {
  display: flex; align-items: center; gap: 6px;
  background: rgba(61,220,132,0.1);
  border: 1px solid rgba(61,220,132,0.3);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.5px;
  color: #3ddc84;
}
.badge.custom { color: var(--ac); border-color: rgba(var(--acr),0.3); background:rgba(var(--acr),0.1); }
.pdot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #3ddc84;
  box-shadow: 0 0 5px #3ddc84;
  animation: pulse 2s infinite;
}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}

/* ── Block ── */
.block {
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.05);
}

.blk-label {
  font-size: 9px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  margin-bottom: 6px;
}

/* Balance */
.bal-num {
  font-size: 22px; font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

/* P&L big */
.pnl-num {
  font-size: 30px; font-weight: 900;
  letter-spacing: -1px; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.pnl-num.pos { color: #3ddc84; }
.pnl-num.neg { color: #ff5252; }
.pnl-num.neu { color: rgba(255,255,255,0.4); }

/* Floating */
.flt-num {
  font-size: 24px; font-weight: 800;
  letter-spacing: -0.8px; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.flt-num.pos { color: #3ddc84; }
.flt-num.neg { color: #ff5252; }
.flt-num.neu { color: rgba(255,255,255,0.4); }
</style>
</head>
<body>

<div id="card">
  <!-- Drag bar -->
  <div id="dbar">
    <div class="ddots">
      <div class="ddot"></div><div class="ddot"></div>
      <div class="ddot"></div><div class="ddot"></div>
      <div class="ddot"></div>
    </div>
    <button class="ibtn" onclick="toggleMin()" id="mbtn">—</button>
  </div>

  <!-- Mini pill -->
  <div id="minibar">
    <div style="display:flex;align-items:center;gap:8px">
      <span class="pdot"></span>
      <span class="mini-num neu" id="mini-num">$0.00</span>
    </div>
    <button class="ibtn" onclick="toggleMin()">＋</button>
  </div>

  <!-- Full content -->
  <div id="content">

    <!-- Account name + Active badge -->
    <div class="top-row">
      <span class="acct-name" id="acct-name">PROFIT STATS</span>
      <div class="badge" id="badge">
        <span class="pdot" id="bdot"></span>
        <span id="btext">ACTIVE</span>
      </div>
    </div>

    <!-- Balance block -->
    <div class="block">
      <div class="blk-label">Balance</div>
      <div class="bal-num" id="balance">$0.00</div>
    </div>

    <!-- Today's P&L block -->
    <div class="block">
      <div class="blk-label">Today's P&amp;L</div>
      <div class="pnl-num neu" id="total">$0.00</div>
    </div>

    <!-- Floating P&L block -->
    <div class="block">
      <div class="blk-label">Floating P&amp;L</div>
      <div class="flt-num neu" id="floating">$0.00</div>
    </div>

  </div>
</div>

<script>
// ── Accent color helpers ───────────────────────────────────
function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r = parseInt(hex.slice(0,2),16);
  var g = parseInt(hex.slice(2,4),16);
  var b = parseInt(hex.slice(4,6),16);
  return r+','+g+','+b;
}

function setAccent(color) {
  document.documentElement.style.setProperty('--ac', color);
  document.documentElement.style.setProperty('--acr', hexToRgb(color||'#3ddc84'));
  // Update pulse dot color
  var dots = document.querySelectorAll('.pdot');
  dots.forEach(function(d){
    d.style.background  = color;
    d.style.boxShadow   = '0 0 6px ' + color;
  });
  // Update badge
  var badge = document.getElementById('badge');
  badge.style.color       = color;
  badge.style.borderColor = color;
  badge.style.background  = 'rgba(' + hexToRgb(color) + ',0.10)';
}

setAccent('#3ddc84');

// ── Minimize ──────────────────────────────────────────────
var isMin = false;
function toggleMin() {
  isMin = !isMin;
  document.getElementById('content').style.display  = isMin ? 'none' : 'flex';
  document.getElementById('minibar').style.display   = isMin ? 'flex' : 'none';
  document.getElementById('card').className           = isMin ? 'mini' : '';
  document.getElementById('mbtn').textContent         = isMin ? '＋' : '—';
}

// ── Drag ──────────────────────────────────────────────────
var drag = false, sx = 0, sy = 0;
var dbar = document.getElementById('dbar');

dbar.addEventListener('mousedown', function(e) {
  if (e.target.classList.contains('ibtn')) return;
  drag = true; sx = e.screenX; sy = e.screenY;
  e.preventDefault();
});
document.addEventListener('mousemove', function(e) {
  if (!drag) return;
  var dx = e.screenX - sx, dy = e.screenY - sy;
  sx = e.screenX; sy = e.screenY;
  window.parent.postMessage({
    action:'move', dx:dx, dy:dy,
    chartW: window.innerWidth
  }, '*');
});
document.addEventListener('mouseup', function() { drag = false; });

dbar.addEventListener('touchstart', function(e) {
  if (e.target.classList.contains('ibtn')) return;
  var t = e.touches[0]; drag = true; sx = t.clientX; sy = t.clientY;
  e.preventDefault();
}, {passive:false});
document.addEventListener('touchmove', function(e) {
  if (!drag) return;
  var t = e.touches[0];
  var dx = t.clientX - sx, dy = t.clientY - sy;
  sx = t.clientX; sy = t.clientY;
  window.parent.postMessage({
    action:'move', dx:dx, dy:dy,
    chartW: window.innerWidth
  }, '*');
}, {passive:true});
document.addEventListener('touchend', function() { drag = false; });

// ── Helpers ───────────────────────────────────────────────
function cls(v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu'; }

// ── Messages ──────────────────────────────────────────────
window.addEventListener('message', function(e) {
  var d = e.data; if (!d) return;

  if (d.accent) setAccent(d.accent);

  if (d.acctName) {
    document.getElementById('acct-name').textContent = d.acctName.toUpperCase();
  }
  if (d.balance) {
    document.getElementById('balance').textContent = d.balance;
  }
  if (d.total !== undefined) {
    var el = document.getElementById('total');
    el.textContent = d.total;
    el.className   = 'pnl-num ' + cls(d.totalRaw || 0);
    var mn = document.getElementById('mini-num');
    mn.textContent = d.total;
    mn.className   = 'mini-num ' + cls(d.totalRaw || 0);
  }
  if (d.floating !== undefined) {
    var fl = document.getElementById('floating');
    fl.textContent = d.floating;
    fl.className   = 'flt-num ' + cls(d.floatingRaw || 0);
  }

  // Account type badge: demo = orange, live = green, active = teal
  if (d.accountType !== undefined) {
    var badge = document.getElementById('badge');
    var bdot  = document.getElementById('bdot');
    var btext = document.getElementById('btext');
    var color, label;

    if (d.accountType === 'demo') {
      color = '#f59e0b'; label = 'DEMO';
    } else if (d.accountType === 'live') {
      color = '#3ddc84'; label = 'LIVE';
    } else {
      color = '#3ddc84'; label = 'ACTIVE';
    }

    btext.textContent         = label;
    bdot.style.background     = color;
    bdot.style.boxShadow      = '0 0 6px ' + color;
    badge.style.color         = color;
    badge.style.borderColor   = 'rgba(' + hexToRgb(color) + ',0.4)';
    badge.style.background    = 'rgba(' + hexToRgb(color) + ',0.10)';
  }
});
</script>
</body></html>`;

        this.createHTML({
            foreground: true,
            style: {
                width:  "260px",
                height: "360px",
                right:  "14px",
                top:    "14px"   /* initial — switches to left on first drag */
            },
            html: html
        });
    }

    _fmt(v, cur) {
        var n = parseFloat(v) || 0;
        return (cur||"$") + n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    }
    _pnl(v, cur) {
        var n = parseFloat(v) || 0;
        var a = Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
        if (n > 0) return "+" + (cur||"$") + a;
        if (n < 0) return "-" + (cur||"$") + a;
        return (cur||"$") + "0.00";
    }
}