/* ================================================================
   Liquid Charts Pro — Support & Resistance Signals
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode: UDI
   5. Click ADD

   ── HOW IT WORKS ──────────────────────────────────────────
   Finds the most significant swing highs (resistance) and
   swing lows (support) from recent price action.

   A BUY signal fires when:
   • Price touches or enters a support zone
   • The candle REJECTS — closes back up (bullish candle)
   • Confirming a bounce off support

   A SELL signal fires when:
   • Price touches or enters a resistance zone
   • The candle REJECTS — closes back down (bearish candle)
   • Confirming a rejection at resistance

   ── MILESTONE ALERTS ──────────────────────────────────────
   +10 pips  → Move stop to BREAKEVEN
   +15 pips  → Start trailing 10 pips behind
   +20 pips  → Close 50%, trail the rest
   +30 pips  → Trail tight, let it run
   Reversal  → Price breaking back through zone — exit

================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$alertedDate  = 0;
        this.$alertedClose = 0;
        this.$openSignal   = null;
        this.$lastSigBar   = -999;
        this.$lastSigPrice = null;
        this.$touchedZones = {};
        this.$ema200 = null;

        return {
            caption:   "S&R Signals",
            isOverlay: true,
            plots:     [],

            settingsFields: [
                // ── Zone detection ────────────────────────────
                {
                    id: "swingLookback",
                    caption: "How far back to find zones (bars)",
                    type: "int", defaultValue: 700, min: 20, max: 1000
                },
                {
                    id: "swingStrength",
                    caption: "Zone strength (bars each side) — lower=more signals, higher=fewer stronger signals",
                    type: "int", defaultValue: 3, min: 2, max: 20
                },
                {
                    id: "zoneWidth",
                    caption: "Zone width in pips (how thick each zone is)",
                    type: "int", defaultValue: 50, min: 5, max: 1000
                },

                // ── Signal filters ────────────────────────────
                {
                    id: "use200EMA",
                    caption: "Use 200 EMA filter (buys above, sells below)",
                    type: "bool", defaultValue: true
                },
                {
                    id: "minBarsBetween",
                    caption: "Min bars between signals",
                    type: "int", defaultValue: 10, min: 1, max: 30
                },
                {
                    id: "minPipsBetween",
                    caption: "Min pips between signals (stops stacking)",
                    type: "int", defaultValue: 50, min: 5, max: 2000
                },
                {
                    id: "firstTouchOnly",
                    caption: "First touch of zone only (no repeats)",
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
    onParameterChange(data) { this._reset(); }   // full reset forces redraw with new settings

    _reset() {
        this.$alertedDate  = 0;
        this.$alertedClose = 0;
        this.$openSignal   = null;
        this.$lastSigBar   = -999;
        this.$lastSigPrice = null;
        this.$touchedZones = {};
        this.$ema200 = null;
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
        var firstTouchOnly = this._bool(p.firstTouchOnly !== undefined ? p.firstTouchOnly : true);
        // Read direction toggles with safe bool conversion
        var rawBuys   = p.showBuys;
        var rawSells  = p.showSells;
        var showBuys  = (rawBuys  === false || rawBuys  === "false" || rawBuys  === 0) ? false : true;
        var showSells = (rawSells === false || rawSells === "false" || rawSells === 0) ? false : true;
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

        // ── 200 EMA ────────────────────────────────────────────
        if (!this.$ema200) {
            this.$ema200 = new FXB.ta.EMA({period: 200});
        }
        if (data.currentBarUpdateOnly) {
            this.$ema200.UpdateCurrent(data);
            // Still do full redraw (don't return early)
            // so setting changes apply immediately
        } else {
            this.$ema200.LoadData(data);
        }

        var ema200Arr = this.$ema200.GetValueArray();

        // Live bar — check milestones but do NOT return
        // We must fall through to the full redraw so that
        // setting changes (showBuys/showSells) apply instantly
        if (data.currentBarUpdateOnly) {
            if (this.$openSignal) {
                var lc = data.barData.close[0];
                var ld = data.barData.date[0];
                this._milestones(lc, ld, pipSize, alertsOn, telegramOn,
                    tgToken, tgChatId, instrument, timeframe);
            }
            // Don't return — fall through to full redraw below
        }

        var bd       = data.barData;
        var zoneW    = zoneWidthPips * pipSize;

        this.removeAllDrawings();
        this.$touchedZones = {};   // reset zone touch memory on full recalc
        this.$lastSigPrice = null;
        var drawings = [];

        // ── Step 1: Find swing highs and lows ─────────────────
        // Scan from oldest to newest within lookback window
        // Only find swings that are to the LEFT of the current bar
        // (older bars = higher index in barData)
        var supports    = [];   // swing lows = support zones
        var resistances = [];   // swing highs = resistance zones

        var searchFrom = Math.min(swingLookback, count - swingStrength - 1);

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

        // ── Step 2: Scan each bar for a zone touch + rejection ─
        var scanLimit = Math.min(swingLookback, count - 2);

        for (var i = 1; i <= scanLimit; i++) {
            var barDate = bd.date[i];

            // Respect min bars between signals
            if (Math.abs(i - this.$lastSigBar) < minBars) continue;

            var open  = bd.open[i];
            var high  = bd.high[i];
            var low   = bd.low[i];
            var close = bd.close[i];
            var range = high - low;
            if (range === 0) continue;

            // 200 EMA value
            var e200     = ema200Arr ? ema200Arr[i] : null;
            var above200 = !use200 || !e200 || close >= e200;
            var below200 = !use200 || !e200 || close <= e200;

            var signalType = null;

            // ── BUY: price touches support + bullish rejection ─
            if (showBuys && above200) {
                for (var sp = 0; sp < supports.length; sp++) {
                    // Zone must be OLDER than current bar (higher index)
                    if (supports[sp].idx <= i) continue;

                    var supportPrice = supports[sp].price;
                    var zoneTop      = supportPrice + zoneW;
                    var zoneBot      = supportPrice - zoneW;

                    // Price wicked into or touched the zone
                    var touchedZone  = low <= zoneTop && low >= zoneBot - zoneW;

                    // Bullish rejection candle:
                    // - Closed above the midpoint of the bar (buyers won)
                    // - Close above open (green candle)
                    // - Lower wick is significant (price rejected lower)
                    var bullishClose = close > open;
                    var closedAboveMid = (close - low) / range >= 0.55;
                    var hasLowerWick = (open - low) / range >= 0.15 ||
                                      (close - low) / range >= 0.30;

                    if (touchedZone && bullishClose && closedAboveMid) {
                        // First touch only — skip if this zone already fired
                        var zoneKey = "S_" + Math.round(supportPrice / pipSize);
                        if (firstTouchOnly && this.$touchedZones[zoneKey]) continue;
                        if (firstTouchOnly) this.$touchedZones[zoneKey] = true;
                        signalType = "buy";
                        break;
                    }
                }
            }

            // ── SELL: price touches resistance + bearish rejection
            if (!signalType && showSells && below200) {
                for (var rp = 0; rp < resistances.length; rp++) {
                    if (resistances[rp].idx <= i) continue;

                    var resistPrice  = resistances[rp].price;
                    var rZoneTop     = resistPrice + zoneW;
                    var rZoneBot     = resistPrice - zoneW;

                    // Price wicked up into or touched the zone
                    var touchedRes   = high >= rZoneBot - zoneW && high <= rZoneTop + zoneW;

                    // Bearish rejection candle:
                    // - Closed below open (red candle)
                    // - Close below midpoint (sellers won)
                    // - Upper wick is significant (price rejected higher)
                    var bearishClose  = close < open;
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

            // Min pip distance between signals — prevents stacking
            var minPipsAbs = minPipsDist * pipSize;
            if (this.$lastSigPrice !== null &&
                Math.abs(close - this.$lastSigPrice) < minPipsAbs) continue;

            var isBuy  = signalType === "buy";
            var color  = isBuy ? "#00e5ff" : "#ff4081";
            var label  = isBuy ? "▲ " + lblBuy : "▼ " + lblSell;

            this.$lastSigBar   = i;
            this.$lastSigPrice = close;

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

            // Alert on most recent bar only
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

            // Check milestones for this bar
            if (this.$openSignal) {
                this._milestones(close, barDate, pipSize, alertsOn,
                    telegramOn, tgToken, tgChatId, instrument, timeframe);
            }
        }

        if (drawings.length) this.createDrawing(drawings);
    }

    /* -------------------------------------------------------
       _milestones — profit-based action alerts
    ------------------------------------------------------- */
    _milestones(close, barDate, pipSize, alertsOn, telegramOn,
                tgToken, tgChatId, instrument, timeframe) {

        if (!this.$openSignal) return;
        var os = this.$openSignal;

        var profitPips = os.dir === "buy"
            ? (close - os.entryPrice) / pipSize
            : (os.entryPrice - close) / pipSize;
        var pp = Math.round(profitPips);

        if (profitPips >= 10 && !os.alert10) {
            os.alert10 = true;
            if (alertsOn) {
                this.createToast({
                    title: "✅ +10 PIPS — Move to Breakeven | " + instrument,
                    text:  "+" + pp + "p profit  |  Move stop to entry now  |  Risk = ZERO  |  " + timeframe
                });
                this._beep("trail");
            }
            if (telegramOn && tgToken && tgChatId)
                this._sendTelegram(tgToken, tgChatId,
                    "✅ +10p | " + instrument + " | Move stop to entry");
        }

        if (profitPips >= 15 && !os.alert15) {
            os.alert15 = true;
            if (alertsOn) {
                this.createToast({
                    title: "⚡ +15 PIPS — Start Trailing | " + instrument,
                    text:  "+" + pp + "p profit  |  Trail stop 10p behind price  |  " + timeframe
                });
                this._beep("trail");
            }
            if (telegramOn && tgToken && tgChatId)
                this._sendTelegram(tgToken, tgChatId,
                    "⚡ +15p | " + instrument + " | Trail 10p behind price");
        }

        if (profitPips >= 20 && !os.alert20) {
            os.alert20 = true;
            if (alertsOn) {
                this.createToast({
                    title: "🚀 +20 PIPS — Close 50% | " + instrument,
                    text:  "+" + pp + "p profit  |  Close half now  |  Trail rest 15p behind  |  " + timeframe
                });
                this._beep("trail");
            }
            if (telegramOn && tgToken && tgChatId)
                this._sendTelegram(tgToken, tgChatId,
                    "🚀 +20p | " + instrument + " | Close 50% trail rest");
        }

        if (profitPips >= 30 && !os.alert30) {
            os.alert30 = true;
            if (alertsOn) {
                this.createToast({
                    title: "💰 +30 PIPS — Trail Tight | " + instrument,
                    text:  "+" + pp + "p  |  Trail 15p behind  |  Only exit when trail is hit  |  " + timeframe
                });
                this._beep("trail");
            }
        }

        // Close alert — price breaking back through zone level
        if (profitPips < -5 && barDate !== this.$alertedClose) {
            this.$alertedClose = barDate;
            if (alertsOn) {
                this.createToast({
                    title: "🔔 EXIT NOW — " + instrument,
                    text:  "Price broke back through zone  |  " + pp + "p  |  " + timeframe
                });
                this._beep("close_warn");
            }
            if (telegramOn && tgToken && tgChatId)
                this._sendTelegram(tgToken, tgChatId,
                    "🔔 EXIT | " + instrument + " | Zone broken | " + pp + "p");
            this.$openSignal = null;
        }
    }

    _beep(type) {
        try {
            var ctx = new (AudioContext || webkitAudioContext)();
            var now = ctx.currentTime;
            var p = function(f, s, d) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = "sine"; o.frequency.value = f;
                g.gain.setValueAtTime(0.28, now + s);
                g.gain.exponentialRampToValueAtTime(0.001, now + s + d);
                o.start(now + s); o.stop(now + s + d + 0.01);
            };
            if (type === "buy")        { p(528,0,0.15); p(660,0.14,0.20); }
            if (type === "sell")       { p(660,0,0.15); p(528,0.14,0.20); }
            if (type === "trail")      { p(660,0,0.10); p(880,0.08,0.10); p(660,0.20,0.10); p(880,0.28,0.15); }
            if (type === "close_warn") { p(440,0,0.12); p(330,0.15,0.20); }
        } catch(e) {}
    }

    _sendTelegram(token, chatId, message) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "https://api.telegram.org/bot"
                + encodeURIComponent(token) + "/sendMessage", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify({chat_id: chatId, text: message, parse_mode: "HTML"}));
        } catch(e) {}
    }
}