<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>QT Sniper Auto Bot</title>

<!-- Framework CSS + JS — required for all widgets -->
<link rel="stylesheet" type="text/css" href="https://mytrader.fxbluelabs.com/css/widget-css"/>
<script src="https://mytrader.fxbluelabs.com/scripts/widget-js"></script>

<style>
html, body {
  margin: 0; padding: 0; height: 100%;
  font-family: var(--font-family, system-ui);
  font-size: var(--font-size-base, 13px);
  color: #dfe7ff;
  background: radial-gradient(ellipse at top, #0f1730 0%, #070b16 70%);
  overflow: hidden;
}
body { display: flex; flex-direction: column; }
.widget-header {
  display: flex; align-items: center; justify-content: space-between;
  padding-block: 12px;
  padding-inline-start: 16px;
  padding-inline-end: var(--widget-chrome-inset-horizontal, 40px);
  border-bottom: 1px solid rgba(56,214,255,0.18);
  font-weight: 700; font-size: 15px; letter-spacing: 0.3px;
  color: #6fe3ff; text-shadow: 0 0 10px rgba(111,227,255,0.35);
  flex: 0 0 auto;
}
#minimizeBtn {
  background: rgba(111,227,255,0.08); border: 1px solid rgba(111,227,255,0.3);
  border-radius: 6px; width: 26px; height: 26px; line-height: 1; font-size: 14px;
  padding: 0; color: #6fe3ff; cursor: pointer;
}
#content {
  padding: 14px 16px 20px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}
body.minimized #content { display: none; }
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.row label { flex: 0 0 150px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.75; }
.row input[type="text"], .row input[type="number"], .row select {
  flex: 1 1 100px; min-width: 70px;
  background: #0c1224;
  color: #eaf2ff;
  border: 1px solid rgba(111,227,255,0.25);
  border-radius: 8px; padding: 9px 10px; font-size: 13px;
}
.row input:focus, .row select:focus { outline: none; border-color: #6fe3ff; box-shadow: 0 0 0 2px rgba(111,227,255,0.15); }
.row input[type="checkbox"] { width: 16px; height: 16px; }
fieldset {
  border: 1px solid rgba(111,227,255,0.15); border-radius: 12px; margin-bottom: 14px; padding: 12px 14px;
  background: rgba(111,227,255,0.02);
}
legend { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; padding: 0 6px; color: #9fd8ff; }
.btnrow { display: flex; flex-direction: column; gap: 10px; margin: 12px 0; }
button {
  cursor: pointer; border-radius: 10px; border: none;
  padding: 12px 16px; font-weight: 700; font-size: 13px; letter-spacing: 0.3px;
  background: #131a30; color: #dfe7ff; transition: transform 0.05s ease;
}
button:active { transform: scale(0.98); }
.pill-btn {
  background: linear-gradient(135deg, #2fd4ff, #3b6fff);
  color: #04101f; box-shadow: 0 4px 14px rgba(59,111,255,0.35);
}
#startBtn:disabled, #stopBtn:disabled {
  background: #1a2038; color: #5b6788; box-shadow: none; cursor: default;
}
#status {
  font-weight: 700; padding: 8px 14px; border-radius: 999px; margin-bottom: 14px;
  text-align: center; font-size: 12px; letter-spacing: 0.4px; text-transform: uppercase;
  border: 1px solid rgba(255,255,255,0.08);
}
#status.stopped { background: rgba(239,83,80,0.12); color: #ff8a80; border-color: rgba(239,83,80,0.3); }
#status.running { background: rgba(38,214,166,0.14); color: #4dffcf; border-color: rgba(38,214,166,0.35); }
#versionBadge {
  display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px;
  background: rgba(111,227,255,0.08); border: 1px solid rgba(111,227,255,0.25);
  color: #9fd8ff; font-size: 10.5px; letter-spacing: 0.3px;
}
#log {
  height: 200px; overflow-y: auto; font-family: monospace; font-size: 11.5px;
  background: #060a16; border: 1px solid rgba(111,227,255,0.15);
  border-radius: 10px; padding: 8px 10px; white-space: pre-wrap;
}
.log-buy { color: #4dffcf; }
.log-sell { color: #ff8a80; }
.log-info { opacity: 0.7; }
.log-warn { color: #ffcf6f; }
.warning-box {
  background: rgba(255,183,77,0.10); border: 1px solid rgba(255,183,77,0.35);
  border-radius: 10px; padding: 10px 12px; font-size: 11.5px; margin-bottom: 12px;
}
.intro-box {
  background: rgba(111,227,255,0.06); border: 1px solid rgba(111,227,255,0.25);
  border-radius: 10px; padding: 12px 14px; font-size: 12px; line-height: 1.55; margin-bottom: 14px;
}
.hint { display: block; font-size: 11px; opacity: 0.6; margin: -5px 0 10px 0; line-height: 1.4; }
#advancedToggle {
  width: 100%; text-align: center; margin-bottom: 12px;
  background: rgba(111,227,255,0.05); border: 1px dashed rgba(111,227,255,0.25); color: #9fd8ff;
}
#advancedSection { display: none; }
#advancedSection.expanded { display: block; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
.stat-box { background: #0c1224; border: 1px solid rgba(111,227,255,0.18); border-radius: 10px; padding: 10px 12px; }
.stat-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.3px; opacity: 0.6; display: block; margin-bottom: 4px; }
.stat-value { font-size: 18px; font-weight: 700; color: #eaf2ff; }
.stats-btnrow { display: flex; gap: 8px; margin-top: 4px; }
.stats-btnrow button { flex: 1; padding: 8px 10px; font-size: 12px; }
</style>
</head>

<body>
<div class="widget-header">
  <span>QT Sniper Auto Bot</span>
  <button id="minimizeBtn" title="Minimize">▁</button>
</div>
<div id="content">

  <span id="versionBadge">⚡ QT Sniper v2.0</span>

  <div class="warning-box">
    ⚠️ This places <b>real orders</b> the moment conditions are met (unless "Confirm every order" in Advanced is
    ticked). Test on a demo account first. Stopping the bot does not close open trades.
  </div>

  <div id="status" class="stopped">● Bot Stopped</div>

  <div class="intro-box">
    <b>New to this? Here's all you need:</b><br>
    Type your instrument, pick a Mode, leave everything else as shown, and press Start Bot.
    It watches for a real trend with strong momentum and trades it automatically — stop-loss,
    take-profit, and a trailing stop all handled for you. Use <b>Test Trade</b> and "Confirm
    every order" (in Advanced) while you're still learning how it behaves.
  </div>

  <fieldset>
    <legend>Performance (this session)</legend>
    <small class="hint">Tracks trades this bot has managed since the page was last loaded — not your full account history. Export to CSV before closing the tab if you want to keep a record.</small>
    <div class="stats-grid">
      <div class="stat-box"><span class="stat-label">Total Trades</span><span class="stat-value" id="statTotalTrades">0</span></div>
      <div class="stat-box"><span class="stat-label">Win Rate</span><span class="stat-value" id="statWinRate">—</span></div>
      <div class="stat-box"><span class="stat-label">Net P/L</span><span class="stat-value" id="statNetProfit">0.00</span></div>
      <div class="stat-box"><span class="stat-label">Biggest Win / Loss</span><span class="stat-value" style="font-size:13px"><span id="statBiggestWin">—</span> / <span id="statBiggestLoss">—</span></span></div>
    </div>
    <div class="stats-btnrow">
      <button type="button" id="exportCsvBtn">⬇ Export CSV</button>
      <button type="button" id="resetStatsBtn">↺ Reset Stats</button>
    </div>
  </fieldset>

  <fieldset>
    <legend>Market</legend>
    <small class="hint">Type it exactly as shown on your own chart (e.g. EURUSD, XAUUSD, NAS100) — not a nickname like "Gold."</small>
    <div class="row"><label>Instrument</label><input type="text" id="instrumentId" placeholder="e.g. EURUSD"></div>
  </fieldset>

  <fieldset>
    <legend>Mode</legend>
    <small class="hint">Sets the timeframe and risk profile all at once. Scalper = fast, frequent, smaller moves. Swing = slower, fewer trades, bigger moves. Hybrid = balanced middle ground.</small>
    <div class="row"><label>Mode</label>
      <select id="modeSelect">
        <option value="scalper">Scalper</option>
        <option value="swing">Swing</option>
        <option value="hybrid" selected>Hybrid</option>
      </select>
    </div>
  </fieldset>

  <fieldset>
    <legend>Account Size</legend>
    <small class="hint">This sets your position sizing, daily limits, and trailing amounts all in dollars appropriate to your account — so you don't have to work out any of that math yourself. Pick the one that matches your actual balance.</small>
    <div class="row"><label>Account Size</label>
      <select id="accountSizeSelect">
        <option value="" selected disabled>Select your account size...</option>
        <option value="small">Small ($50 – $500)</option>
        <option value="medium">Medium ($1,000 – $5,000)</option>
        <option value="large">Large ($10,000+)</option>
      </select>
    </div>
  </fieldset>

  <fieldset>
    <legend>Stop-Loss / Take-Profit</legend>
    <small class="hint">⚠️ Turning off the stop-loss means a trade has no automatic downside exit except your Daily circuit breaker or a manual close — that's real, uncapped risk on that trade. Leave it ON unless you specifically know why you want it off.</small>
    <div class="row"><label>Add Stop-Loss</label>
      <select id="addStopLoss">
        <option value="on" selected>ON (recommended)</option>
        <option value="off">OFF</option>
      </select>
    </div>
    <div class="row"><label>Add Take-Profit</label>
      <select id="addTakeProfit">
        <option value="on" selected>ON</option>
        <option value="off">OFF</option>
      </select>
    </div>
    <small class="hint">Take-Profit OFF just means no fixed target is set — the trade instead exits via Auto Trailing below (if on) or the stop-loss.</small>
  </fieldset>

  <fieldset>
    <legend>Auto Trailing</legend>
    <small class="hint">ON: once a trade is far enough in profit, the stop-loss automatically moves up to lock in gains as price keeps moving your way. OFF: the trade keeps its original stop-loss/take-profit only, untouched.</small>
    <div class="row"><label>Auto Trailing</label>
      <select id="autoTrailingOn">
        <option value="on" selected>ON</option>
        <option value="off">OFF</option>
      </select>
    </div>
    <div class="row"><label>Trail After Profit ($)</label><input type="number" id="trailAfterProfitDollars" value="20" min="0" step="1"></div>
    <div class="row"><label>Profit Lock Distance ($)</label><input type="number" id="profitLockDistanceDollars" value="8" min="0" step="1"></div>
    <small class="hint">Once a trade is up "Trail After Profit" dollars, the stop starts following price, staying "Profit Lock Distance" dollars behind it. Tune both to your account size and instrument — these are starting points, not universal numbers.</small>
    <div class="row"><label>Breakeven buffer ($)</label><input type="number" id="breakevenBufferDollars" value="3" min="0" step="1"></div>
    <small class="hint">A raw "breakeven" stop at your exact entry price still costs you the spread (and any commission) if it's hit — that's a small guaranteed loss, not zero. This adds a cushion on top, so getting stopped at breakeven means a tiny locked-in win, or at worst a true $0, never a loss. Set this to roughly your instrument's typical spread + commission cost.</small>
  </fieldset>

  <fieldset>
    <legend>Daily circuit breaker</legend>
    <small class="hint">Set an amount and forget it — hit either one and the bot stops trading for the day on its own.</small>
    <div class="row"><label>Daily Stop Loss ($)</label><input type="number" id="dailyMaxLoss" value="0" min="0" step="1"></div>
    <div class="row"><label>Daily Take Profit ($)</label><input type="number" id="dailyProfitTarget" value="0" min="0" step="1"></div>
    <div class="row"><label>Close open trades when hit</label><input type="checkbox" id="closeOnCircuitBreak" checked></div>
  </fieldset>

  <button type="button" id="advancedToggle">▸ Show advanced settings</button>
  <div id="advancedSection">

  <fieldset>
    <legend>Position sizing (recommended settings)</legend>
    <small class="hint">This decides how big each trade is. "Risk %" is the safe way — it automatically sizes every trade so a full stop-loss only ever costs the % you choose, no matter which instrument you're trading.</small>
    <div class="row"><label>Sizing mode</label>
      <select id="sizingMode">
        <option value="fixed">Fixed lots (see below)</option>
        <option value="risk" selected>Risk % of account equity (recommended)</option>
      </select>
    </div>
    <div class="row"><label>Base risk (% of equity)</label><input type="number" id="baseRiskPct" value="1.0" min="0.1" max="10" step="0.1"></div>
    <small class="hint">How much of your account you're willing to lose if a single trade's stop-loss gets hit. 0.5–1% is a conservative, sensible range — especially on smaller accounts.</small>
    <div class="row"><label>Hard max lot size (safety cap)</label><input type="number" id="hardMaxLot" value="2.0" min="0.01" step="0.01"></div>
    <small class="hint">An absolute ceiling — the bot will never open a trade bigger than this, no matter what the math above calculates.</small>
  </fieldset>

  <fieldset>
    <legend>Safety switch</legend>
    <div class="row"><label>Confirm every order</label><input type="checkbox" id="confirmOrders"></div>
    <small class="hint">If ticked, you'll get a pop-up to approve every trade before it fires. Good while learning; turn off once you trust it.</small>
  </fieldset>

  <fieldset>
    <legend>Market (advanced override)</legend>
    <small class="hint">Your Mode selection sets these automatically. Only change these if you want to override the Mode's defaults.</small>
    <div class="row"><label>Trading timeframe</label>
      <select id="timeframe">
        <option value="60">M1</option>
        <option value="300">M5</option>
        <option value="900" selected>M15</option>
        <option value="1800">M30</option>
        <option value="3600">H1</option>
        <option value="14400">H4</option>
      </select>
    </div>
    <div class="row"><label>Pivot period</label>
      <select id="pivotTf">
        <option value="86400" selected>Daily (for M1–M30 charts)</option>
        <option value="604800">Weekly (for H1–H4 charts)</option>
        <option value="2592000">Monthly (for D1 charts)</option>
      </select>
    </div>
  </fieldset>

  <fieldset>
    <legend>Trend / signal (Overkill Scalper logic)</legend>
    <small class="hint">These are the same numbers the Overkill Scalper indicator uses. The defaults ARE the strategy — only change these if you understand what you're adjusting.</small>
    <div class="row"><label>Fast EMA</label><input type="number" id="fastLen" value="5" min="2" max="50"></div>
    <div class="row"><label>Mid EMA (trend line)</label><input type="number" id="midLen" value="13" min="5" max="100"></div>
    <div class="row"><label>Slow EMA</label><input type="number" id="slowLen" value="34" min="10" max="300"></div>
    <div class="row"><label>Min candle / ATR</label><input type="number" id="atrMult" value="0.2" min="0.05" max="3" step="0.05"></div>
  </fieldset>

  <fieldset>
    <legend>Additional risk % (add-on / retest trades)</legend>
    <small class="hint">These control the smaller follow-up trades — leave them lower than your Base risk above.</small>
    <div class="row"><label>Add-on risk (% of equity)</label><input type="number" id="addOnRiskPct" value="0.5" min="0.1" max="10" step="0.1"></div>
    <div class="row"><label>Retest risk (% of equity)</label><input type="number" id="retestRiskPct" value="0.5" min="0.1" max="10" step="0.1"></div>
    <div class="row"><label>Level-retest risk (% of equity)</label><input type="number" id="levelRetestRiskPct" value="0.5" min="0.1" max="10" step="0.1"></div>
  </fieldset>

  <fieldset>
    <legend>Position sizing (fixed-lots mode only)</legend>
    <div class="row"><label>Base size (lots)</label><input type="number" id="baseLots" value="0.10" min="0.01" step="0.01"></div>
    <div class="row"><label>Enable add-ons</label><input type="checkbox" id="enableAddOns" checked></div>
    <div class="row"><label>Add-on size (lots)</label><input type="number" id="addOnLots" value="0.05" min="0.01" step="0.01"></div>
    <div class="row"><label>Max add-ons/direction</label><input type="number" id="maxAddOns" value="4" min="0" max="10"></div>
    <div class="row"><label>Enable retest entries</label><input type="checkbox" id="enableRetest" checked></div>
    <div class="row"><label>Retest size (lots)</label><input type="number" id="retestLots" value="0.05" min="0.01" step="0.01"></div>
    <div class="row"><label>Cooldown (bars)</label><input type="number" id="cooldownBars" value="1" min="0" max="50"></div>
  </fieldset>

  <fieldset>
    <legend>Trade frequency</legend>
    <small class="hint">"Require pivot-side agreement" is a filter that reduces trade frequency (off by default, matching the raw indicator). "Max entries per day" caps how many trades it takes before pausing, even if more signals appear.</small>
    <div class="row"><label>Require pivot-side agreement</label><input type="checkbox" id="requirePivotSide"></div>
    <div class="row"><label>Max entries per day (0=unlimited)</label><input type="number" id="maxEntriesPerDay" value="0" min="0" max="100"></div>
  </fieldset>

  <fieldset>
    <legend>News blackout</legend>
    <small class="hint">List known high-impact event times (24hr, your browser's local time), one per line — e.g. NFP/CPI at 08:30, FOMC at 14:00. When ON, the bot pauses NEW entries within the window around each time, every day it recurs, but keeps managing/trailing any trade already open.</small>
    <div class="row"><label>Enable news blackout</label>
      <select id="newsBlackoutOn">
        <option value="off" selected>OFF</option>
        <option value="on">ON</option>
      </select>
    </div>
    <div class="row"><label>Event times (HH:MM)</label></div>
    <div class="row"><textarea id="newsBlackoutTimes" rows="3" style="flex:1 1 100%; min-width:70px; background:#0c1224; color:#eaf2ff; border:1px solid rgba(111,227,255,0.25); border-radius:8px; padding:9px 10px; font-size:13px;" placeholder="08:30&#10;14:00"></textarea></div>
    <div class="row"><label>Blackout window (± minutes)</label><input type="number" id="newsBlackoutMinutes" value="15" min="1" max="120"></div>
  </fieldset>

  <fieldset>
    <legend>Reversal Mode (instead of hedging)</legend>
    <small class="hint">We don't offer true hedging (holding opposing trades on the same instrument at once) — it doesn't actually reduce risk the way it feels like it should, costs extra spread/swap, and doesn't even work on many broker accounts. This is the better fix: when ON, an opposite-direction signal closes your current position and flips straight into the new direction, instead of just being ignored until the old position closes on its own.</small>
    <div class="row"><label>Reversal Mode</label>
      <select id="reversalModeOn">
        <option value="off" selected>OFF (ignore opposite signals)</option>
        <option value="on">ON (flip position on opposite signal)</option>
      </select>
    </div>
    <small class="hint">Flipping a position is a bigger decision than opening a fresh one — it costs money to exit AND enter, so it demands more proof than a normal entry does. These two settings are ONLY checked for a reversal, on top of the normal signal, not instead of it.</small>
    <div class="row"><label>Reversal candle strength (× ATR)</label><input type="number" id="reversalAtrMult" value="0.5" min="0.1" step="0.1"></div>
    <small class="hint">The candle that triggers a reversal must be at least this many ATRs in range — bigger than the 0.2× normally required for a fresh entry, so a weak/marginal candle can't flip you.</small>
    <div class="row"><label>Trend must hold for (bars)</label><input type="number" id="reversalConfirmBars" value="3" min="1" max="10"></div>
    <small class="hint">The EMA stack must have been in the new order for at least this many bars in a row, not just this instant — filters out a one-bar flicker that reverses right back.</small>
    <div class="row"><label>Max add-ons eligible for reversal</label><input type="number" id="reversalMaxAddOns" value="1" min="0" max="10"></div>
    <small class="hint">If you're pyramided in deeper than this (e.g. 6 add-ons stacked), that's strong evidence the trend is real — a single opposite signal at that point is treated as a normal pullback and ignored, NOT a reason to unwind everything. Reversal only fires on a fresh or lightly-added position.</small>
  </fieldset>

  <fieldset>
    <legend>Structural levels (Smart Pivot Points logic)</legend>
    <small class="hint">Instead of a random target price, this aims each trade at a real support/resistance level (R1, S1, Fib lines) — price has an actual reason to react there.</small>
    <div class="row"><label>Use levels for TP</label><input type="checkbox" id="useLevelTP" checked></div>
    <div class="row"><label>Enable level-retest entries</label><input type="checkbox" id="enableLevelRetest" checked></div>
    <div class="row"><label>Level-retest size (lots)</label><input type="number" id="levelRetestLots" value="0.05" min="0.01" step="0.01"></div>
  </fieldset>

  <fieldset>
    <legend>Risk (initial stop-loss/take-profit — auto-scales via ATR across forex, NAS100, US30, gold, etc.)</legend>
    <small class="hint">ATR just means "how big this market's normal price wiggles are right now." These set the INITIAL stop-loss/take-profit at trade open. Trailing/breakeven behavior is controlled by the dollar-based Auto Trailing settings above, not these.</small>
    <div class="row"><label>Stop-loss (× ATR)</label><input type="number" id="slAtrMult" value="2.0" min="0.2" step="0.1"></div>
    <small class="hint">How far the safety-net stop sits from your entry. Higher = more room for normal noise, but a bigger loss if it's wrong.</small>
    <div class="row"><label>Take-profit cap (× ATR, 0=off)</label><input type="number" id="tpAtrMult" value="4" min="0" step="0.5"></div>
  </fieldset>

  </div><!-- /advancedSection -->

  <div class="row"><label>Manual test size (lots)</label><input type="number" id="testLots" value="0.01" min="0.01" step="0.01"></div>

  <div class="btnrow">
    <button id="startBtn" class="pill-btn">▶ Start Bot</button>
    <button id="stopBtn" class="pill-btn" disabled>■ Stop Bot</button>
    <button id="testBuyBtn" class="pill-btn">Test Trade — BUY</button>
    <button id="testSellBtn" class="pill-btn">Test Trade — SELL</button>
    <button id="clearLogBtn">Clear log</button>
  </div>

  <div id="log"></div>

</div>

<script>
var Framework = new FXB.Framework();
var SETTINGS_ID = "qt-sniper-auto-bot-v1";

// ---- Runtime state -------------------------------------------------
var isRunning = false;
var tradingStore = null;
var pivotStore = null;
var cfg = null;                 // snapshot of settings taken at Start
var barsSinceLastEntry = { buy: 999, sell: 999, retestBuy: 999, retestSell: 999, levelRetestBuy: 999, levelRetestSell: 999 };
var addOnsUsed = { buy: 0, sell: 0 };
var pendingOrder = false;       // guards against overlapping SendOrder calls
var entriesToday = 0;
var entriesDayKey = "";

// Real order objects report the platform's canonical instrument ID (e.g. "GBP/JPY"), which can
// differ from the raw text typed into the Instrument field (e.g. "GBPJPY"). Checking both here
// is what makes order matching work regardless of which form the account actually uses.
function isBotInstrument(orderInstrumentId) {
  if (!cfg || !orderInstrumentId) return false;
  return orderInstrumentId === cfg.instrumentId || orderInstrumentId === cfg.canonicalInstrumentId;
}

function currentDayKey() {
  var d = new Date();
  return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
}
function dailyCapOk() {
  var dk = currentDayKey();
  if (dk !== entriesDayKey) { entriesDayKey = dk; entriesToday = 0; }
  return cfg.maxEntriesPerDay === 0 || entriesToday < cfg.maxEntriesPerDay;
}

// Returns the matched "HH:MM" string if the current time falls within a news blackout window,
// or false otherwise. Recurs daily by clock time (no date needed) — list a known release time
// like 08:30 once, and it applies every day it recurs, not just today.
function isInNewsBlackout() {
  if (!cfg.newsBlackoutOn) return false;
  if (!cfg.newsBlackoutTimes) return false;
  var lines = cfg.newsBlackoutTimes.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  if (lines.length === 0) return false;

  var now = new Date();
  var nowMinutes = now.getHours() * 60 + now.getMinutes();
  var windowMin = cfg.newsBlackoutMinutes || 15;

  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    var eventMinutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    var diff = Math.abs(nowMinutes - eventMinutes);
    diff = Math.min(diff, 1440 - diff); // handle wrap around midnight
    if (diff <= windowMin) return lines[i];
  }
  return false;
}

// ---- Daily circuit breaker — for unattended running ----------------
// Checked both on every closed bar AND on every real-time account balance/equity update
// (whichever comes first), so a limit doesn't sit breached for up to a whole bar period
// before the bot notices — the whole point of this is reacting promptly while nobody's
// watching the screen.
var dailyBreakerDayKey = "";
var circuitBreakerTripped = false;

// ---- Force-close queue — used by the circuit breaker so a failed close attempt is retried
// until it genuinely succeeds, instead of being logged once and abandoned. This matters most
// for exactly the "I'm not at my computer" scenario the circuit breaker exists for.
//
// IMPORTANT: this is retried both on bar close AND on every real-time account update, and the
// latter can fire many times per second. Without the backoff below, a persistently-rejected
// close (e.g. broker says "not enough working quantity") would retry on nearly every single
// tick — flooding SendOrder, and if "Confirm every order" is on, popping a confirmation dialog
// dozens of times a second. The cooldown below is what stops that.
var forceCloseQueue = {}; // orderId -> { attempts, nextRetryAt }
var FORCE_CLOSE_MIN_INTERVAL_MS = 4000; // never retry the same order more than once per ~4s

function attemptForceCloses() {
  var now = Date.now();
  var ids = Object.keys(forceCloseQueue);
  ids.forEach(function (orderId) {
    var entry = forceCloseQueue[orderId];
    if (entry.nextRetryAt && now < entry.nextRetryAt) return; // still cooling down from the last attempt

    var order = Framework.Orders.get(orderId);
    if (!order || order.closeTime) {
      // Already closed (by this attempt succeeding earlier, hitting its own SL/TP, or manually) — done.
      delete forceCloseQueue[orderId];
      return;
    }

    entry.attempts++;
    entry.nextRetryAt = now + Math.min(FORCE_CLOSE_MIN_INTERVAL_MS * entry.attempts, 30000); // back off further each failure, capped at 30s

    Framework.SendOrder({
      instrumentId: order.instrumentId,
      orderId: orderId,
      tradingAction: FXB.OrderTypes.CLOSEPOSITION
    }, function (MsgResult) {
      if (MsgResult && MsgResult.result && MsgResult.result.isOkay) {
        log("Closed order " + orderId + " (circuit breaker)", "log-info");
        delete forceCloseQueue[orderId];
      } else {
        var errText = "unknown error";
        try { errText = Framework.Translation.TranslateError(MsgResult.result); } catch (e) {}
        var urgency = entry.attempts >= 3 ? "🔴 STILL OPEN after " + entry.attempts + " attempts" : "retrying";
        log("Could not close order " + orderId + " (" + urgency + "): " + errText, "log-warn");
        if (entry.attempts === 3) beep("sell"); // extra alert if it's genuinely stuck, not just a one-off blip
      }
    });
  });
}


// Computes THIS bot instance's own profit/loss for today — today's closed trades (from
// tradeLog) plus whatever's currently floating on trades it still has open. Deliberately does
// NOT use whole-account equity: if you run multiple pairs in separate windows, each one's daily
// circuit breaker needs to react to what THAT pair's trades did, not to profit or loss coming
// from a completely different instance or a manual trade elsewhere on the same account.
function computeBotDailyPL() {
  var todayKey = currentDayKey();
  var pl = 0;
  tradeLog.forEach(function (t) {
    if (t.dayKey === todayKey && typeof t.profit === "number") pl += t.profit;
  });
  Object.keys(managedOrders).forEach(function (orderId) {
    var order = Framework.Orders.get(orderId);
    if (order && !order.closeTime && typeof order.profit === "number") pl += order.profit;
  });
  return pl;
}

function checkDailyCircuitBreaker() {
  if (!isRunning || circuitBreakerTripped) return;
  if (!cfg || (cfg.dailyProfitTarget <= 0 && cfg.dailyMaxLoss <= 0)) return;

  var dk = currentDayKey();
  if (dk !== dailyBreakerDayKey) {
    // New day — re-arm automatically.
    dailyBreakerDayKey = dk;
    circuitBreakerTripped = false;
  }

  var dailyPL = computeBotDailyPL();

  if (cfg.dailyProfitTarget > 0 && dailyPL >= cfg.dailyProfitTarget) {
    tripCircuitBreaker("this instrument's trades reached the profit target (+$" + dailyPL.toFixed(2) + ")");
  } else if (cfg.dailyMaxLoss > 0 && dailyPL <= -cfg.dailyMaxLoss) {
    tripCircuitBreaker("this instrument's trades reached the max daily loss (-$" + Math.abs(dailyPL).toFixed(2) + ")");
  }
}

function tripCircuitBreaker(reasonText) {
  circuitBreakerTripped = true;
  isRunning = false;
  setInputsDisabled(false);
  setStatus(false, "Bot Stopped — " + reasonText);
  log("🛑 Daily circuit breaker: " + reasonText + ". No new trades will be taken today.", "log-warn");
  beep("sell"); beep("sell"); // distinct double-tone so it's noticeable even from another room

  if (cfg.closeOnCircuitBreak) {
    var ids = Object.keys(managedOrders);
    if (ids.length === 0) {
      log("No open bot trades to close.", "log-info");
    } else {
      ids.forEach(function (orderId) {
        forceCloseQueue[orderId] = { attempts: 0 };
      });
      attemptForceCloses();
    }
  }
}

// ---- Audible alert whenever a trade actually confirms ----------------
function beep(direction) {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var now = ctx.currentTime;
    var tone = function (f, s, d) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.3, now + s);
      g.gain.exponentialRampToValueAtTime(0.001, now + s + d);
      o.start(now + s); o.stop(now + s + d + 0.01);
    };
    if (direction === "buy")  { tone(528, 0, 0.15); tone(660, 0.14, 0.20); }
    if (direction === "sell") { tone(660, 0, 0.15); tone(528, 0.14, 0.20); }
  } catch (e) {}
}

// ---- Logging ---------------------------------------------------------
function log(msg, cls) {
  var el = document.getElementById("log");
  var line = document.createElement("div");
  if (cls) line.className = cls;
  var t = new Date();
  var ts = ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2) + ":" + ("0" + t.getSeconds()).slice(-2);
  line.textContent = "[" + ts + "] " + msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ---- UI helpers --------------------------------------------------
function setInputsDisabled(disabled) {
  var ids = ["instrumentId","modeSelect","accountSizeSelect","timeframe","pivotTf","fastLen","midLen","slowLen","atrMult",
    "baseLots","enableAddOns","addOnLots","maxAddOns","enableRetest","retestLots",
    "cooldownBars","requirePivotSide","maxEntriesPerDay","newsBlackoutOn","newsBlackoutTimes","newsBlackoutMinutes","reversalModeOn","reversalAtrMult","reversalConfirmBars","reversalMaxAddOns","dailyProfitTarget","dailyMaxLoss","closeOnCircuitBreak",
    "useLevelTP","enableLevelRetest","levelRetestLots",
    "sizingMode","baseRiskPct","addOnRiskPct","retestRiskPct","levelRetestRiskPct","hardMaxLot",
    "addStopLoss","addTakeProfit","autoTrailingOn","trailAfterProfitDollars","profitLockDistanceDollars","breakevenBufferDollars",
    "slAtrMult","tpAtrMult","confirmOrders"];
  ids.forEach(function(id) { document.getElementById(id).disabled = disabled; });
}

function setStatus(running, stoppedLabel) {
  var el = document.getElementById("status");
  el.textContent = running ? "● Bot Running — " + cfg.instrumentId : ("● " + (stoppedLabel || "Bot Stopped"));
  el.className = running ? "running" : "stopped";
  document.getElementById("startBtn").disabled = running;
  document.getElementById("stopBtn").disabled = !running;
}

function readConfig() {
  return {
    instrumentId: document.getElementById("instrumentId").value.trim(),
    mode: document.getElementById("modeSelect").value,
    accountSize: document.getElementById("accountSizeSelect").value,
    timeframe: parseInt(document.getElementById("timeframe").value),
    pivotTf: parseInt(document.getElementById("pivotTf").value),
    fastLen: parseInt(document.getElementById("fastLen").value) || 5,
    midLen: parseInt(document.getElementById("midLen").value) || 13,
    slowLen: parseInt(document.getElementById("slowLen").value) || 34,
    atrMult: parseFloat(document.getElementById("atrMult").value) || 0.2,
    baseLots: parseFloat(document.getElementById("baseLots").value) || 0.10,
    sizingMode: document.getElementById("sizingMode").value,
    baseRiskPct: parseFloat(document.getElementById("baseRiskPct").value) || 1.0,
    addOnRiskPct: parseFloat(document.getElementById("addOnRiskPct").value) || 0.5,
    retestRiskPct: parseFloat(document.getElementById("retestRiskPct").value) || 0.5,
    levelRetestRiskPct: parseFloat(document.getElementById("levelRetestRiskPct").value) || 0.5,
    hardMaxLot: parseFloat(document.getElementById("hardMaxLot").value) || 2.0,
    enableAddOns: document.getElementById("enableAddOns").checked,
    addOnLots: parseFloat(document.getElementById("addOnLots").value) || 0.05,
    maxAddOns: parseInt(document.getElementById("maxAddOns").value) || 0,
    enableRetest: document.getElementById("enableRetest").checked,
    retestLots: parseFloat(document.getElementById("retestLots").value) || 0.05,
    cooldownBars: parseInt(document.getElementById("cooldownBars").value) || 0,
    requirePivotSide: document.getElementById("requirePivotSide").checked,
    newsBlackoutTimes: document.getElementById("newsBlackoutTimes").value,
    newsBlackoutOn: document.getElementById("newsBlackoutOn").value === "on",
    newsBlackoutMinutes: parseInt(document.getElementById("newsBlackoutMinutes").value) || 15,
    reversalModeOn: document.getElementById("reversalModeOn").value === "on",
    reversalAtrMult: parseFloat(document.getElementById("reversalAtrMult").value) || 0.5,
    reversalConfirmBars: parseInt(document.getElementById("reversalConfirmBars").value) || 3,
    reversalMaxAddOns: (function(){ var v = parseInt(document.getElementById("reversalMaxAddOns").value); return isNaN(v) ? 1 : v; })(),
    maxEntriesPerDay: parseInt(document.getElementById("maxEntriesPerDay").value) || 0,
    dailyProfitTarget: parseFloat(document.getElementById("dailyProfitTarget").value) || 0,
    dailyMaxLoss: parseFloat(document.getElementById("dailyMaxLoss").value) || 0,
    closeOnCircuitBreak: document.getElementById("closeOnCircuitBreak").checked,
    useLevelTP: document.getElementById("useLevelTP").checked,
    enableLevelRetest: document.getElementById("enableLevelRetest").checked,
    levelRetestLots: parseFloat(document.getElementById("levelRetestLots").value) || 0.05,
    slAtrMult: parseFloat(document.getElementById("slAtrMult").value) || 2.0,
    tpAtrMult: parseFloat(document.getElementById("tpAtrMult").value) || 0,
    addStopLoss: document.getElementById("addStopLoss").value === "on",
    addTakeProfit: document.getElementById("addTakeProfit").value === "on",
    autoTrailingOn: document.getElementById("autoTrailingOn").value === "on",
    trailAfterProfitDollars: parseFloat(document.getElementById("trailAfterProfitDollars").value) || 0,
    profitLockDistanceDollars: parseFloat(document.getElementById("profitLockDistanceDollars").value) || 0,
    breakevenBufferDollars: parseFloat(document.getElementById("breakevenBufferDollars").value) || 0,
    confirmOrders: document.getElementById("confirmOrders").checked
  };
}

function applyConfigToUI(s) {
  if (!s) return;
  var map = ["instrumentId","timeframe","pivotTf","fastLen","midLen","slowLen","atrMult",
    "baseLots","addOnLots","maxAddOns","retestLots","cooldownBars","levelRetestLots","maxEntriesPerDay",
    "newsBlackoutTimes","newsBlackoutMinutes","reversalAtrMult","reversalConfirmBars","reversalMaxAddOns",
    "baseRiskPct","addOnRiskPct","retestRiskPct","levelRetestRiskPct","hardMaxLot","dailyProfitTarget","dailyMaxLoss",
    "trailAfterProfitDollars","profitLockDistanceDollars","breakevenBufferDollars","slAtrMult","tpAtrMult"];
  map.forEach(function(k) { if (s[k] !== undefined) document.getElementById(k).value = s[k]; });
  if (s.mode !== undefined) document.getElementById("modeSelect").value = s.mode;
  if (s.accountSize !== undefined && s.accountSize) document.getElementById("accountSizeSelect").value = s.accountSize;
  if (s.closeOnCircuitBreak !== undefined) document.getElementById("closeOnCircuitBreak").checked = s.closeOnCircuitBreak;
  if (s.sizingMode !== undefined) document.getElementById("sizingMode").value = s.sizingMode;
  if (s.newsBlackoutOn !== undefined) document.getElementById("newsBlackoutOn").value = s.newsBlackoutOn ? "on" : "off";
  if (s.reversalModeOn !== undefined) document.getElementById("reversalModeOn").value = s.reversalModeOn ? "on" : "off";
  if (s.enableAddOns !== undefined) document.getElementById("enableAddOns").checked = s.enableAddOns;
  if (s.enableRetest !== undefined) document.getElementById("enableRetest").checked = s.enableRetest;
  if (s.requirePivotSide !== undefined) document.getElementById("requirePivotSide").checked = s.requirePivotSide;
  if (s.useLevelTP !== undefined) document.getElementById("useLevelTP").checked = s.useLevelTP;
  if (s.enableLevelRetest !== undefined) document.getElementById("enableLevelRetest").checked = s.enableLevelRetest;
  if (s.confirmOrders !== undefined) document.getElementById("confirmOrders").checked = s.confirmOrders;
  if (s.addStopLoss !== undefined) document.getElementById("addStopLoss").value = s.addStopLoss ? "on" : "off";
  if (s.addTakeProfit !== undefined) document.getElementById("addTakeProfit").value = s.addTakeProfit ? "on" : "off";
  if (s.autoTrailingOn !== undefined) document.getElementById("autoTrailingOn").value = s.autoTrailingOn ? "on" : "off";
}

// ---- Risk-based position sizing ---------------------------------------
// Converts "risk X% of equity" into an actual lot size, using the instrument's real
// tickValue (cash value of a tickSize move per 1.0 lot, already in account currency) —
// not an approximation. Falls back to the fixed-lot value on anything unexpected
// (missing instrument data, zero ATR, etc.) so a data gap never blocks a trade or,
// worse, sizes one wildly wrong.
function computeLotSize(fixedLots, riskPct, atrAtEntry) {
  if (cfg.sizingMode !== "risk") return fixedLots;
  if (!cfg.addStopLoss) {
    log("Risk % sizing needs a stop-loss to size against — Add Stop-Loss is OFF, so using fixed lots (" + fixedLots + ") instead for this trade.", "log-warn");
    return fixedLots;
  }
  if (!atrAtEntry || cfg.slAtrMult <= 0) return fixedLots;

  var instr = Framework.Instruments.get(cfg.instrumentId);
  if (!instr || !instr.tickSize || !instr.tickValue) return fixedLots;

  var slDistancePrice = atrAtEntry * cfg.slAtrMult;
  var slDistanceTicks = slDistancePrice / instr.tickSize;
  var lossPerLot = slDistanceTicks * instr.tickValue; // $ lost per 1.0 lot if SL is hit
  if (!lossPerLot || lossPerLot <= 0) return fixedLots;

  var equity = Framework.Account.equity;
  if (!equity || equity <= 0) return fixedLots;

  var riskAmount = equity * (riskPct / 100);
  var rawLots = riskAmount / lossPerLot;

  var step = instr.lotStep || 0.01;
  var lots = Math.floor(rawLots / step) * step;
  var minLot = instr.minLot || step;
  // FIXED: previously fell back to `lots` itself when the broker didn't report a maxLot,
  // which silently disabled the cap entirely (min(lots, lots) is a no-op). Now falls back
  // to Infinity so it never restricts on its own, and the hard cap below always applies
  // as an independent ceiling regardless of what the broker reports.
  var brokerMaxLot = instr.maxLot || Infinity;
  lots = Math.max(minLot, Math.min(brokerMaxLot, lots));

  // Hard safety cap — always enforced, independent of the risk formula and independent of
  // whatever the broker reports as its own max. This is what stops a tight ATR-based stop
  // (e.g. during a quiet market) from scaling the calculated lot size up to something
  // dangerously large just to hit the target dollar risk.
  if (cfg.hardMaxLot > 0 && lots > cfg.hardMaxLot) {
    log("Risk-sized lot (" + lots.toFixed(2) + ") exceeded the hard max lot cap (" + cfg.hardMaxLot +
        ") — capped. This usually means the stop distance was unusually tight (low volatility) for the risk % requested.", "log-warn");
    lots = cfg.hardMaxLot;
  }

  lots = Math.round(lots * 100) / 100;

  // Small-account safety check: if the broker's minimum lot is bigger than what the intended
  // risk % actually calls for, rounding up to it can silently risk far more than requested —
  // this matters most on small accounts (e.g. $150-1000), where the minimum-lot floor can be
  // several times the intended dollar risk. Refuse rather than force an oversized trade.
  var actualRisk = lots * lossPerLot;
  if (actualRisk > riskAmount * 2) {
    log("Skipped trade — broker's minimum lot size (" + minLot + ") on " + cfg.instrumentId +
        " would risk $" + actualRisk.toFixed(2) + ", more than double the intended " + riskPct +
        "% ($" + riskAmount.toFixed(2) + "). Account may be too small for this instrument at this risk setting.", "log-warn");
    return 0;
  }

  return lots;
}

// ---- Mode presets — Scalper / Swing / Hybrid set the underlying advanced fields at once ----
var MODE_PRESETS = {
  scalper: { timeframe: 300,  pivotTf: 86400,  slAtrMult: 1.5, tpAtrMult: 3, cooldownBars: 1, maxAddOns: 4, requirePivotSide: false, atrMult: 0.2 },
  swing:   { timeframe: 3600, pivotTf: 604800, slAtrMult: 2.5, tpAtrMult: 6, cooldownBars: 1, maxAddOns: 3, requirePivotSide: false, atrMult: 0.2 },
  hybrid:  { timeframe: 1800, pivotTf: 86400,  slAtrMult: 2.0, tpAtrMult: 4, cooldownBars: 1, maxAddOns: 4, requirePivotSide: false, atrMult: 0.2 }
};
function applyModePreset(mode) {
  var p = MODE_PRESETS[mode] || MODE_PRESETS.hybrid;
  document.getElementById("timeframe").value = p.timeframe;
  document.getElementById("pivotTf").value = p.pivotTf;
  document.getElementById("slAtrMult").value = p.slAtrMult;
  document.getElementById("tpAtrMult").value = p.tpAtrMult;
  document.getElementById("cooldownBars").value = p.cooldownBars;
  document.getElementById("maxAddOns").value = p.maxAddOns;
  document.getElementById("requirePivotSide").checked = p.requirePivotSide;
  document.getElementById("atrMult").value = p.atrMult;
}

// ---- Account size presets — set dollar-denominated sizing/limits/trailing all at once. ----
// Unlike the ATR-based settings (which self-scale to whatever's being traded), these are raw
// dollar amounts and don't self-scale to account size on their own — this is what fixes that.
// These are sensible starting points for the middle of each band, not exact per-account math —
// a $60 account and a $480 account are both "Small" but aren't identical; nudge from here.
var ACCOUNT_PRESETS = {
  small:  { baseRiskPct: 0.5,  addOnRiskPct: 0.25, retestRiskPct: 0.25, levelRetestRiskPct: 0.25,
            hardMaxLot: 0.10, dailyMaxLoss: 15,  dailyProfitTarget: 20,  trailAfterProfitDollars: 8,   profitLockDistanceDollars: 3,  breakevenBufferDollars: 1, baseLots: 0.01 },
  medium: { baseRiskPct: 0.75, addOnRiskPct: 0.4,  retestRiskPct: 0.4,  levelRetestRiskPct: 0.4,
            hardMaxLot: 0.50, dailyMaxLoss: 75,  dailyProfitTarget: 100, trailAfterProfitDollars: 30,  profitLockDistanceDollars: 12, breakevenBufferDollars: 2, baseLots: 0.05 },
  large:  { baseRiskPct: 1.0,  addOnRiskPct: 0.5,  retestRiskPct: 0.5,  levelRetestRiskPct: 0.5,
            hardMaxLot: 2.00, dailyMaxLoss: 300, dailyProfitTarget: 400, trailAfterProfitDollars: 150, profitLockDistanceDollars: 60, breakevenBufferDollars: 5, baseLots: 0.10 }
};
function applyAccountSizePreset(size) {
  var p = ACCOUNT_PRESETS[size];
  if (!p) return; // no size chosen yet — leave fields untouched rather than guess
  document.getElementById("baseRiskPct").value = p.baseRiskPct;
  document.getElementById("addOnRiskPct").value = p.addOnRiskPct;
  document.getElementById("retestRiskPct").value = p.retestRiskPct;
  document.getElementById("levelRetestRiskPct").value = p.levelRetestRiskPct;
  document.getElementById("hardMaxLot").value = p.hardMaxLot;
  document.getElementById("dailyMaxLoss").value = p.dailyMaxLoss;
  document.getElementById("dailyProfitTarget").value = p.dailyProfitTarget;
  document.getElementById("trailAfterProfitDollars").value = p.trailAfterProfitDollars;
  document.getElementById("profitLockDistanceDollars").value = p.profitLockDistanceDollars;
  document.getElementById("breakevenBufferDollars").value = p.breakevenBufferDollars;
  document.getElementById("baseLots").value = p.baseLots;
}

// ---- Order placement -----------------------------------------------
var pendingManagement = []; // FIFO queue: entries awaiting a matching OnOrderOpen to become "managed"
var managedOrders = {};     // orderId -> { direction, atrAtEntry, entryPrice, breakevenApplied }
var BOT_TAG = "QTSniperAutoBot";

// ---- Reversal Mode helper — closes every open trade on the opposite side of this instrument,
// then calls back once all closes have resolved (successfully or not). Used instead of true
// hedging: rather than holding both directions at once, this flattens the old direction first,
// then the caller opens fresh in the new direction.
function closeAllOpposite(oppositeDirection, callback) {
  var toClose = [];
  Framework.Orders.forEach(function (orderId, order) {
    if (!order || !isBotInstrument(order.instrumentId) || order.closeTime) return;
    if (order.orderType !== FXB.OrderTypes.BUY && order.orderType !== FXB.OrderTypes.SELL) return;
    var dir = order.orderType === FXB.OrderTypes.BUY ? "buy" : "sell";
    if (dir === oppositeDirection) toClose.push(orderId);
  });

  if (toClose.length === 0) { callback(); return; }

  var remaining = toClose.length;
  toClose.forEach(function (orderId) {
    Framework.SendOrder({ instrumentId: cfg.instrumentId, orderId: orderId, tradingAction: FXB.OrderTypes.CLOSEPOSITION }, function (MsgResult) {
      remaining--;
      if (MsgResult && MsgResult.result && MsgResult.result.isOkay) {
        log("Closed " + oppositeDirection + " order " + orderId + " to reverse position (Reversal Mode)", "log-info");
        delete managedOrders[orderId];
      } else {
        var errText = "unknown error";
        try { errText = Framework.Translation.TranslateError(MsgResult.result); } catch (e) {}
        log("Couldn't close order " + orderId + " for reversal: " + errText, "log-warn");
      }
      if (remaining === 0) callback();
    });
  });
}

function placeOrder(direction, lots, reason, atrAtEntry, tpPriceOverride) {
  if (!lots || lots <= 0) return; // computeLotSize already logged why, if this was a risk-sizing refusal
  if (pendingOrder) { log("Skipped " + direction + " (" + reason + ") — previous order still in flight", "log-warn"); return; }
  if (!dailyCapOk()) { log("Skipped " + direction + " (" + reason + ") — daily entry cap (" + cfg.maxEntriesPerDay + ") reached", "log-warn"); return; }
  var blackoutMatch = isInNewsBlackout();
  if (blackoutMatch) { log("Skipped " + direction + " (" + reason + ") — news blackout window around " + blackoutMatch, "log-warn"); return; }
  entriesToday++;

  var req = {
    instrumentId: cfg.instrumentId,
    tradingAction: direction === "buy" ? FXB.OrderTypes.BUY : FXB.OrderTypes.SELL,
    volume: { lots: lots },
    comment: BOT_TAG
  };

  // Stop-loss: only set when "Add Stop-Loss" is ON. This used to be unconditional/mandatory —
  // now it's an explicit, deliberate choice, with a clear warning in the UI about what OFF means.
  if (cfg.addStopLoss && atrAtEntry && cfg.pipSize) {
    if (cfg.slAtrMult > 0) {
      var slPips = Math.max(1, Math.round((atrAtEntry * cfg.slAtrMult) / cfg.pipSize));
      req.sl = { pips: slPips };
    }
  }

  // Take-profit: only set when "Add Take-Profit" is ON. When ON, prefer a real structural level
  // (R1/S1/Fib) when available, since that targets an actual place price has reason to react —
  // falls back to the ATR cap otherwise. When OFF, no fixed target is set — the trade exits only
  // via Auto Trailing (if on) or the stop-loss (if on).
  if (cfg.addTakeProfit) {
    if (tpPriceOverride) {
      req.tp = tpPriceOverride; // absolute price
    } else if (atrAtEntry && cfg.pipSize && cfg.tpAtrMult > 0) {
      var tpPips = Math.round((atrAtEntry * cfg.tpAtrMult) / cfg.pipSize);
      req.tp = { pips: tpPips };
    }
  }

  pendingOrder = true;
  var settings = cfg.confirmOrders ? { confirm: true } : {};

  var slTxt = req.sl ? " | SL " + req.sl.pips + "p" : (!cfg.addStopLoss ? " | NO STOP-LOSS" : "");
  var tpTxt = "";
  if (typeof req.tp === "number") tpTxt = " | TP " + req.tp.toFixed(5) + " (structural level)";
  else if (req.tp && req.tp.pips) tpTxt = " | TP " + req.tp.pips + "p";
  else if (!cfg.addTakeProfit) tpTxt = " | no fixed TP";

  log((direction === "buy" ? "BUY " : "SELL ") + lots + " lots " + cfg.instrumentId + " — " + reason + slTxt + tpTxt,
      direction === "buy" ? "log-buy" : "log-sell");

  pendingManagement.push({ direction: direction, atrAtEntry: atrAtEntry || 0, lots: lots });

  Framework.SendOrder(req, function (MsgResult) {
    pendingOrder = false;
    if (MsgResult && MsgResult.result && MsgResult.result.isOkay) {
      log("Order confirmed OK", "log-info");
      beep(direction);
    } else {
      var errText = "unknown error";
      try { errText = Framework.Translation.TranslateError(MsgResult.result); } catch (e) {}
      log("Order failed / cancelled: " + errText, "log-warn");
      // Remove the queued management entry — the order never actually opened
      var idx = pendingManagement.findIndex(function(p) { return p.direction === direction; });
      if (idx !== -1) pendingManagement.splice(idx, 1);
    }
  }, settings);
}

// Called whenever a new order/trade opens on the account, for this instrument. Two paths:
// 1) The bot placed it itself (via placeOrder) — there's a queued pendingManagement entry
//    waiting to be claimed, with the exact lots/direction/ATR the bot used.
// 2) Nothing is queued — this is a manual trade placed while the bot is running. Rather than
//    ignore it (which is what used to happen — a manual trade placed after Start was completely
//    invisible to the bot, only trades placed BEFORE Start ever got picked up), adopt it the
//    same way a trade re-adopted at Start would be: track it, and if it has no SL/TP, add one
//    on the next bar close via applyMissingInitialRisk().
Framework.OnOrderOpen = function (newOrder) {
  if (!newOrder || !isBotInstrument(newOrder.instrumentId)) return;
  if (newOrder.orderType !== FXB.OrderTypes.BUY && newOrder.orderType !== FXB.OrderTypes.SELL) return; // ignore pending orders
  if (managedOrders[newOrder.orderId]) return; // already tracked somehow — don't double-adopt

  if (pendingManagement.length > 0) {
    var claim = pendingManagement.shift();

    // Convert this specific trade's lot size into "$ per unit of price movement" — this is what
    // lets Auto Trailing's dollar-denominated thresholds (Trail After Profit / Profit Lock
    // Distance) translate into an actual price-based stop level, using the same tickSize/tickValue
    // fields already relied on elsewhere for risk-based sizing. Stored lots too, so manageOpenTrades
    // can retry this conversion later if instrument data wasn't ready at the exact moment of claim.
    var instr = Framework.Instruments.get(cfg.instrumentId);
    var dollarPerPriceUnit = (instr && instr.tickSize && instr.tickValue)
      ? (claim.lots * instr.tickValue / instr.tickSize) : null;

    managedOrders[newOrder.orderId] = {
      direction: claim.direction,
      atrAtEntry: claim.atrAtEntry,
      entryPrice: newOrder.openPrice,
      breakevenApplied: false,
      lots: claim.lots,
      dollarPerPriceUnit: dollarPerPriceUnit
    };

    if (cfg.autoTrailingOn && !dollarPerPriceUnit) {
      log("Order " + newOrder.orderId + " — couldn't read instrument tick data yet, Auto Trailing will retry on the next bar close.", "log-warn");
    }
    log("Now managing order " + newOrder.orderId + " (Auto Trailing " + (cfg.autoTrailingOn ? "ON" : "OFF") + ")", "log-info");
  } else if (isRunning) {
    managedOrders[newOrder.orderId] = {
      direction: newOrder.orderType === FXB.OrderTypes.BUY ? "buy" : "sell",
      atrAtEntry: 0,
      entryPrice: newOrder.openPrice,
      breakevenApplied: false,
      lots: null,
      dollarPerPriceUnit: null,
      needsInitialRisk: true // adds a missing SL/TP on the next bar close, same as a trade re-adopted at Start
    };
    log("Detected a manual trade on " + cfg.instrumentId + " (order " + newOrder.orderId +
        ") — adopting it for management. Any missing SL/TP will be added on the next bar close, " +
        "then breakeven/trailing begins.", "log-buy");
  }
};

// ---- Performance tracking — session-based (since last Start), not lifetime account history.
// Only records trades this widget actually managed (tracked via managedOrders), not every trade
// on the account, so a manual trade the bot never touched doesn't skew the numbers.
var tradeLog = []; // { time, instrument, direction, lots, profit }

Framework.OnOrderClose = function (closedOrder) {
  if (closedOrder && managedOrders[closedOrder.orderId]) {
    var m = managedOrders[closedOrder.orderId];
    tradeLog.push({
      time: new Date().toLocaleString(),
      dayKey: currentDayKey(),
      instrument: closedOrder.instrumentId || (cfg && cfg.instrumentId) || "",
      direction: m.direction,
      lots: (typeof closedOrder.volume === "number" && m.lots) ? m.lots : "",
      profit: (typeof closedOrder.profit === "number") ? closedOrder.profit : null
    });
    refreshStatsDisplay();
    delete managedOrders[closedOrder.orderId];
    log("Order " + closedOrder.orderId + " closed — stopped managing it", "log-info");
  }
};

function computeStats() {
  var total = tradeLog.length;
  var wins = 0, losses = 0, breakeven = 0, netProfit = 0, grossWin = 0, grossLoss = 0, biggestWin = 0, biggestLoss = 0;
  tradeLog.forEach(function (t) {
    if (t.profit === null) return;
    netProfit += t.profit;
    if (t.profit > 0) { wins++; grossWin += t.profit; if (t.profit > biggestWin) biggestWin = t.profit; }
    else if (t.profit < 0) { losses++; grossLoss += t.profit; if (t.profit < biggestLoss) biggestLoss = t.profit; }
    else breakeven++;
  });
  var decided = wins + losses;
  var winRate = decided > 0 ? (wins / decided * 100) : null;
  return { total: total, wins: wins, losses: losses, breakeven: breakeven, netProfit: netProfit,
    grossWin: grossWin, grossLoss: grossLoss, biggestWin: biggestWin, biggestLoss: biggestLoss, winRate: winRate };
}

function refreshStatsDisplay() {
  var s = computeStats();
  document.getElementById("statTotalTrades").textContent = s.total;
  document.getElementById("statWinRate").textContent = s.winRate === null ? "—" : s.winRate.toFixed(1) + "%";
  document.getElementById("statNetProfit").textContent = (s.netProfit >= 0 ? "+" : "") + s.netProfit.toFixed(2);
  document.getElementById("statNetProfit").style.color = s.netProfit > 0 ? "#4dffcf" : (s.netProfit < 0 ? "#ff8a80" : "");
  document.getElementById("statBiggestWin").textContent = s.biggestWin > 0 ? "+" + s.biggestWin.toFixed(2) : "—";
  document.getElementById("statBiggestLoss").textContent = s.biggestLoss < 0 ? s.biggestLoss.toFixed(2) : "—";
}

function exportTradeLogCsv() {
  if (tradeLog.length === 0) { log("No closed trades to export yet.", "log-warn"); return; }
  var rows = [["Time", "Instrument", "Direction", "Lots", "Profit"]];
  tradeLog.forEach(function (t) {
    rows.push([t.time, t.instrument, t.direction, t.lots, t.profit === null ? "" : t.profit]);
  });
  var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
  var blob = new Blob([csv], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "trade-log-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log("Exported " + tradeLog.length + " trade(s) to CSV.", "log-info");
}

// Fires on every real-time balance/equity change — this is what lets the daily circuit
// breaker, missing SL/TP fill-in, AND Auto Trailing all react immediately instead of waiting
// for the next bar close. Missing-SL/TP fill-in runs regardless of Auto Trailing's own on/off
// state — an adopted trade with no protection needs a stop-loss immediately either way.
Framework.OnAccountMetrics = function () {
  checkDailyCircuitBreaker();
  if (Object.keys(forceCloseQueue).length > 0) attemptForceCloses();
  if (isRunning && cfg) {
    var rtAtrV = getCurrentProtectionAtr();
    if (rtAtrV) applyMissingInitialRisk(rtAtrV);
    if (cfg.autoTrailingOn) manageOpenTrades();
  }
};

// ---- Breakeven + ATR trailing on every managed open trade ------------
// ---- Auto Trailing (dollar-based) on every managed open trade ------------
// When Auto Trailing is OFF, trades keep exactly the SL/TP they were opened with — nothing
// here touches them at all. When ON, this converts each trade's floating profit into dollars
// (using the per-trade dollarPerPriceUnit computed at open) and compares it against your
// "Trail After Profit" / "Profit Lock Distance" dollar settings, rather than ATR multiples —
// simpler to reason about, at the cost of needing to be tuned to your account/instrument.
// ---- Add a missing initial stop-loss/take-profit to a managed trade that doesn't have one ----
// This runs for trades re-adopted at Start that were placed without SL/TP (e.g. a manual entry
// with nothing attached) — it does NOT touch trades that already have their own SL/TP, bot-placed
// or otherwise. Needs a live ATR reading, so it runs once per bar close alongside manageOpenTrades,
// not synchronously at Start (candle data isn't loaded yet at that exact moment).
function applyMissingInitialRisk(atrV) {
  if (!atrV) return;
  Object.keys(managedOrders).forEach(function (orderId) {
    var m = managedOrders[orderId];
    if (!m.needsInitialRisk) return;
    if (m.mgmtRetryAt && Date.now() < m.mgmtRetryAt) return; // cooling down from a recent failed attempt
    var order = Framework.Orders.get(orderId);
    if (!order || order.closeTime) { delete managedOrders[orderId]; return; }

    var isLong = m.direction === "buy";
    var req = { instrumentId: order.instrumentId, orderId: orderId, tradingAction: FXB.OrderTypes.CHANGE };
    var actions = [];

    if (cfg.addStopLoss && !order.sl && cfg.slAtrMult > 0) {
      var slDist = atrV * cfg.slAtrMult;
      req.sl = isLong ? (order.openPrice - slDist) : (order.openPrice + slDist);
      actions.push("SL " + req.sl.toFixed(5));
    }
    if (cfg.addTakeProfit && !order.tp && cfg.tpAtrMult > 0) {
      var tpDist = atrV * cfg.tpAtrMult;
      req.tp = isLong ? (order.openPrice + tpDist) : (order.openPrice - tpDist);
      actions.push("TP " + req.tp.toFixed(5));
    }

    if (actions.length === 0) {
      m.needsInitialRisk = false; // genuinely nothing to add — SL/TP already present, or both toggles are off
      return;
    }

    Framework.SendOrder(req, function (MsgResult) {
      if (MsgResult && MsgResult.result && MsgResult.result.isOkay) {
        log("Added missing " + actions.join(" / ") + " to order " + orderId + " (picked up with no protection)", "log-buy");
        m.needsInitialRisk = false; // only clear on confirmed success — a failure below leaves it true so it retries
      } else {
        var errText = "unknown error";
        try { errText = Framework.Translation.TranslateError(MsgResult.result); } catch (e) {}
        log("⚠️ Couldn't add SL/TP to order " + orderId + ": " + errText + " — still unprotected, retrying.", "log-warn");
        m.mgmtRetryAt = Date.now() + 4000; // cool down, then retry — do NOT give up
      }
    });
  });
}

var warnedZeroTrailAfter = false;
var warnedZeroLockDistance = false;

function manageOpenTrades(currentAtr) {
  if (!cfg.autoTrailingOn) return;
  if (!cfg.trailAfterProfitDollars || cfg.trailAfterProfitDollars <= 0) {
    if (!warnedZeroTrailAfter) {
      log("Auto Trailing is ON but 'Trail After Profit' is $0 — set it above 0 or trailing will never trigger.", "log-warn");
      warnedZeroTrailAfter = true;
    }
    return;
  }
  if (!cfg.profitLockDistanceDollars || cfg.profitLockDistanceDollars <= 0) {
    if (!warnedZeroLockDistance) {
      log("⚠️ Auto Trailing is ON but 'Profit Lock Distance' is $0/blank — trades will move to breakeven but can never actually trail. Set it above 0.", "log-warn");
      warnedZeroLockDistance = true;
    }
  }

  Object.keys(managedOrders).forEach(function (orderId) {
    var m = managedOrders[orderId];
    var order = Framework.Orders.get(orderId);
    if (!order || order.closeTime) { delete managedOrders[orderId]; return; }

    // If a SL update for this specific order failed recently, don't retry it on every single
    // real-time tick — cool down for a few seconds first. Without this, a persistently-rejected
    // update (e.g. broker says "not enough working quantity") could fire dozens of times a
    // second once trailing started reacting in real time, flooding SendOrder and, if "Confirm
    // every order" is on, popping a confirmation dialog just as fast.
    if (m.mgmtRetryAt && Date.now() < m.mgmtRetryAt) return;

    var isLong = m.direction === "buy";
    var price = order.closePrice; // current exit price for an open trade
    var profitDist = isLong ? (price - m.entryPrice) : (m.entryPrice - price);

    // Prefer the broker's own authoritative profit figure over a manually-derived conversion —
    // this is exactly the number you'd see in your own P/L display, so it can't drift from
    // reality. It also lets us derive/refresh the $-per-price ratio directly (profit ÷ distance),
    // which works even for a trade re-adopted after a reload where we never captured its lot size.
    var profitDollars;
    if (typeof order.profit === "number") {
      profitDollars = order.profit;
      if (profitDist !== 0) m.dollarPerPriceUnit = order.profit / profitDist;
    } else {
      // Fallback only if this broker feed doesn't expose profit at all
      if (!m.dollarPerPriceUnit && m.lots) {
        var instrRetry = Framework.Instruments.get(cfg.instrumentId);
        if (instrRetry && instrRetry.tickSize && instrRetry.tickValue) {
          m.dollarPerPriceUnit = m.lots * instrRetry.tickValue / instrRetry.tickSize;
        }
      }
      if (!m.dollarPerPriceUnit) return; // can't determine profit any way — skip this bar, retry next
      profitDollars = profitDist * m.dollarPerPriceUnit;
    }

    var nowTs = Date.now();
    if (!m.lastDiagLogTs || nowTs - m.lastDiagLogTs > 3000) {
      m.lastDiagLogTs = nowTs;
      log("Order " + orderId + " floating: $" + profitDollars.toFixed(2) +
          " | breakeven at $" + ((cfg.trailAfterProfitDollars || 0) * 0.5).toFixed(2) +
          " | trail at $" + cfg.trailAfterProfitDollars.toFixed(2) +
          (m.breakevenApplied ? " | breakeven done" : ""), "log-info");
    }

    // Step 1: move to breakeven once profit reaches half of "Trail After Profit" — but only if
    // that's actually an improvement on the current stop. If you've manually tightened the stop
    // closer than breakeven already, this leaves it alone instead of loosening it back out.
    var breakevenTriggerDollars = (cfg.trailAfterProfitDollars || 0) * 0.5;
    if (!m.breakevenApplied && breakevenTriggerDollars > 0 && profitDollars >= breakevenTriggerDollars) {
      // Entry price alone still loses the spread (and any commission) if the stop actually gets
      // hit there — that's a guaranteed small loss, not a true breakeven. This buffer pushes the
      // stop slightly past entry, in the favorable direction, so getting stopped here means a
      // tiny locked-in win or a true $0, never a loss.
      var bufferPrice = (cfg.breakevenBufferDollars > 0 && m.dollarPerPriceUnit)
        ? (cfg.breakevenBufferDollars / m.dollarPerPriceUnit) : 0;
      var bePrice = isLong ? (m.entryPrice + bufferPrice) : (m.entryPrice - bufferPrice);
      var currentSlBE = order.sl;
      var beImproves = isLong ? (!currentSlBE || bePrice > currentSlBE) : (!currentSlBE || bePrice < currentSlBE);

      if (!beImproves) {
        m.breakevenApplied = true; // current stop is already at least as good — nothing to do, just mark this step done
        return;
      }

      Framework.SendOrder({
        instrumentId: order.instrumentId,
        orderId: orderId,
        tradingAction: FXB.OrderTypes.CHANGE,
        sl: bePrice
      }, function (MsgResult) {
        if (MsgResult && MsgResult.result && MsgResult.result.isOkay) {
          m.breakevenApplied = true;
          log("Order " + orderId + " moved to breakeven" + (bufferPrice > 0 ? " + $" + cfg.breakevenBufferDollars + " buffer" : "") +
              " (" + bePrice.toFixed(5) + ")", "log-info");
        } else {
          var beErrText = "unknown error";
          try { beErrText = Framework.Translation.TranslateError(MsgResult.result); } catch (e) {}
          log("Order " + orderId + " breakeven update failed: " + beErrText, "log-warn");
          m.mgmtRetryAt = Date.now() + 4000; // cool down before retrying this order again
        }
      });
      return; // don't also trail on the same bar as the breakeven move
    }

    // Step 2: once profit clears "Trail After Profit" ($), trail behind price by
    // "Profit Lock Distance" ($), only ever tightening the stop, never loosening it.
    if (cfg.trailAfterProfitDollars > 0 && profitDollars >= cfg.trailAfterProfitDollars) {
      if (!cfg.profitLockDistanceDollars || cfg.profitLockDistanceDollars <= 0) {
        // A $0/blank Profit Lock Distance produces a stop AT the current price, which every
        // broker rejects as invalid — silently, over and over, with nothing ever actually
        // trailing. Refuse outright and say so loudly instead of repeating a doomed request.
        if (!m.warnedZeroLockDistance) {
          log("⚠️ Order " + orderId + " qualifies to trail but 'Profit Lock Distance' is $0/blank — " +
              "set it above 0 (e.g. $5–20) or trailing can never actually move the stop.", "log-warn");
          m.warnedZeroLockDistance = true;
        }
        return;
      }
      var trailDistPrice = cfg.profitLockDistanceDollars / m.dollarPerPriceUnit;
      var desiredSl = isLong ? (price - trailDistPrice) : (price + trailDistPrice);
      var currentSl = order.sl;
      var improves = isLong ? (!currentSl || desiredSl > currentSl) : (!currentSl || desiredSl < currentSl);

      if (improves) {
        Framework.SendOrder({
          instrumentId: order.instrumentId,
          orderId: orderId,
          tradingAction: FXB.OrderTypes.CHANGE,
          sl: desiredSl
        }, function (MsgResult) {
          if (MsgResult && MsgResult.result && MsgResult.result.isOkay) {
            m.breakevenApplied = true;
            log("Order " + orderId + " trailing stop moved to " + desiredSl.toFixed(5) +
                " (locking ~$" + cfg.profitLockDistanceDollars + ")", "log-info");
          } else {
            var errText = "unknown error";
            try { errText = Framework.Translation.TranslateError(MsgResult.result); } catch (e) {}
            log("Order " + orderId + " trailing stop update FAILED: " + errText, "log-warn");
            m.mgmtRetryAt = Date.now() + 4000; // cool down before retrying this order again
          }
        });
      }
    }
  });
}

// ---- Pivot levels from the higher-timeframe store, matching Smart Pivot Points v5's math ----
function getPivotLevels() {
  if (!pivotStore || pivotStore.length < 2) return null;
  var c = pivotStore.GetCandle(1); // last fully-closed pivot period
  if (!c) return null;

  var H = c.h, L = c.l, Cl = c.c;
  var range = H - L;
  if (range <= 0) return null;

  var P  = (H + L + Cl) / 3;
  var R1 = (2 * P) - L;
  var R2 = P + range;
  var R3 = R1 + range;
  var S1 = (2 * P) - H;
  var S2 = P - range;
  var S3 = S1 - range;
  var fib618R = P + 0.618 * range;
  var fib382R = P + 0.382 * range;
  var fib382S = P - 0.382 * range;
  var fib618S = P - 0.618 * range;

  return { P: P, R1: R1, R2: R2, R3: R3, S1: S1, S2: S2, S3: S3,
    fib382R: fib382R, fib618R: fib618R, fib382S: fib382S, fib618S: fib618S };
}

function getPivotP() {
  var lv = getPivotLevels();
  return lv ? lv.P : null;
}

// Ordered resistance levels above P, ascending — used both as TP targets for longs
// and as the retest ladder for breakout-retest entries.
// Checks whether the EMA stack (fast/mid/slow order only, not the rising/falling requirement)
// has held in one direction for `bars` consecutive closed bars — used only to gate reversals,
// so a one-bar flicker in the EMA order can't flip an existing position.
function stackHeldForBars(emaFast, emaMid, emaSlow, isLong, bars) {
  for (var k = 1; k <= bars; k++) {
    var f = emaFast.GetValue(k), m = emaMid.GetValue(k), s = emaSlow.GetValue(k);
    if (!f || !m || !s) return false;
    if (isLong && !(f > m && m > s)) return false;
    if (!isLong && !(f < m && m < s)) return false;
  }
  return true;
}

function resistanceLadder(lv) {
  return [lv.R1, lv.fib382R, lv.R2, lv.fib618R, lv.R3].sort(function(a,b){ return a-b; });
}
function supportLadder(lv) {
  return [lv.S1, lv.fib382S, lv.S2, lv.fib618S, lv.S3].sort(function(a,b){ return b-a; }); // descending
}

function structuralTPMaxDistance(atr) {
  return (cfg.tpAtrMult > 0 && atr) ? atr * cfg.tpAtrMult : undefined; // undefined = no cap
}

// Nearest structural level beyond the current close, in the trade's direction — used as TP.
// Capped by maxDistance (typically tpAtrMult × ATR) so a level from a wide daily range can't
// produce a wildly lopsided reward vs the ATR-based stop-loss — if the nearest qualifying
// level is farther than that, this returns null and the caller falls back to the flat ATR target.
function nearestStructuralTP(direction, closePrice, lv, maxDistance) {
  if (!lv) return null;
  var ladder = direction === "buy" ? resistanceLadder(lv) : supportLadder(lv);
  for (var i = 0; i < ladder.length; i++) {
    if (direction === "buy" && ladder[i] > closePrice) {
      if (maxDistance && (ladder[i] - closePrice) > maxDistance) return null;
      return ladder[i];
    }
    if (direction === "sell" && ladder[i] < closePrice) {
      if (maxDistance && (closePrice - ladder[i]) > maxDistance) return null;
      return ladder[i];
    }
  }
  return null;
}

// ---- Core signal + trading logic, called on each new closed bar -----
// Reads a current ATR value directly from the live candle store — safe to call any time,
// not just on a bar close, since tradingStore's calculations stay current between bar events.
// This is what lets trade protection (missing SL/TP, breakeven, trailing) react instantly to a
// real-time account update instead of waiting for the next candle to close.
function getCurrentProtectionAtr() {
  if (!tradingStore || tradingStore.length < 2) return null;
  var protectAtr = tradingStore.ta[3]; // ATR(14)
  var protectCandle = tradingStore.GetCandle(1);
  if (!protectCandle) return null;
  var protectRange = protectCandle.h - protectCandle.l;
  return protectAtr.GetValue(1) || protectRange || null;
}

function onNewTradingBar() {
  // Retry any stuck force-closes even while stopped — this runs BEFORE the isRunning check on
  // purpose. A circuit-breaker trip sets isRunning=false, and if a close attempt failed, this is
  // exactly the state where retries need to keep happening regardless of that flag.
  if (Object.keys(forceCloseQueue).length > 0) attemptForceCloses();

  if (!isRunning) return;
  checkDailyCircuitBreaker();
  if (!isRunning) return; // may have just tripped

  // ---- Trade protection runs as soon as there's ANY data, independent of the full history
  // requirement below. Adding a missing SL/TP, or managing breakeven/trailing on an already-open
  // trade, only needs an ATR reading — it has nothing to do with the slow EMA needing 38 bars of
  // history before the trend-signal logic further down can run. Gating protection behind that
  // requirement was a real bug: a freshly re-adopted manual trade could sit completely unprotected
  // for as long as this instrument/timeframe took to accumulate enough bars for the full strategy.
  var earlyAtrV = getCurrentProtectionAtr();
  if (earlyAtrV) {
    applyMissingInitialRisk(earlyAtrV);
    manageOpenTrades(earlyAtrV);
  }

  if (tradingStore.length < cfg.slowLen + 4) {
    log("Waiting for history: " + tradingStore.length + "/" + (cfg.slowLen + 4) + " bars loaded for " + cfg.instrumentId +
        ". If this never advances, the Instrument field likely doesn't exactly match this broker's symbol name.", "log-warn");
    return; // not enough history for new-signal generation yet — trade protection above already ran regardless
  }

  var emaFast = tradingStore.ta[0];
  var emaMid  = tradingStore.ta[1];
  var emaSlow = tradingStore.ta[2];
  var atr     = tradingStore.ta[3];

  var candle = tradingStore.GetCandle(1);
  if (!candle) return;
  var o = candle.o, h = candle.h, l = candle.l, c = candle.c;
  var range = h - l;
  if (range <= 0) return;

  var fast = emaFast.GetValue(1), mid = emaMid.GetValue(1), slow = emaSlow.GetValue(1);
  var fast2 = emaFast.GetValue(3), mid2 = emaMid.GetValue(3), slow2 = emaSlow.GetValue(3);
  var atrV = atr.GetValue(1) || range;
  if (!fast || !mid || !slow || !fast2 || !mid2 || !slow2) return;

  var bullStack = fast > mid && mid > slow;
  var bearStack = fast < mid && mid < slow;
  var bullTrend = bullStack && fast > fast2 && mid > mid2;
  var bearTrend = bearStack && fast < fast2 && mid < mid2;

  var pivotP = getPivotP();
  var pivotLevels = getPivotLevels();
  // When "require pivot-side agreement" is off, the pivot-side gate always passes — matching the
  // raw Overkill Scalper indicator's frequency, which never filters by pivot at all. Pivot levels
  // are still computed and still used for structural TP targets either way.
  var aboveP = !cfg.requirePivotSide || (pivotP !== null && c > pivotP);
  var belowP = !cfg.requirePivotSide || (pivotP !== null && c < pivotP);

  // --- touched-mid check over the last 3 closed bars, like the Scalper ---
  var touchedMidBull = false, touchedMidBear = false;
  for (var k = 2; k <= 4; k++) {
    var pc = tradingStore.GetCandle(k);
    var pmid = emaMid.GetValue(k);
    if (!pc || !pmid) continue;
    if (pc.l <= pmid * 1.001) touchedMidBull = true;
    if (pc.h >= pmid * 0.999) touchedMidBear = true;
  }
  var nearMidBull = l <= mid * 1.006 && c >= mid * 0.998;
  var nearMidBear = h >= mid * 0.994 && c <= mid * 1.002;

  var bullMomentum = c > o && (c - l) / range >= 0.45 && c > fast && range >= atrV * cfg.atrMult;
  var bearMomentum = c < o && (h - c) / range >= 0.45 && c < fast && range >= atrV * cfg.atrMult;

  var buySignal  = bullTrend && bullMomentum && (touchedMidBull || nearMidBull);
  var sellSignal = bearTrend && bearMomentum && (touchedMidBear || nearMidBear);

  // --- retest-of-trend-line (mid EMA) signal — lighter filter, no full momentum candle needed ---
  var retestBuy  = bullTrend && l <= mid * 1.003 && c > mid && c > o;
  var retestSell = bearTrend && h >= mid * 0.997 && c < mid && c < o;

  // --- retest of a broken structural level (R1/S1/Fib382/Fib618/R2/S2) — classic breakout-retest ---
  var levelRetestBuy = null, levelRetestSell = null;
  if (pivotLevels) {
    var prevCandle = tradingStore.GetCandle(2);
    if (prevCandle && bullTrend) {
      var resLadder = resistanceLadder(pivotLevels);
      for (var ri = 0; ri < resLadder.length; ri++) {
        var lvl = resLadder[ri];
        // Bar 2 already closed above the level (confirmed breakout), this bar dipped back to
        // retest it and held, closing back above — level now acting as support.
        if (prevCandle.c > lvl && l <= lvl * 1.0015 && c > lvl) { levelRetestBuy = lvl; break; }
      }
    }
    if (prevCandle && bearTrend) {
      var supLadder = supportLadder(pivotLevels);
      for (var si = 0; si < supLadder.length; si++) {
        var lvlS = supLadder[si];
        if (prevCandle.c < lvlS && h >= lvlS * 0.9985 && c < lvlS) { levelRetestSell = lvlS; break; }
      }
    }
  }

  // advance cooldown counters
  Object.keys(barsSinceLastEntry).forEach(function(k) { barsSinceLastEntry[k]++; });

  // Note: applyMissingInitialRisk() and manageOpenTrades() already ran earlier in this function,
  // decoupled from the history gate above — trade protection shouldn't wait on signal-generation
  // history requirements. No need to call them again here.

  if (cfg.requirePivotSide && pivotP === null) {
    log("Waiting for pivot data (" + cfg.instrumentId + ")...", "log-info");
    return;
  }

  var position = Framework.Positions.getOrEmpty(cfg.instrumentId);
  if (position.positionType === FXB.PositionTypes.LONG || position.positionType === FXB.PositionTypes.SHORT) {
    // reset add-on counter for whichever side is now flat
  } else if (position.positionType === FXB.PositionTypes.EMPTY) {
    addOnsUsed.buy = 0; addOnsUsed.sell = 0;
  }

  // --- Primary BUY: uptrend + signal + above pivot ---
  if (buySignal && aboveP && barsSinceLastEntry.buy > cfg.cooldownBars) {
    if (position.positionType !== FXB.PositionTypes.SHORT) {
      var isAdd = position.positionType === FXB.PositionTypes.LONG;
      var tpBuy = cfg.useLevelTP ? nearestStructuralTP("buy", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
      var pivotTxt = pivotP !== null ? pivotP.toFixed(5) : "n/a";
      if (!isAdd) {
        placeOrder("buy", computeLotSize(cfg.baseLots, cfg.baseRiskPct, atrV), "uptrend signal above pivot P (" + pivotTxt + ")", atrV, tpBuy);
        barsSinceLastEntry.buy = 0;
      } else if (cfg.enableAddOns && addOnsUsed.buy < cfg.maxAddOns) {
        placeOrder("buy", computeLotSize(cfg.addOnLots, cfg.addOnRiskPct, atrV), "add-on, uptrend signal above pivot P", atrV, tpBuy);
        addOnsUsed.buy++; barsSinceLastEntry.buy = 0;
      } else {
        log("Buy signal fired but ignored — already long and add-on cap (" + cfg.maxAddOns + ") reached or add-ons disabled", "log-warn");
      }
    } else if (cfg.reversalModeOn && addOnsUsed.sell <= cfg.reversalMaxAddOns) {
      var buyRevCandleOk = range >= atrV * cfg.reversalAtrMult;
      var buyRevTrendOk = stackHeldForBars(emaFast, emaMid, emaSlow, true, cfg.reversalConfirmBars);
      if (buyRevCandleOk && buyRevTrendOk) {
        log("Buy signal — reversing existing short position on " + cfg.instrumentId + " (Reversal Mode, confirmed)", "log-buy");
        closeAllOpposite("sell", function () {
          addOnsUsed.buy = 0; addOnsUsed.sell = 0;
          var tpBuyRev = cfg.useLevelTP ? nearestStructuralTP("buy", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
          placeOrder("buy", computeLotSize(cfg.baseLots, cfg.baseRiskPct, atrV), "uptrend signal (reversal)", atrV, tpBuyRev);
          barsSinceLastEntry.buy = 0;
        });
      } else {
        log("Buy signal fired but reversal not confirmed yet — needs a bigger candle (" + (atrV * cfg.reversalAtrMult).toFixed(5) +
            " range) and/or the trend held " + cfg.reversalConfirmBars + " bars. Staying short for now.", "log-warn");
      }
    } else if (cfg.reversalModeOn) {
      log("Buy signal ignored — short position has " + addOnsUsed.sell + " add-on(s), beyond the reversal cap (" +
          cfg.reversalMaxAddOns + ") — treating this as a pullback in an established downtrend, not a reason to flip.", "log-warn");
    } else {
      log("Buy signal ignored — existing short position open on " + cfg.instrumentId, "log-warn");
    }
  }

  // --- Primary SELL: downtrend + signal + below pivot ---
  if (sellSignal && belowP && barsSinceLastEntry.sell > cfg.cooldownBars) {
    if (position.positionType !== FXB.PositionTypes.LONG) {
      var isAddS = position.positionType === FXB.PositionTypes.SHORT;
      var tpSell = cfg.useLevelTP ? nearestStructuralTP("sell", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
      var pivotTxtS = pivotP !== null ? pivotP.toFixed(5) : "n/a";
      if (!isAddS) {
        placeOrder("sell", computeLotSize(cfg.baseLots, cfg.baseRiskPct, atrV), "downtrend signal below pivot P (" + pivotTxtS + ")", atrV, tpSell);
        barsSinceLastEntry.sell = 0;
      } else if (cfg.enableAddOns && addOnsUsed.sell < cfg.maxAddOns) {
        placeOrder("sell", computeLotSize(cfg.addOnLots, cfg.addOnRiskPct, atrV), "add-on, downtrend signal below pivot P", atrV, tpSell);
        addOnsUsed.sell++; barsSinceLastEntry.sell = 0;
      } else {
        log("Sell signal fired but ignored — already short and add-on cap (" + cfg.maxAddOns + ") reached or add-ons disabled", "log-warn");
      }
    } else if (cfg.reversalModeOn && addOnsUsed.buy <= cfg.reversalMaxAddOns) {
      var sellRevCandleOk = range >= atrV * cfg.reversalAtrMult;
      var sellRevTrendOk = stackHeldForBars(emaFast, emaMid, emaSlow, false, cfg.reversalConfirmBars);
      if (sellRevCandleOk && sellRevTrendOk) {
        log("Sell signal — reversing existing long position on " + cfg.instrumentId + " (Reversal Mode, confirmed)", "log-sell");
        closeAllOpposite("buy", function () {
          addOnsUsed.buy = 0; addOnsUsed.sell = 0;
          var tpSellRev = cfg.useLevelTP ? nearestStructuralTP("sell", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
          placeOrder("sell", computeLotSize(cfg.baseLots, cfg.baseRiskPct, atrV), "downtrend signal (reversal)", atrV, tpSellRev);
          barsSinceLastEntry.sell = 0;
        });
      } else {
        log("Sell signal fired but reversal not confirmed yet — needs a bigger candle (" + (atrV * cfg.reversalAtrMult).toFixed(5) +
            " range) and/or the trend held " + cfg.reversalConfirmBars + " bars. Staying long for now.", "log-warn");
      }
    } else if (cfg.reversalModeOn) {
      log("Sell signal ignored — long position has " + addOnsUsed.buy + " add-on(s), beyond the reversal cap (" +
          cfg.reversalMaxAddOns + ") — treating this as a pullback in an established uptrend, not a reason to flip.", "log-warn");
    } else {
      log("Sell signal ignored — existing long position open on " + cfg.instrumentId, "log-warn");
    }
  }

  // --- Retest-of-trend-line entries ---
  if (cfg.enableRetest) {
    if (retestBuy && aboveP && barsSinceLastEntry.retestBuy > cfg.cooldownBars && position.positionType !== FXB.PositionTypes.SHORT) {
      var tpRetestBuy = cfg.useLevelTP ? nearestStructuralTP("buy", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
      placeOrder("buy", computeLotSize(cfg.retestLots, cfg.retestRiskPct, atrV), "retest of EMA" + cfg.midLen + " trend line, uptrend above pivot P", atrV, tpRetestBuy);
      barsSinceLastEntry.retestBuy = 0;
    }
    if (retestSell && belowP && barsSinceLastEntry.retestSell > cfg.cooldownBars && position.positionType !== FXB.PositionTypes.LONG) {
      var tpRetestSell = cfg.useLevelTP ? nearestStructuralTP("sell", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
      placeOrder("sell", computeLotSize(cfg.retestLots, cfg.retestRiskPct, atrV), "retest of EMA" + cfg.midLen + " trend line, downtrend below pivot P", atrV, tpRetestSell);
      barsSinceLastEntry.retestSell = 0;
    }
  }

  // --- Retest-of-structural-level entries (breakout-retest of R1/S1/Fib/R2/S2) ---
  if (cfg.enableLevelRetest && pivotLevels) {
    if (levelRetestBuy !== null && aboveP && barsSinceLastEntry.levelRetestBuy > cfg.cooldownBars && position.positionType !== FXB.PositionTypes.SHORT) {
      var tpLevelBuy = cfg.useLevelTP ? nearestStructuralTP("buy", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
      placeOrder("buy", computeLotSize(cfg.levelRetestLots, cfg.levelRetestRiskPct, atrV), "retest of broken level " + levelRetestBuy.toFixed(5) + " as support", atrV, tpLevelBuy);
      barsSinceLastEntry.levelRetestBuy = 0;
    }
    if (levelRetestSell !== null && belowP && barsSinceLastEntry.levelRetestSell > cfg.cooldownBars && position.positionType !== FXB.PositionTypes.LONG) {
      var tpLevelSell = cfg.useLevelTP ? nearestStructuralTP("sell", c, pivotLevels, structuralTPMaxDistance(atrV)) : null;
      placeOrder("sell", computeLotSize(cfg.levelRetestLots, cfg.levelRetestRiskPct, atrV), "retest of broken level " + levelRetestSell.toFixed(5) + " as resistance", atrV, tpLevelSell);
      barsSinceLastEntry.levelRetestSell = 0;
    }
  }
}

// ---- Manual test buttons — bypass ALL strategy logic, just prove SendOrder works ----
function testPlaceOrder(direction) {
  var instrumentId = document.getElementById("instrumentId").value.trim();
  if (!instrumentId) { log("Enter an instrument ID first (e.g. EUR/USD) before testing.", "log-warn"); return; }
  var testLots = parseFloat(document.getElementById("testLots").value) || 0.01;

  var req = {
    instrumentId: instrumentId,
    tradingAction: direction === "buy" ? FXB.OrderTypes.BUY : FXB.OrderTypes.SELL,
    volume: { lots: testLots }
  };

  log("MANUAL TEST " + direction.toUpperCase() + " " + testLots + " lots " + instrumentId + " — bypassing strategy logic entirely", direction === "buy" ? "log-buy" : "log-sell");

  // Always force the platform's own confirmation dialog for manual tests, regardless of
  // the "Confirm every order" checkbox — this is a deliberate manual click, so you should
  // always see the platform's prompt before it actually executes.
  Framework.SendOrder(req, function (MsgResult) {
    if (MsgResult && MsgResult.result && MsgResult.result.isOkay) {
      log("Manual test order confirmed OK — SendOrder is correctly linked to this account.", "log-info");
      beep(direction);
    } else {
      var errText = "unknown error";
      try { errText = Framework.Translation.TranslateError(MsgResult.result); } catch (e) {}
      log("Manual test order failed/cancelled: " + errText, "log-warn");
    }
  }, { confirm: true });
}

// ---- Start / Stop ---------------------------------------------------
var startConfirmArmed = false;
var startConfirmTimeout = null;

function startBot() {
  if (!startConfirmArmed) {
    startConfirmArmed = true;
    var startBtnEl = document.getElementById("startBtn");
    startBtnEl.textContent = "⚠️ Click again to confirm — places REAL orders";
    log("This starts placing real orders on this account. Click Start Bot again within 8 seconds to confirm.", "log-warn");
    clearTimeout(startConfirmTimeout);
    startConfirmTimeout = setTimeout(function () {
      startConfirmArmed = false;
      startBtnEl.textContent = "▶ Start Bot";
    }, 8000);
    return;
  }
  startConfirmArmed = false;
  clearTimeout(startConfirmTimeout);
  document.getElementById("startBtn").textContent = "▶ Start Bot";

  cfg = readConfig();
  if (!cfg.instrumentId) { log("Enter an instrument ID first (e.g. EUR/USD).", "log-warn"); return; }
  if (!document.getElementById("accountSizeSelect").value) { log("Select your Account Size first — this sets your position sizing and risk limits.", "log-warn"); return; }

  // Catch a Mode/timeframe mismatch — e.g. Mode says "Swing" but the actual timeframe field
  // (in Advanced) got manually changed or drifted from a previously-saved setting and still
  // shows M5. The field itself always wins at runtime; this just makes sure that's never silent.
  var expectedTf = MODE_PRESETS[cfg.mode] ? MODE_PRESETS[cfg.mode].timeframe : null;
  if (expectedTf && cfg.timeframe !== expectedTf) {
    var tfLabel = document.getElementById("timeframe").options[document.getElementById("timeframe").selectedIndex].text;
    log("⚠️ Mode is set to \"" + cfg.mode + "\" but the actual Trading timeframe is " + tfLabel +
        ", not what that Mode normally uses. Running on " + tfLabel + " anyway — the timeframe field always wins. " +
        "Open Advanced to fix this if it wasn't intentional.", "log-warn");
  }

  var instr = Framework.Instruments.get(cfg.instrumentId);
  cfg.pipSize = (instr && instr.pipSize) ? instr.pipSize : 1;
  if (!instr) log("Instrument not yet loaded — using pipSize=1 for now; risk sizing will correct itself once it loads.", "log-warn");

  // The platform normalizes instrument IDs internally (e.g. you might type "GBPJPY" to match
  // your chart, but a real order object comes back with the canonical "GBP/JPY"). Comparing a
  // real order's instrumentId against the raw text you typed can silently fail to match even
  // though it's the same instrument — this is what actually gets compared against real orders.
  cfg.canonicalInstrumentId = (instr && instr.instrumentId) ? instr.instrumentId : cfg.instrumentId;
  if (cfg.canonicalInstrumentId !== cfg.instrumentId) {
    log("Instrument \"" + cfg.instrumentId + "\" resolved to \"" + cfg.canonicalInstrumentId + "\" on this account.", "log-info");
  }

  barsSinceLastEntry = { buy: 999, sell: 999, retestBuy: 999, retestSell: 999, levelRetestBuy: 999, levelRetestSell: 999 };
  addOnsUsed = { buy: 0, sell: 0 };
  pendingManagement = [];
  managedOrders = {};

  // Re-adopt any already-open trades on this instrument — this is what stops a page reload or
  // re-pasted update from silently orphaning a live trade. Without this, restarting the bot
  // would lose all memory of an open position: it stays live on your broker with whatever SL/TP
  // it already had, but never gets breakeven/trailing management again, because that tracking
  // only ever lived in this browser tab's memory, not saved anywhere. This is very likely what
  // happened to the trade that ran to +$3,000 and gave most of it back.
  var reAdoptedCount = 0;
  Framework.Orders.forEach(function (orderId, order) {
    if (!order || !isBotInstrument(order.instrumentId)) return;
    if (order.closeTime) return; // historic/closed, not currently open
    if (order.orderType !== FXB.OrderTypes.BUY && order.orderType !== FXB.OrderTypes.SELL) return; // skip pending orders
    if (managedOrders[order.orderId]) return; // already tracked

    managedOrders[order.orderId] = {
      direction: order.orderType === FXB.OrderTypes.BUY ? "buy" : "sell",
      atrAtEntry: 0,
      entryPrice: order.openPrice,
      breakevenApplied: false,
      lots: null,
      dollarPerPriceUnit: null,
      needsInitialRisk: true // if this trade has no SL/TP (e.g. a manual entry), one gets added on the next bar close
    };
    reAdoptedCount++;
  });
  if (reAdoptedCount > 0) {
    log("Re-adopted " + reAdoptedCount + " already-open trade(s) on " + cfg.instrumentId +
        " — any missing SL/TP will be added on the next bar close, then breakeven/trailing management begins.", "log-info");
  }

  entriesToday = 0;
  entriesDayKey = currentDayKey();
  circuitBreakerTripped = false;
  dailyBreakerDayKey = currentDayKey();
  warnedZeroTrailAfter = false;
  warnedZeroLockDistance = false;

  tradingStore = new FXB.CandleStore({
    ta: [
      new FXB.ta.EMA({ period: cfg.fastLen }),
      new FXB.ta.EMA({ period: cfg.midLen }),
      new FXB.ta.EMA({ period: cfg.slowLen }),
      new FXB.ta.ATR({ period: 14 })
    ],
    OnNewCandle: onNewTradingBar
  });

  pivotStore = new FXB.CandleStore({});

  Framework.RequestCandles({ instrumentId: cfg.instrumentId, timeframe: cfg.timeframe }, tradingStore);
  Framework.RequestCandles({ instrumentId: cfg.instrumentId, timeframe: cfg.pivotTf }, pivotStore);

  isRunning = true;
  setInputsDisabled(true);
  setStatus(true);
  log("Started on " + cfg.instrumentId + " — trading tf " + cfg.timeframe + "s, pivot tf " + cfg.pivotTf + "s", "log-info");

  Framework.SaveCategorySettings(cfg);
}

function stopBot() {
  isRunning = false;
  setInputsDisabled(false);
  setStatus(false);
  log("Stopped. Existing open trades/pending orders are NOT closed automatically.", "log-warn");
}

// ---- Wire-up ---------------------------------------------------------
Framework.OnGetState = function () {
  // Tells the platform to keep this widget running (and reload it automatically)
  // even when you switch charts, change the instrument, or navigate elsewhere.
  // Without this, the framework unloads the widget on every navigation — which is
  // exactly the "window disappears" behaviour we're fixing here.
  return { mustRemain: true };
};

Framework.OnLoad = function () {
  // Best-effort: relabel the dollar-denominated fields with the account's real deposit currency
  // if the platform exposes one. Falls back to "$" silently if it doesn't — never breaks either way.
  try {
    var curr = Framework.Account && Framework.Account.currency;
    if (curr && curr !== "USD") {
      document.querySelectorAll("label").forEach(function (lbl) {
        if (lbl.textContent.indexOf("($)") !== -1) lbl.textContent = lbl.textContent.replace("($)", "(" + curr + ")");
      });
    }
  } catch (e) {}

  Framework.LoadCategorySettings(SETTINGS_ID, function (settings) {
    var isFreshInstall = !settings;
    settings = settings || {};
    if (!settings.instrumentId && Framework.Account && Framework.Account.defaultInstrumentId) {
      settings.instrumentId = Framework.Account.defaultInstrumentId;
    }
    applyConfigToUI(settings);
    // Only seed the Mode preset on a genuinely fresh install — a returning user's saved
    // advanced-field values (including any manual tweaks) were already restored above by
    // applyConfigToUI, and re-applying the preset here would silently overwrite them.
    if (isFreshInstall) applyModePreset(document.getElementById("modeSelect").value);
    setStatus(false);
    log("Ready. Review settings, then press Start Bot.", "log-info");
  });

  document.getElementById("startBtn").addEventListener("click", startBot);
  document.getElementById("stopBtn").addEventListener("click", stopBot);
  document.getElementById("testBuyBtn").addEventListener("click", function () { testPlaceOrder("buy"); });
  document.getElementById("testSellBtn").addEventListener("click", function () { testPlaceOrder("sell"); });
  document.getElementById("clearLogBtn").addEventListener("click", function () {
    document.getElementById("log").innerHTML = "";
  });
  document.getElementById("exportCsvBtn").addEventListener("click", exportTradeLogCsv);
  document.getElementById("resetStatsBtn").addEventListener("click", function () {
    tradeLog = [];
    refreshStatsDisplay();
    log("Performance stats reset.", "log-info");
  });
  document.getElementById("minimizeBtn").addEventListener("click", function () {
    var min = document.body.classList.toggle("minimized");
    this.textContent = min ? "▢" : "▁";
    this.title = min ? "Restore" : "Minimize";
  });
  document.getElementById("advancedToggle").addEventListener("click", function () {
    var section = document.getElementById("advancedSection");
    var expanded = section.classList.toggle("expanded");
    this.textContent = expanded ? "▾ Hide advanced settings" : "▸ Show advanced settings";
  });
  document.getElementById("modeSelect").addEventListener("change", function () {
    applyModePreset(this.value);
    log("Mode set to " + this.value + " — timeframe, stops, and targets updated automatically.", "log-info");
  });
  document.getElementById("accountSizeSelect").addEventListener("change", function () {
    applyAccountSizePreset(this.value);
    log("Account size set to " + this.value + " — position sizing, daily limits, and trailing amounts updated automatically.", "log-info");
  });
};

Framework.OnMessage = function (Msg) {
  if (!Msg) return;
  if (Msg.is(FXB.MessageTypes.CATEGORY_SETTINGS_CHANGE)) {
    // another instance changed saved settings — no action needed while running
  }
};
</script>
</body>
</html>
