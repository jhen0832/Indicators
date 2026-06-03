/* ================================================================
   Liquid Charts Pro — Trend Confirmation Signals v2
   ================================================================
   INSTALL:
   1. Go to pro.liquidcharts.com and open any chart
   2. Click Indicators → Advanced → Add UDI
   3. Paste this entire file into the Code tab
   4. Set Mode:           UDI  (no Framework needed)
   5. Set Trading action: None
   6. Click ADD

   SIGNAL TIMING:
   Arrow fires the INSTANT a signal candle closes (1-bar lag).
   Enter on the very next candle's open. Zero repainting.

   BUY SIGNAL — all must be true:
     1. Fast EMA > Slow EMA              (bullish trend)
     2. Close > Fast EMA                 (price above trend)
     3. Bullish candle (close > open)
     4. Close in upper 60% of bar range
     5. RSI 40–72
     6. Previous bar was pullback or inside bar

   SELL SIGNAL — mirror for bearish.
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$signalCache = {};  // key=barDate → "buy"|"sell"|null
        this.$lastSignal  = null;
        this.$alertedDate = 0;
        this.$fastEMA     = null;
        this.$slowEMA     = null;
        this.$rsi         = null;

        return {
            caption:   "Trend Confirmation Signals",
            isOverlay: true,
            plots: [
                {type:"line", caption:"Fast EMA", color:"rgba(80,200,255,0.75)", lineWidth:1},
                {type:"line", caption:"Slow EMA", color:"rgba(255,165,40,0.65)",  lineWidth:1}
            ],
            settingsFields: [
                {id:"fastPeriod",    caption:"Fast EMA Period",    type:"int",   defaultValue:9,  min:2, max:100},
                {id:"slowPeriod",    caption:"Slow EMA Period",    type:"int",   defaultValue:21, min:3, max:300},
                {id:"rsiPeriod",     caption:"RSI Period",         type:"int",   defaultValue:14, min:2, max:100},
                {id:"buyColor",      caption:"Buy Arrow Color",    type:"color", defaultValue:"#00e676"},
                {id:"sellColor",     caption:"Sell Arrow Color",   type:"color", defaultValue:"#ff5252"},
                {id:"suppressConsec",caption:"Suppress Consecutive Same-Direction Signals",
                                                                   type:"bool",  defaultValue:true},
                {id:"showArrows",    caption:"Show Arrows on Chart",              type:"bool", defaultValue:true},
                {id:"showMarkers",   caption:"Show Signal Lines at Chart Bottom", type:"bool", defaultValue:false},
                {id:"alertsOn",      caption:"Enable Alerts (popup + sound)",     type:"bool", defaultValue:true},
                {id:"telegramOn",    caption:"Enable Telegram Alerts",            type:"bool", defaultValue:false},
                {id:"telegramToken", caption:"Telegram Bot Token",  type:"text", defaultValue:""},
                {id:"telegramChatId",caption:"Telegram Chat ID",    type:"text", defaultValue:""}
            ]
        };
    }

    onContextChange(data)   { this._reset(); }
    onParameterChange(data) { this._reset(); }

    _reset() {
        this.$signalCache = {};
        this.$lastSignal  = null;
        this.$alertedDate = 0;
        this.$fastEMA     = null;
        this.$slowEMA     = null;
        this.$rsi         = null;
        this.removeAllDrawings();
        this.removeAllEventMarkers();
        this.removeAllBarHighlights();
    }

    _bool(v) {
        if (v === true  || v === "true"  || v === "yes" || v === 1) return true;
        if (v === false || v === "false" || v === "no"  || v === 0) return false;
        return !!v;
    }

    onCalculate(data, output) {
        var p          = data.parameters;
        var fastPeriod = parseInt(p.fastPeriod)  || 9;
        var slowPeriod = parseInt(p.slowPeriod)  || 21;
        var rsiPeriod  = parseInt(p.rsiPeriod)   || 14;
        var buyColor   = p.buyColor   || "#00e676";
        var sellColor  = p.sellColor  || "#ff5252";
        var alertsOn   = this._bool(p.alertsOn);
        var suppress   = this._bool(p.suppressConsec);
        var showArrows = this._bool(p.showArrows);
        var showMarkers= this._bool(p.showMarkers);
        var telegramOn = this._bool(p.telegramOn);
        var tgToken    = (p.telegramToken  || "").trim();
        var tgChatId   = (p.telegramChatId || "").trim();
        var instrument = data.context.instrument.name;
        var timeframe  = data.context.timeframe || "";
        var count      = data.valueCount;
        var minBars    = Math.max(slowPeriod, rsiPeriod) + 5;

        if (count < minBars) return;

        if (!this.$fastEMA) this.$fastEMA = new FXB.ta.EMA({period: fastPeriod});
        if (!this.$slowEMA) this.$slowEMA = new FXB.ta.EMA({period: slowPeriod});
        if (!this.$rsi)     this.$rsi     = new FXB.ta.RSI({period: rsiPeriod});

        // ── LIVE BAR: update indicators + return, no redraw ───
        if (data.currentBarUpdateOnly) {
            this.$fastEMA.UpdateCurrent(data);
            this.$slowEMA.UpdateCurrent(data);
            this.$rsi.UpdateCurrent(data);
            output.values[0] = this.$fastEMA.GetValueArray();
            output.values[1] = this.$slowEMA.GetValueArray();
            return; // no redraw — zero blinking
        }

        // ── CLOSED BAR: full load ─────────────────────────────
        this.$fastEMA.LoadData(data);
        this.$slowEMA.LoadData(data);
        this.$rsi.LoadData(data);

        output.values[0] = this.$fastEMA.GetValueArray();
        output.values[1] = this.$slowEMA.GetValueArray();

        var fastArr = this.$fastEMA.GetValueArray();
        var slowArr = this.$slowEMA.GetValueArray();
        var rsiArr  = this.$rsi.GetValueArray();
        var bd      = data.barData;

        var newDrawings = [];
        var newMarkers  = [];
        var scanLimit   = Math.min(700, count - 2);

        for (var i = 1; i <= scanLimit; i++) {
            var barDate = bd.date[i];
            var key     = String(barDate);

            // Redraw cached signals (direction settings may have changed)
            if (this.$signalCache[key] !== undefined) {
                var cached = this.$signalCache[key];
                if (cached === "buy" && showArrows) {
                    newDrawings.push({
                        type:"barMarker", points:[{date:barDate, value:bd.low[i]}],
                        iconColor:buyColor, icon:"f0aa", iconSize:20, markerOffset:26,
                        text:"BUY", textAboveLine:false,
                        style:{text:{color:buyColor, fontsize:11}}
                    });
                }
                if (cached === "sell" && showArrows) {
                    newDrawings.push({
                        type:"barMarker", points:[{date:barDate, value:bd.high[i]}],
                        iconColor:sellColor, icon:"f0ab", iconSize:20, markerOffset:-26,
                        text:"SELL", textAboveLine:true,
                        style:{text:{color:sellColor, fontsize:11}}
                    });
                }
                continue;
            }

            // Skip if not enough lookback
            if (i + 1 >= count) { this.$signalCache[key] = null; continue; }

            var open  = bd.open[i];
            var high  = bd.high[i];
            var low   = bd.low[i];
            var close = bd.close[i];
            var range = high - low;
            if (range === 0) { this.$signalCache[key] = null; continue; }

            var fastVal = fastArr[i];
            var slowVal = slowArr[i];
            var rsiVal  = rsiArr[i];
            if (!fastVal || !slowVal || !rsiVal) { this.$signalCache[key] = null; continue; }

            var prevOpen  = bd.open[i+1];
            var prevHigh  = bd.high[i+1];
            var prevLow   = bd.low[i+1];
            var prevClose = bd.close[i+1];

            var prevInsideBar = false;
            if (i + 2 < count) {
                prevInsideBar = prevHigh <= bd.high[i+2] && prevLow >= bd.low[i+2];
            }
            var prevBearPullback = prevClose < prevOpen;
            var prevBullPullback = prevClose > prevOpen;

            var isBuy = fastVal > slowVal &&
                        close   > fastVal &&
                        close   > open    &&
                        (close - low)  / range >= 0.60 &&
                        rsiVal >= 40 && rsiVal <= 72   &&
                        (prevBearPullback || prevInsideBar);

            var isSell = fastVal < slowVal &&
                         close   < fastVal &&
                         close   < open    &&
                         (high - close) / range >= 0.60 &&
                         rsiVal >= 28 && rsiVal <= 60   &&
                         (prevBullPullback || prevInsideBar);

            if (suppress) {
                if (isBuy  && this.$lastSignal === "buy")  isBuy  = false;
                if (isSell && this.$lastSignal === "sell") isSell = false;
            }

            if (!isBuy && !isSell) { this.$signalCache[key] = null; continue; }

            var dir = isBuy ? "buy" : "sell";
            this.$signalCache[key] = dir;
            this.$lastSignal       = dir;

            if (isBuy) {
                if (showArrows) {
                    newDrawings.push({
                        type:"barMarker", points:[{date:barDate, value:low}],
                        iconColor:buyColor, icon:"f0aa", iconSize:20, markerOffset:26,
                        text:"BUY", textAboveLine:false,
                        style:{text:{color:buyColor, fontsize:11}}
                    });
                }
                this.createBarHighlight({date:barDate, color:"rgba(0,230,118,0.20)"});
                if (showMarkers) {
                    newMarkers.push({date:barDate, color:buyColor, icon:"f0aa",
                        text:"BUY — "+instrument});
                }
                if (i === 1 && barDate !== this.$alertedDate) {
                    this.$alertedDate = barDate;
                    if (alertsOn) {
                        this.createToast({
                            title: "▲ BUY Signal — " + instrument,
                            text:  timeframe + " | Entry next candle open | " + close.toFixed(5)
                        });
                        this._playBeep("buy");
                    }
                    if (telegramOn && tgToken && tgChatId) {
                        this._sendTelegram(tgToken, tgChatId,
                            "▲ BUY | "+instrument+" | "+timeframe+" | "+close.toFixed(5));
                    }
                }
            }

            if (isSell) {
                if (showArrows) {
                    newDrawings.push({
                        type:"barMarker", points:[{date:barDate, value:high}],
                        iconColor:sellColor, icon:"f0ab", iconSize:20, markerOffset:-26,
                        text:"SELL", textAboveLine:true,
                        style:{text:{color:sellColor, fontsize:11}}
                    });
                }
                this.createBarHighlight({date:barDate, color:"rgba(255,82,82,0.20)"});
                if (showMarkers) {
                    newMarkers.push({date:barDate, color:sellColor, icon:"f0ab",
                        text:"SELL — "+instrument});
                }
                if (i === 1 && barDate !== this.$alertedDate) {
                    this.$alertedDate = barDate;
                    if (alertsOn) {
                        this.createToast({
                            title: "▼ SELL Signal — " + instrument,
                            text:  timeframe + " | Entry next candle open | " + close.toFixed(5)
                        });
                        this._playBeep("sell");
                    }
                    if (telegramOn && tgToken && tgChatId) {
                        this._sendTelegram(tgToken, tgChatId,
                            "▼ SELL | "+instrument+" | "+timeframe+" | "+close.toFixed(5));
                    }
                }
            }
        }

        if (newDrawings.length) this.createDrawing(newDrawings);
        if (newMarkers.length)  this.createEventMarker(newMarkers);
    }

    _sendTelegram(token, chatId, message) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST","https://api.telegram.org/bot"
                +encodeURIComponent(token)+"/sendMessage",true);
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(JSON.stringify({chat_id:chatId, text:message, parse_mode:"HTML"}));
        } catch(e) {}
    }

    _playBeep(direction) {
        try {
            var ctx   = new (AudioContext || webkitAudioContext)();
            var now   = ctx.currentTime;
            var freq1 = direction === "buy" ? 660 : 880;
            var freq2 = direction === "buy" ? 880 : 660;
            var osc1  = ctx.createOscillator(), g1 = ctx.createGain();
            osc1.connect(g1); g1.connect(ctx.destination);
            osc1.type = "sine"; osc1.frequency.value = freq1;
            g1.gain.setValueAtTime(0.35, now);
            g1.gain.exponentialRampToValueAtTime(0.001, now+0.20);
            osc1.start(now); osc1.stop(now+0.20);
            var osc2  = ctx.createOscillator(), g2 = ctx.createGain();
            osc2.connect(g2); g2.connect(ctx.destination);
            osc2.type = "sine"; osc2.frequency.value = freq2;
            g2.gain.setValueAtTime(0.35, now+0.18);
            g2.gain.exponentialRampToValueAtTime(0.001, now+0.38);
            osc2.start(now+0.18); osc2.stop(now+0.38);
        } catch(e) {}
    }
}
