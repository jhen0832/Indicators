/* ================================================================
   Liquid Charts Pro — Overkill scalper
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode: UDI
   5. Click ADD

   ── HOW IT WORKS ──────────────────────────────────────────────
   Three EMA ribbon (5/13/34) — all must be stacked and pointing
   in the same direction. Price pulls back to the mid EMA (13)
   and a momentum candle fires = signal.

   ── BEST ON ────────────────────────────────────────────────────
   M1  — Ultra fast scalps
   M5  — Primary scalping timeframe
   M15 — Swing scalps
   H1  — Day trade entries

   ── MILESTONE ALERTS ───────────────────────────────────────────
   +10 pips → Move stop to breakeven
   +15 pips → Start trailing
   +20 pips → Close 50%, trail rest
   +30 pips → Trail tight, let it run
   -8  pips → EXIT — cut the loss
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$signalCache  = {};
        this.$openSignal   = null;
        this.$alertedDate  = 0;
        this.$alertedClose = 0;
        this.$emaFast      = null;
        this.$emaMid       = null;
        this.$emaSlow      = null;
        this.$atr          = null;

        return {
            caption:   "Overkill Scalper",
            isOverlay: true,
            plots:     [],

            settingsFields: [
                // ── EMA settings ──────────────────────────────
                {
                    id: "fastLen",
                    caption: "Fast EMA period",
                    type: "int", defaultValue: 5, min: 2, max: 50
                },
                {
                    id: "midLen",
                    caption: "Mid EMA period (pullback level)",
                    type: "int", defaultValue: 13, min: 5, max: 100
                },
                {
                    id: "slowLen",
                    caption: "Slow EMA period",
                    type: "int", defaultValue: 34, min: 10, max: 300
                },
                // ── Signal filters ────────────────────────────
                {
                    id: "atrMult",
                    caption: "Min candle size ATR multiplier (0.5=default)",
                    type: "float", defaultValue: 0.2, min: 0.1, max: 3.0
                },
                {
                    id: "minBars",
                    caption: "Min bars between signals",
                    type: "int", defaultValue: 1, min: 1, max: 50
                },
                // ── Direction ─────────────────────────────────
                {
                    id: "showBuys",
                    caption: "Show BUY signals",
                    type: "bool", defaultValue: true
                },
                {
                    id: "showSells",
                    caption: "Show SELL signals",
                    type: "bool", defaultValue: true
                },
                // ── Colors ────────────────────────────────────
                {
                    id: "colorBuy",
                    caption: "BUY signal color",
                    type: "color", defaultValue: "#00dcdc"
                },
                {
                    id: "colorSell",
                    caption: "SELL signal color",
                    type: "color", defaultValue: "#ff3333"
                },
                // ── Labels ────────────────────────────────────
                {
                    id: "labelBuy",
                    caption: "BUY label",
                    type: "text", defaultValue: "BUY"
                },
                {
                    id: "labelSell",
                    caption: "SELL label",
                    type: "text", defaultValue: "SELL"
                },
                // ── Alerts ────────────────────────────────────
                {
                    id: "alertsOn",
                    caption: "Enable alerts (popup + sound)",
                    type: "bool", defaultValue: true
                },
                {
                    id: "telegramOn",
                    caption: "Enable Telegram alerts",
                    type: "bool", defaultValue: false
                },
                {
                    id: "tgToken",
                    caption: "Telegram Bot Token",
                    type: "text", defaultValue: ""
                },
                {
                    id: "tgChatId",
                    caption: "Telegram Chat ID",
                    type: "text", defaultValue: ""
                }
            ]
        };
    }

    onContextChange(data)   { this._reset(); }
    onParameterChange(data) { this._reset(); }

    _reset() {
        this.$signalCache  = {};
        this.$openSignal   = null;
        this.$alertedDate  = 0;
        this.$alertedClose = 0;
        this.$emaFast      = null;
        this.$emaMid       = null;
        this.$emaSlow      = null;
        this.$atr          = null;
        this.removeAllDrawings();
    }

    _bool(v) {
        if (v === false || v === "false" || v === 0) return false;
        return true;
    }

    onCalculate(data, output) {
        var p          = data.parameters;
        var fastLen    = parseInt(p.fastLen)   || 5;
        var midLen     = parseInt(p.midLen)    || 13;
        var slowLen    = parseInt(p.slowLen)   || 34;
        var atrMult    = parseFloat(p.atrMult) || 0.5;
        var minBars    = parseInt(p.minBars)   || 3;
        var showBuys   = this._bool(p.showBuys);
        var showSells  = this._bool(p.showSells);
        var colorBuy   = p.colorBuy  || "#00dcdc";
        var colorSell  = p.colorSell || "#ff3333";
        var lblBuy     = (p.labelBuy  || "BUY").trim();
        var lblSell    = (p.labelSell || "SELL").trim();
        var alertsOn   = this._bool(p.alertsOn);
        var telegramOn = this._bool(p.telegramOn);
        var tgToken    = (p.tgToken  || "").trim();
        var tgChatId   = (p.tgChatId || "").trim();
        var instrument = data.context.instrument.name;
        var timeframe  = data.context.timeframe || "";
        var pipSize    = data.context.instrument.pipSize || 0.0001;
        var count      = data.valueCount;
        var bd         = data.barData;

        if (count < 50) return;

        // ── Build EMAs and ATR ─────────────────────────────────
        if (!this.$emaFast) this.$emaFast = new FXB.ta.EMA({period: fastLen});
        if (!this.$emaMid)  this.$emaMid  = new FXB.ta.EMA({period: midLen});
        if (!this.$emaSlow) this.$emaSlow = new FXB.ta.EMA({period: slowLen});
        if (!this.$atr)     this.$atr     = new FXB.ta.ATR({period: 14});

        if (data.currentBarUpdateOnly) {
            this.$emaFast.UpdateCurrent(data);
            this.$emaMid.UpdateCurrent(data);
            this.$emaSlow.UpdateCurrent(data);
            this.$atr.UpdateCurrent(data);
            // Live bar — milestones only
            if (this.$openSignal) {
                this._milestones(bd.close[0], bd.date[0], pipSize,
                    alertsOn, telegramOn, tgToken, tgChatId, instrument, timeframe);
            }
            return;
        }

        this.$emaFast.LoadData(data);
        this.$emaMid.LoadData(data);
        this.$emaSlow.LoadData(data);
        this.$atr.LoadData(data);

        var fastArr = this.$emaFast.GetValueArray();
        var midArr  = this.$emaMid.GetValueArray();
        var slowArr = this.$emaSlow.GetValueArray();
        var atrArr  = this.$atr.GetValueArray();

        // ── Redraw ─────────────────────────────────────────────
        this.removeAllDrawings();
        var drawings   = [];
        var lastSigBar = -999;

        // Replay cached signals
        for (var dk in this.$signalCache) {
            var cs = this.$signalCache[dk];
            if (!cs) continue;
            if (cs.dir === "buy"  && !showBuys)  continue;
            if (cs.dir === "sell" && !showSells) continue;
            var isBuyC = cs.dir === "buy";
            drawings.push(this._arrow(
                parseInt(dk), cs.price, isBuyC,
                isBuyC ? "▲ " + lblBuy : "▼ " + lblSell,
                isBuyC ? colorBuy : colorSell
            ));
            if (cs.barIdx > lastSigBar) lastSigBar = cs.barIdx;
        }

        // ── Scan closed bars ───────────────────────────────────
        var scanLimit = Math.min(700, count - 4);

        for (var i = 1; i <= scanLimit; i++) {
            var barDate = bd.date[i];
            var dateStr = String(barDate);

            if (this.$signalCache[dateStr] !== undefined) continue;
            if (Math.abs(i - lastSigBar) < minBars) {
                this.$signalCache[dateStr] = null; continue;
            }

            var open  = bd.open[i];
            var high  = bd.high[i];
            var low   = bd.low[i];
            var close = bd.close[i];
            var range = high - low;
            if (range === 0) { this.$signalCache[dateStr] = null; continue; }

            var fast  = fastArr ? fastArr[i]   : null;
            var mid   = midArr  ? midArr[i]    : null;
            var slow  = slowArr ? slowArr[i]   : null;
            var atrV  = atrArr  ? atrArr[i]    : range;

            // Need previous bars for direction check
            var fast2 = fastArr ? fastArr[i+2] : null;
            var mid2  = midArr  ? midArr[i+2]  : null;
            var slow2 = slowArr ? slowArr[i+2] : null;

            if (!fast || !mid || !slow || !fast2 || !mid2 || !slow2) {
                this.$signalCache[dateStr] = null; continue;
            }

            // Min candle size
            if (atrV && range < atrV * atrMult) {
                this.$signalCache[dateStr] = null; continue;
            }

            // ── Trend: EMA stack + direction ───────────────────
            var bullStack = fast > mid && mid > slow;
            var bearStack = fast < mid && mid < slow;

            var fastRising  = fast > fast2;
            var midRising   = mid  > mid2;
            var slowRising  = slow > slow2;
            var fastFalling = fast < fast2;
            var midFalling  = mid  < mid2;
            var slowFalling = slow < slow2;

            var bullTrend = bullStack && fastRising  && midRising;
            var bearTrend = bearStack && fastFalling && midFalling;

            // ── Pullback: touched mid EMA recently ────────────
            var mid1 = midArr[i+1];
            var mid3 = midArr[i+3];
            var touchedMidBull = (bd.low[i+1] <= (mid1 || mid) * 1.001) ||
                                 (bd.low[i+2] <= (midArr[i+2] || mid) * 1.001) ||
                                 (bd.low[i+3] <= (mid3 || mid) * 1.001);
            var touchedMidBear = (bd.high[i+1] >= (mid1 || mid) * 0.999) ||
                                 (bd.high[i+2] >= (midArr[i+2] || mid) * 0.999) ||
                                 (bd.high[i+3] >= (mid3 || mid) * 0.999);

            var nearMidBull = low  <= mid * 1.006 && close >= mid * 0.998;
            var nearMidBear = high >= mid * 0.994 && close <= mid * 1.002;

            // ── Momentum candle ────────────────────────────────
            var bullMomentum = close > open &&
                               (close - low)  / range >= 0.45 &&
                               close > fast;
            var bearMomentum = close < open &&
                               (high - close) / range >= 0.45 &&
                               close < fast;

            var signalType = null;

            if (showBuys && bullTrend && bullMomentum &&
                (touchedMidBull || nearMidBull)) {
                signalType = "buy";
            }
            if (!signalType && showSells && bearTrend && bearMomentum &&
                (touchedMidBear || nearMidBear)) {
                signalType = "sell";
            }

            if (!signalType) {
                this.$signalCache[dateStr] = null; continue;
            }

            var isBuy = signalType === "buy";

            // Lock signal permanently
            this.$signalCache[dateStr] = {
                dir:    signalType,
                price:  isBuy ? low : high,
                close:  close,
                barIdx: i
            };
            lastSigBar = i;

            var lbl = isBuy ? "▲ " + lblBuy : "▼ " + lblSell;
            drawings.push(this._arrow(
                barDate, isBuy ? low : high,
                isBuy, lbl,
                isBuy ? colorBuy : colorSell
            ));

            // Alert on bar[1]
            if (i === 1 && barDate !== this.$alertedDate) {
                this.$alertedDate  = barDate;
                this.$alertedClose = 0;
                this.$openSignal   = {
                    dir:        signalType,
                    entryPrice: close,
                    alert10: false, alert15: false,
                    alert20: false, alert30: false
                };

                var title = (isBuy ? "▲ BUY" : "▼ SELL") + " — " + instrument;
                var msg   = "EMA pullback + momentum  |  " + timeframe
                          + "  |  " + close.toFixed(2);

                if (alertsOn) {
                    this.createToast({title: title, text: msg});
                    this._beep(isBuy ? "buy" : "sell");
                }
                if (telegramOn && tgToken && tgChatId) {
                    this._sendTelegram(tgToken, tgChatId, title + "\n" + msg);
                }
            }

            if (this.$openSignal && i === 1) {
                this._milestones(close, barDate, pipSize,
                    alertsOn, telegramOn, tgToken, tgChatId, instrument, timeframe);
            }
        }

        if (drawings.length) this.createDrawing(drawings);
    }

    _arrow(date, price, isBuy, label, color) {
        var c = color || (isBuy ? "#00dcdc" : "#ff3333");
        return {
            type:          "barMarker",
            points:        [{date: date, value: price}],
            iconColor:     c,
            icon:          isBuy ? "f0aa" : "f0ab",
            iconSize:      24,
            markerOffset:  isBuy ? 32 : -32,
            text:          label,
            textAboveLine: !isBuy,
            style:         {text: {color: c, fontsize: 11}}
        };
    }

    _milestones(close, barDate, pipSize, alertsOn, telegramOn,
                tgToken, tgChatId, instrument, timeframe) {
        if (!this.$openSignal) return;
        var os = this.$openSignal;
        var pp = Math.round(
            os.dir === "buy"
            ? (close - os.entryPrice) / pipSize
            : (os.entryPrice - close) / pipSize
        );

        var self = this;
        var fire = function(cond, flag, title, text, beep) {
            if (!cond || os[flag]) return;
            os[flag] = true;
            if (alertsOn) { self.createToast({title:title,text:text}); self._beep(beep); }
            if (telegramOn && tgToken && tgChatId)
                self._sendTelegram(tgToken, tgChatId, title + " | " + instrument);
        };

        fire(pp >= 10, "alert10",
            "✅ +" + pp + " PIPS — Move to Breakeven | " + instrument,
            "Move stop to entry  |  Risk = ZERO  |  " + timeframe, "trail");
        fire(pp >= 15, "alert15",
            "⚡ +" + pp + " PIPS — Start Trailing | " + instrument,
            "Trail stop 10 pips behind price  |  " + timeframe, "trail");
        fire(pp >= 20, "alert20",
            "🚀 +" + pp + " PIPS — Close 50% | " + instrument,
            "Close half now  |  Trail the rest  |  " + timeframe, "trail");
        fire(pp >= 30, "alert30",
            "💰 +" + pp + " PIPS — Trail Tight | " + instrument,
            "Strong move  |  Trail tight  |  " + timeframe, "trail");

        // Exit: -8 pips stop loss
        if (pp <= -8 && barDate !== this.$alertedClose) {
            this.$alertedClose = barDate;
            if (alertsOn) {
                this.createToast({
                    title: "🔔 EXIT — Cut the Loss | " + instrument,
                    text:  pp + " pips  |  Cut it now  |  " + timeframe
                });
                this._beep("close_warn");
            }
            if (telegramOn && tgToken && tgChatId)
                this._sendTelegram(tgToken, tgChatId,
                    "🔔 EXIT | " + instrument + " | " + pp + "p | Cut the loss");
            this.$openSignal = null;
        }
    }

    _beep(type) {
        try {
            var ctx = new (AudioContext || webkitAudioContext)();
            var now = ctx.currentTime;
            var t = function(f,s,d) {
                var o=ctx.createOscillator(), g=ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type="sine"; o.frequency.value=f;
                g.gain.setValueAtTime(0.28, now+s);
                g.gain.exponentialRampToValueAtTime(0.001, now+s+d);
                o.start(now+s); o.stop(now+s+d+0.01);
            };
            if (type==="buy")        { t(528,0,0.15); t(660,0.14,0.20); }
            if (type==="sell")       { t(660,0,0.15); t(528,0.14,0.20); }
            if (type==="trail")      { t(660,0,0.10); t(880,0.08,0.10); t(660,0.20,0.10); t(880,0.28,0.15); }
            if (type==="close_warn") { t(440,0,0.12); t(330,0.15,0.20); }
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