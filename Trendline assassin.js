/* ================================================================
   Liquid Charts Pro — Index Pro (Trendline Signals)
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode: UDI
   5. Click ADD

   ── HOW IT WORKS ──────────────────────────────────────────
   Automatically draws support and resistance trendlines
   from recent swing points.

   BUY signal:
   • Price wick touches or enters the support trendline zone
   • Candle closes back up (bullish rejection)

   SELL signal:
   • Price wick touches or enters the resistance trendline zone
   • Candle closes back down (bearish rejection)
   • OR price closes back below resistance after a brief break

   ── MILESTONE ALERTS ─────────────────────────────────────
   +10 pts → Move stop to breakeven
   +15 pts → Start trailing
   +20 pts → Close 50%, trail rest
   +30 pts → Trail tight, let it run
   Trendline broken → EXIT

   ── ZERO REPAINTING ──────────────────────────────────────
   All signals locked to closed bars via cache.
   Live candle never evaluated.
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$signalCache  = {};
        this.$openSignal   = null;
        this.$alertedDate  = 0;
        this.$alertedClose = 0;
        this.$atr          = null;
        this.$touchedTLs   = {};

        return {
            caption:   "Index Pro",
            isOverlay: true,
            plots:     [],

            settingsFields: [
                // ── Trendline settings ────────────────────────
                {
                    id: "trendlineLookback",
                    caption: "Trendline lookback bars (100=bigger lines, 50=shorter)",
                    type: "int", defaultValue: 100, min: 20, max: 500
                },
                {
                    id: "swingStrength",
                    caption: "Swing strength (3=more swings, 6=major only)",
                    type: "int", defaultValue: 5, min: 2, max: 15
                },
                {
                    id: "touchZonePts",
                    caption: "Touch zone points (how close price must get to line)",
                    type: "int", defaultValue: 15, min: 5, max: 500
                },
                // ── Signal filters ────────────────────────────
                {
                    id: "bodyMinPct",
                    caption: "Min candle body % (40=relaxed, 55=strict)",
                    type: "int", defaultValue: 50, min: 20, max: 70
                },
                {
                    id: "minBarsBetween",
                    caption: "Min bars between signals",
                    type: "int", defaultValue: 8, min: 1, max: 30
                },
                // ── Visual ────────────────────────────────────
                {
                    id: "showSupportTL",
                    caption: "Show Support Trendline",
                    type: "bool", defaultValue: true
                },
                {
                    id: "showResistTL",
                    caption: "Show Resistance Trendline",
                    type: "bool", defaultValue: true
                },
                {
                    id: "colorSupport",
                    caption: "Support line color",
                    type: "color", defaultValue: "#00dc78"
                },
                {
                    id: "colorResist",
                    caption: "Resistance line color",
                    type: "color", defaultValue: "#ff4040"
                },
                {
                    id: "lineWidth",
                    caption: "Line width",
                    type: "int", defaultValue: 2, min: 1, max: 4
                },
                {
                    id: "firstTouchOnly",
                    caption: "First touch of trendline only (no repeats at same level)",
                    type: "bool", defaultValue: true
                },
                {
                    id: "atrSizeFilter",
                    caption: "ATR size filter — candle must be meaningful size",
                    type: "bool", defaultValue: true
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
                    caption: "BUY arrow color",
                    type: "color", defaultValue: "#00e5ff"
                },
                {
                    id: "colorSell",
                    caption: "SELL arrow color",
                    type: "color", defaultValue: "#ff4081"
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
        this.$atr          = null;
        this.$touchedTLs   = {};
        this.removeAllDrawings();
    }

    _bool(v) {
        if (v === false || v === "false" || v === 0) return false;
        return true;
    }

    _barMs(bd, count) {
        if (count < 3) return 60000;
        var total = 0, n = Math.min(10, count - 1);
        for (var i = 0; i < n; i++) total += Math.abs(bd.date[i] - bd.date[i+1]);
        return (total / n) || 60000;
    }

    onCalculate(data, output) {
        var p             = data.parameters;
        var trendlineLB   = parseInt(p.trendlineLookback) || 100;
        var swingStr      = parseInt(p.swingStrength)     || 5;
        var touchPts      = parseInt(p.touchZonePts)      || 25;
        var bodyMin       = (parseInt(p.bodyMinPct) || 50) / 100;
        var minBars       = parseInt(p.minBarsBetween)    || 8;
        var firstTouchOnly= this._bool(p.firstTouchOnly !== undefined ? p.firstTouchOnly : true);
        var atrSizeFilter = this._bool(p.atrSizeFilter  !== undefined ? p.atrSizeFilter  : true);
        var showSupTL     = this._bool(p.showSupportTL  !== undefined ? p.showSupportTL : true);
        var showResTL     = this._bool(p.showResistTL   !== undefined ? p.showResistTL  : true);
        var colorSup      = p.colorSupport || "#00dc78";
        var colorRes      = p.colorResist  || "#ff4040";
        var lw            = parseInt(p.lineWidth) || 2;
        var showBuys      = this._bool(p.showBuys);
        var showSells     = this._bool(p.showSells);
        var colorBuy      = p.colorBuy  || "#00e5ff";
        var colorSell     = p.colorSell || "#ff4081";
        var lblBuy        = (p.labelBuy  || "BUY").trim();
        var lblSell       = (p.labelSell || "SELL").trim();
        var alertsOn      = this._bool(p.alertsOn);
        var telegramOn    = this._bool(p.telegramOn);
        var tgToken       = (p.tgToken  || "").trim();
        var tgChatId      = (p.tgChatId || "").trim();
        var instrument    = data.context.instrument.name;
        var timeframe     = data.context.timeframe || "";
        var pipSize       = data.context.instrument.pipSize || 0.01;
        var count         = data.valueCount;
        var bd            = data.barData;

        if (count < trendlineLB + swingStr + 5) return;

        // Build ATR for size filter
        if (!this.$atr) this.$atr = new FXB.ta.ATR({period: 14});
        if (data.currentBarUpdateOnly) {
            this.$atr.UpdateCurrent(data);
        } else {
            this.$atr.LoadData(data);
        }
        var atrArr = this.$atr.GetValueArray();

        // Live bar — milestones only
        if (data.currentBarUpdateOnly) {
            if (this.$openSignal) {
                this._milestones(bd.close[0], bd.date[0], pipSize,
                    alertsOn, telegramOn, tgToken, tgChatId, instrument, timeframe);
            }
            return;
        }

        this.removeAllDrawings();
        this.$touchedTLs = {};   // reset each full recalc
        var drawings   = [];
        var lastSigBar = -999;

        // ── Replay cached signals ──────────────────────────────
        for (var dk in this.$signalCache) {
            var cs = this.$signalCache[dk];
            if (!cs) continue;
            if (cs.dir === "buy"  && !showBuys)  continue;
            if (cs.dir === "sell" && !showSells) continue;
            var isBuyC = cs.dir === "buy";
            drawings.push(this._arrow(parseInt(dk), cs.price, isBuyC,
                isBuyC ? "▲ " + lblBuy : "▼ " + lblSell,
                isBuyC ? colorBuy : colorSell));
            if (cs.barIdx > lastSigBar) lastSigBar = cs.barIdx;
        }

        // ── Find swing highs and lows ──────────────────────────
        var tlScan = Math.min(trendlineLB + swingStr, count - swingStr - 1);
        var swingH = [], swingL = [];

        for (var si = swingStr; si <= tlScan; si++) {
            var isH = true, isL = true;
            for (var sj = 1; sj <= swingStr; sj++) {
                if (si-sj < 0 || si+sj >= count) { isH = isL = false; break; }
                if (bd.high[si-sj] >= bd.high[si] || bd.high[si+sj] >= bd.high[si]) isH = false;
                if (bd.low[si-sj]  <= bd.low[si]  || bd.low[si+sj]  <= bd.low[si])  isL  = false;
            }
            if (isH) swingH.push({price: bd.high[si], idx: si, date: bd.date[si]});
            if (isL) swingL.push({price: bd.low[si],  idx: si, date: bd.date[si]});
        }

        swingH.sort(function(a,b){ return a.idx - b.idx; });
        swingL.sort(function(a,b){ return a.idx - b.idx; });

        var barMs = this._barMs(bd, count);

        // ── Build trendlines ───────────────────────────────────
        var bullTL = null, bearTL = null;

        if (swingL.length >= 2) {
            var l1 = swingL[0], l2 = swingL[1];
            bullTL = {
                slope:     (l1.price - l2.price) / (l2.idx - l1.idx),
                basePrice: l1.price,
                baseIdx:   l1.idx
            };
            if (showSupTL) {
                var futureDate  = bd.date[0] + (40 * barMs);
                var futurePrice = l1.price + bullTL.slope * l1.idx;
                drawings.push({
                    type: "lineSegment", unselectable: true,
                    points: [
                        {date: bd.date[Math.min(l2.idx, count-1)], value: l2.price},
                        {date: futureDate, value: futurePrice}
                    ],
                    text: "Support", textPosition: "right",
                    style: {
                        line: {color: colorSup, width: lw, lineStyle: "solid"},
                        text: {color: colorSup, fontsize: 9}
                    }
                });
            }
        }

        if (swingH.length >= 2) {
            var h1 = swingH[0], h2 = swingH[1];
            bearTL = {
                slope:     (h1.price - h2.price) / (h2.idx - h1.idx),
                basePrice: h1.price,
                baseIdx:   h1.idx
            };
            if (showResTL) {
                var futureDateH  = bd.date[0] + (40 * barMs);
                var futurePriceH = h1.price + bearTL.slope * h1.idx;
                drawings.push({
                    type: "lineSegment", unselectable: true,
                    points: [
                        {date: bd.date[Math.min(h2.idx, count-1)], value: h2.price},
                        {date: futureDateH, value: futurePriceH}
                    ],
                    text: "Resist", textPosition: "right",
                    style: {
                        line: {color: colorRes, width: lw, lineStyle: "solid"},
                        text: {color: colorRes, fontsize: 9}
                    }
                });
            }
        }

        // ── Scan for signals ───────────────────────────────────
        var scanLimit = Math.min(trendlineLB, count - 2);
        var touchDist = touchPts * pipSize * 100; // convert to price units

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

            var body      = Math.abs(close - open);
            var bodyRatio = range > 0 ? body / range : 0;

            var atrV = atrArr ? atrArr[i] : null;

            // ATR size filter — skip tiny indecision bars
            if (atrSizeFilter && atrV && range < atrV * 0.45) {
                this.$signalCache[dateStr] = null; continue;
            }

            var signalType = null;

            // ── BUY: touch support trendline + bullish close ───
            if (showBuys && bullTL) {
                var bSupport = bullTL.baseIdx - i;
                var tlSup    = bullTL.basePrice + (bullTL.slope * bSupport);

                // Wick touched the support zone
                var touchedSupport = low <= tlSup + touchDist;
                // Closed back above (not below) — bullish rejection
                var closedAbove    = close > tlSup - touchDist;
                // Bullish candle — closed up
                var bullClose      = close > open;
                // Body conviction
                var bodyOk         = bodyRatio >= bodyMin;
                // Close in upper portion of bar
                var closeHigh      = range > 0 && (close - low) / range >= 0.45;

                if (touchedSupport && closedAbove && bullClose && bodyOk && closeHigh) {
                    signalType = "buy";
                }
            }

            // ── SELL: touch resistance trendline + bearish close
            if (!signalType && showSells && bearTL) {
                var bResist = bearTL.baseIdx - i;
                var tlRes   = bearTL.basePrice + (bearTL.slope * bResist);

                // Wick touched the resistance zone
                var touchedResist  = high >= tlRes - touchDist;
                // Closed back below — bearish rejection
                var closedBelow    = close < tlRes + touchDist;
                // Bearish candle
                var bearClose      = close < open;
                // Body conviction
                var bodyOkS        = bodyRatio >= bodyMin;
                // Close in lower portion
                var closeLow       = range > 0 && (high - close) / range >= 0.45;

                if (touchedResist && closedBelow && bearClose && bodyOkS && closeLow) {
                    signalType = "sell";
                }
            }

            if (!signalType) {
                this.$signalCache[dateStr] = null; continue;
            }

            var isBuy = signalType === "buy";

            // First touch only — each trendline zone fires once per session
            if (firstTouchOnly) {
                var tlKey = isBuy ? "sup_" + Math.round(bullTL.basePrice) : "res_" + Math.round(bearTL.basePrice);
                if (this.$touchedTLs[tlKey]) {
                    this.$signalCache[dateStr] = null; continue;
                }
                this.$touchedTLs[tlKey] = true;
            }

            // Lock permanently
            this.$signalCache[dateStr] = {
                dir:    signalType,
                price:  isBuy ? low : high,
                tlRef:  isBuy
                    ? (bullTL ? bullTL.basePrice + bullTL.slope * (bullTL.baseIdx - i) : 0)
                    : (bearTL ? bearTL.basePrice + bearTL.slope * (bearTL.baseIdx - i) : 0),
                barIdx: i
            };
            lastSigBar = i;

            var lbl = isBuy ? "▲ " + lblBuy : "▼ " + lblSell;
            drawings.push(this._arrow(barDate, isBuy ? low : high, isBuy, lbl,
                isBuy ? colorBuy : colorSell));

            // Alert on bar[1]
            if (i === 1 && barDate !== this.$alertedDate) {
                this.$alertedDate  = barDate;
                this.$alertedClose = 0;
                this.$openSignal   = {
                    dir:        signalType,
                    entryPrice: close,
                    tlRef:      this.$signalCache[dateStr].tlRef,
                    alert10: false, alert15: false,
                    alert20: false, alert30: false
                };

                var title = (isBuy ? "▲ BUY" : "▼ SELL") + " — " + instrument;
                var msg   = (isBuy ? "Support trendline touch" : "Resistance trendline touch")
                          + "  |  " + timeframe;

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
        var c = color || (isBuy ? "#00e5ff" : "#ff4081");
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
            "✅ +" + pp + " — Move to Breakeven | " + instrument,
            "Move stop to entry  |  Risk = ZERO  |  " + timeframe, "trail");
        fire(pp >= 15, "alert15",
            "⚡ +" + pp + " — Start Trailing | " + instrument,
            "Trail stop behind price  |  " + timeframe, "trail");
        fire(pp >= 20, "alert20",
            "🚀 +" + pp + " — Close 50% | " + instrument,
            "Close half  |  Trail the rest  |  " + timeframe, "trail");
        fire(pp >= 30, "alert30",
            "💰 +" + pp + " — Trail Tight | " + instrument,
            "Strong move  |  Trail tight  |  " + timeframe, "trail");

        // Exit: price breaks through the trendline
        var exitNow = false;
        if (os.dir === "buy"  && close < os.tlRef - (os.entryPrice * 0.0005)) exitNow = true;
        if (os.dir === "sell" && close > os.tlRef + (os.entryPrice * 0.0005)) exitNow = true;

        if (exitNow && barDate !== this.$alertedClose) {
            this.$alertedClose = barDate;
            var msg2 = pp >= 10 ? "+" + pp + " — trendline broken, protect profit"
                     : pp > 0  ? "+" + pp + " — consider closing"
                     : pp + " — trendline broken, exit now";
            if (alertsOn) {
                this.createToast({
                    title: "🔔 EXIT — Trendline Broken | " + instrument,
                    text:  msg2 + "  |  " + timeframe
                });
                this._beep("close_warn");
            }
            if (telegramOn && tgToken && tgChatId)
                this._sendTelegram(tgToken, tgChatId,
                    "🔔 EXIT | " + instrument + " | " + msg2);
            this.$openSignal = null;
        }
    }

    _beep(type) {
        try {
            var ctx = new (AudioContext || webkitAudioContext)();
            var now = ctx.currentTime;
            var t = function(f,s,d) {
                var o=ctx.createOscillator(),g=ctx.createGain();
                o.connect(g);g.connect(ctx.destination);
                o.type="sine";o.frequency.value=f;
                g.gain.setValueAtTime(0.28,now+s);
                g.gain.exponentialRampToValueAtTime(0.001,now+s+d);
                o.start(now+s);o.stop(now+s+d+0.01);
            };
            if (type==="buy")        {t(528,0,0.15);t(660,0.14,0.20);}
            if (type==="sell")       {t(660,0,0.15);t(528,0.14,0.20);}
            if (type==="trail")      {t(660,0,0.10);t(880,0.08,0.10);t(660,0.20,0.10);t(880,0.28,0.15);}
            if (type==="close_warn") {t(440,0,0.12);t(330,0.15,0.20);}
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