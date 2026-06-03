/* ================================================================
   Liquid Charts Pro — Support & Resistance Signals
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode: UDI
   5. Click ADD
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$alertedDate  = 0;
        this.$alertedClose = 0;
        this.$openSignal   = null;
        this.$lastSigBar   = -999;
        this.$lastSigPrice = null;
        this.$touchedZones = {};
        this.$ema200       = null;

        return {
            caption:   "S&R Signals",
            isOverlay: true,
            plots:     [],

            settingsFields: [
                {id:"swingLookback", caption:"How far back to find zones (bars)",
                 type:"int", defaultValue:700, min:20, max:1000},
                {id:"swingStrength", caption:"Zone strength (bars each side)",
                 type:"int", defaultValue:3, min:2, max:20},
                {id:"zoneWidth",     caption:"Zone width in pips",
                 type:"int", defaultValue:50, min:5, max:1000},
                {id:"use200EMA",     caption:"Use 200 EMA filter",
                 type:"bool", defaultValue:true},
                {id:"minBarsBetween",caption:"Min bars between signals",
                 type:"int", defaultValue:10, min:1, max:30},
                {id:"minPipsBetween",caption:"Min pips between signals",
                 type:"int", defaultValue:50, min:5, max:2000},
                {id:"firstTouchOnly",caption:"First touch of zone only",
                 type:"bool", defaultValue:true},
                {id:"showBuys",      caption:"Show BUY signals",  type:"bool", defaultValue:true},
                {id:"showSells",     caption:"Show SELL signals", type:"bool", defaultValue:true},
                {id:"labelBuy",      caption:"BUY label",  type:"text", defaultValue:"BUY"},
                {id:"labelSell",     caption:"SELL label", type:"text", defaultValue:"SELL"},
                {id:"alertsOn",      caption:"Enable alerts", type:"bool", defaultValue:true},
                {id:"telegramOn",    caption:"Enable Telegram", type:"bool", defaultValue:false},
                {id:"tgToken",       caption:"Telegram Bot Token", type:"text", defaultValue:""},
                {id:"tgChatId",      caption:"Telegram Chat ID",   type:"text", defaultValue:""}
            ]
        };
    }

    onContextChange(data)   { this._reset(); }
    onParameterChange(data) { this._reset(); }

    _reset() {
        this.$alertedDate  = 0;
        this.$alertedClose = 0;
        this.$openSignal   = null;
        this.$lastSigBar   = -999;
        this.$lastSigPrice = null;
        this.$touchedZones = {};
        this.$ema200       = null;
        this.removeAllDrawings();
    }

    _bool(v) {
        return v === true || v === "true" || v === "yes" || v === 1;
    }

    onCalculate(data, output) {
        var p             = data.parameters;
        var swingLookback = parseInt(p.swingLookback)    || 100;
        var swingStrength = parseInt(p.swingStrength)    || 5;
        var zoneWidthPips = parseInt(p.zoneWidth)        || 50;
        var use200        = this._bool(p.use200EMA !== undefined ? p.use200EMA : true);
        var minBars       = parseInt(p.minBarsBetween)   || 10;
        var minPipsDist   = parseInt(p.minPipsBetween)   || 50;
        var firstTouchOnly= this._bool(p.firstTouchOnly !== undefined ? p.firstTouchOnly : true);
        var showBuys      = !(p.showBuys  === false || p.showBuys  === "false" || p.showBuys  === 0);
        var showSells     = !(p.showSells === false || p.showSells === "false" || p.showSells === 0);
        var lblBuy        = (p.labelBuy  || "BUY").trim();
        var lblSell       = (p.labelSell || "SELL").trim();
        var alertsOn      = this._bool(p.alertsOn);
        var telegramOn    = this._bool(p.telegramOn);
        var tgToken       = (p.tgToken  || "").trim();
        var tgChatId      = (p.tgChatId || "").trim();
        var instrument    = data.context.instrument.name;
        var timeframe     = data.context.timeframe || "";
        var pipSize       = data.context.instrument.pipSize || 0.0001;
        var count         = data.valueCount;

        if (count < swingLookback + swingStrength + 10) return;

        // ── EMA 200 ────────────────────────────────────────────
        if (!this.$ema200) this.$ema200 = new FXB.ta.EMA({period: 200});

        if (data.currentBarUpdateOnly) {
            this.$ema200.UpdateCurrent(data);
            // ── LIVE BAR: milestones ONLY — no redraw ──────────
            // This is the fix for blinking. removeAllDrawings() on
            // every tick causes the flash. We skip the redraw
            // entirely on live bar updates.
            if (this.$openSignal) {
                var lc = data.barData.close[0];
                var ld = data.barData.date[0];
                this._milestones(lc, ld, pipSize, alertsOn, telegramOn,
                    tgToken, tgChatId, instrument, timeframe);
            }
            return; // ← KEY: skip redraw on live ticks
        }

        // ── CLOSED BAR: full redraw ────────────────────────────
        this.$ema200.LoadData(data);
        var ema200Arr = this.$ema200.GetValueArray();
        var bd        = data.barData;
        var zoneW     = zoneWidthPips * pipSize;

        this.removeAllDrawings();   // only called on closed bar — no blink
        this.$touchedZones = {};
        this.$lastSigPrice = null;
        var drawings = [];

        // ── Find swing highs and lows ──────────────────────────
        var supports    = [];
        var resistances = [];
        var searchFrom  = Math.min(swingLookback, count - swingStrength - 1);

        for (var si = searchFrom; si >= swingStrength + 1; si--) {
            var siH = bd.high[si];
            var siL = bd.low[si];
            var isSwingHigh = true;
            var isSwingLow  = true;

            for (var sj = 1; sj <= swingStrength; sj++) {
                if (si - sj < 0 || si + sj >= count) { isSwingHigh = isSwingLow = false; break; }
                if (bd.high[si - sj] >= siH || bd.high[si + sj] >= siH) isSwingHigh = false;
                if (bd.low[si - sj]  <= siL || bd.low[si + sj]  <= siL) isSwingLow  = false;
            }

            if (isSwingHigh) resistances.push({price: siH, idx: si});
            if (isSwingLow)  supports.push(   {price: siL, idx: si});
        }

        // ── Scan bars for zone touch + rejection ───────────────
        var scanLimit  = Math.min(swingLookback, count - 2);
        var lastSigBar = -999;
        var lastSigPx  = null;

        for (var i = 1; i <= scanLimit; i++) {
            var barDate = bd.date[i];

            if (Math.abs(i - lastSigBar) < minBars) continue;

            var open  = bd.open[i];
            var high  = bd.high[i];
            var low   = bd.low[i];
            var close = bd.close[i];
            var range = high - low;
            if (range === 0) continue;

            var e200     = ema200Arr ? ema200Arr[i] : null;
            var above200 = !use200 || !e200 || close >= e200;
            var below200 = !use200 || !e200 || close <= e200;

            var signalType = null;

            // BUY: support touch + bullish rejection
            if (showBuys && above200) {
                for (var sp = 0; sp < supports.length; sp++) {
                    if (supports[sp].idx <= i) continue;
                    var supportPrice = supports[sp].price;
                    var zoneTop      = supportPrice + zoneW;
                    var zoneBot      = supportPrice - zoneW;
                    var touchedZone  = low <= zoneTop && low >= zoneBot - zoneW;
                    var bullishClose = close > open;
                    var closedAboveMid = (close - low) / range >= 0.55;
                    if (touchedZone && bullishClose && closedAboveMid) {
                        var zoneKey = "S_" + Math.round(supportPrice / pipSize);
                        if (firstTouchOnly && this.$touchedZones[zoneKey]) continue;
                        if (firstTouchOnly) this.$touchedZones[zoneKey] = true;
                        signalType = "buy";
                        break;
                    }
                }
            }

            // SELL: resistance touch + bearish rejection
            if (!signalType && showSells && below200) {
                for (var rp = 0; rp < resistances.length; rp++) {
                    if (resistances[rp].idx <= i) continue;
                    var resistPrice  = resistances[rp].price;
                    var rZoneTop     = resistPrice + zoneW;
                    var rZoneBot     = resistPrice - zoneW;
                    var touchedRes   = high >= rZoneBot - zoneW && high <= rZoneTop + zoneW;
                    var bearishClose = close < open;
                    var closedBelowMid = (high - close) / range >= 0.55;
                    if (touchedRes && bearishClose && closedBelowMid) {
                        var zoneKeyR = "R_" + Math.round(resistPrice / pipSize);
                        if (firstTouchOnly && this.$touchedZones[zoneKeyR]) continue;
                        if (firstTouchOnly) this.$touchedZones[zoneKeyR] = true;
                        signalType = "sell";
                        break;
                    }
                }
            }

            if (!signalType) continue;

            var minPipsAbs = minPipsDist * pipSize;
            if (lastSigPx !== null && Math.abs(close - lastSigPx) < minPipsAbs) continue;

            var isBuy = signalType === "buy";
            var color = isBuy ? "#00e5ff" : "#ff4081";
            var label = isBuy ? "▲ " + lblBuy : "▼ " + lblSell;

            lastSigBar = i;
            lastSigPx  = close;

            drawings.push({
                type:          "barMarker",
                points:        [{date: barDate, value: isBuy ? low : high}],
                iconColor:     color,
                icon:          isBuy ? "f0aa" : "f0ab",
                iconSize:      22,
                markerOffset:  isBuy ? 30 : -30,
                text:          label,
                textAboveLine: !isBuy,
                style:         {text: {color: color, fontsize: 11}}
            });

            // Alert on bar[1] only
            if (i === 1 && barDate !== this.$alertedDate) {
                this.$alertedDate  = barDate;
                this.$alertedClose = 0;
                this.$openSignal   = {
                    dir:        isBuy ? "buy" : "sell",
                    entryPrice: close,
                    entryDate:  barDate,
                    alert10: false, alert15: false,
                    alert20: false, alert30: false
                };
                var title = (isBuy ? "▲ BUY" : "▼ SELL") + " — " + instrument;
                var msg   = (isBuy ? "Support" : "Resistance")
                          + " zone rejection  |  " + timeframe;
                if (alertsOn) {
                    this.createToast({title: title, text: msg});
                    this._beep(isBuy ? "buy" : "sell");
                }
                if (telegramOn && tgToken && tgChatId) {
                    this._sendTelegram(tgToken, tgChatId, title + "\n" + msg);
                }
            }

            if (this.$openSignal) {
                this._milestones(close, barDate, pipSize, alertsOn,
                    telegramOn, tgToken, tgChatId, instrument, timeframe);
            }
        }

        if (drawings.length) this.createDrawing(drawings);
    }

    _milestones(close, barDate, pipSize, alertsOn, telegramOn,
                tgToken, tgChatId, instrument, timeframe) {
        if (!this.$openSignal) return;
        var os = this.$openSignal;
        var profitPips = os.dir === "buy"
            ? (close - os.entryPrice) / pipSize
            : (os.entryPrice - close) / pipSize;
        var pp = Math.round(profitPips);

        var self = this;
        var fire = function(cond, flag, title, text) {
            if (!cond || os[flag]) return;
            os[flag] = true;
            if (alertsOn) { self.createToast({title:title, text:text}); self._beep("trail"); }
            if (telegramOn && tgToken && tgChatId)
                self._sendTelegram(tgToken, tgChatId, title);
        };

        fire(profitPips >= 10, "alert10",
            "✅ +10 PIPS — Move to Breakeven | " + instrument,
            "+" + pp + "p  |  Move stop to entry  |  Risk = ZERO  |  " + timeframe);
        fire(profitPips >= 15, "alert15",
            "⚡ +15 PIPS — Start Trailing | " + instrument,
            "+" + pp + "p  |  Trail 10p behind price  |  " + timeframe);
        fire(profitPips >= 20, "alert20",
            "🚀 +20 PIPS — Close 50% | " + instrument,
            "+" + pp + "p  |  Close half  |  Trail rest 15p behind  |  " + timeframe);
        fire(profitPips >= 30, "alert30",
            "💰 +30 PIPS — Trail Tight | " + instrument,
            "+" + pp + "p  |  Trail 15p  |  Only exit when trail hit  |  " + timeframe);

        if (profitPips < -5 && barDate !== this.$alertedClose) {
            this.$alertedClose = barDate;
            if (alertsOn) {
                this.createToast({
                    title: "🔔 EXIT NOW — " + instrument,
                    text:  "Zone broken  |  " + pp + "p  |  " + timeframe
                });
                this._beep("close_warn");
            }
            if (telegramOn && tgToken && tgChatId)
                this._sendTelegram(tgToken, tgChatId,
                    "🔔 EXIT | " + instrument + " | " + pp + "p");
            this.$openSignal = null;
        }
    }

    _beep(type) {
        try {
            var ctx = new (AudioContext || webkitAudioContext)();
            var now = ctx.currentTime;
            var p = function(f,s,d) {
                var o=ctx.createOscillator(), g=ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type="sine"; o.frequency.value=f;
                g.gain.setValueAtTime(0.28,now+s);
                g.gain.exponentialRampToValueAtTime(0.001,now+s+d);
                o.start(now+s); o.stop(now+s+d+0.01);
            };
            if (type==="buy")        { p(528,0,0.15); p(660,0.14,0.20); }
            if (type==="sell")       { p(660,0,0.15); p(528,0.14,0.20); }
            if (type==="trail")      { p(660,0,0.10); p(880,0.08,0.10); p(660,0.20,0.10); p(880,0.28,0.15); }
            if (type==="close_warn") { p(440,0,0.12); p(330,0.15,0.20); }
        } catch(e) {}
    }

    _sendTelegram(token, chatId, message) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST","https://api.telegram.org/bot"
                +encodeURIComponent(token)+"/sendMessage",true);
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(JSON.stringify({chat_id:chatId,text:message,parse_mode:"HTML"}));
        } catch(e) {}
    }
}
