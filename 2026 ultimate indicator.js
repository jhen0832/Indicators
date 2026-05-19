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
   Enter on the very next candle's open.
   Zero repainting — signal bar is always fully closed before
   the arrow appears.

   BUY SIGNAL — all must be true on the just-closed bar:
     1. Fast EMA > Slow EMA              (bullish trend)
     2. Close > Fast EMA                 (price above trend)
     3. Bullish candle (close > open)
     4. Close in upper 60% of bar range  (strong buyer candle)
     5. RSI 40–72                        (momentum, not overbought)
     6. Previous bar was a pullback or inside bar (Continuum pause)

   SELL SIGNAL — mirror of above for bearish:
     1. Fast EMA < Slow EMA              (bearish trend)
     2. Close < Fast EMA                 (price below trend)
     3. Bearish candle (close < open)
     4. Close in lower 60% of bar range  (strong seller candle)
     5. RSI 28–60                        (momentum, not oversold)
     6. Previous bar was a pullback or inside bar

   ALERTS:
   - Platform toast popup on every new signal
   - Two-tone audio beep (ascending = BUY, descending = SELL)
   - Optional Telegram message to your channel (set bot token + chat ID)

   EXTRA FEATURES:
   - Fast + Slow EMA plotted on chart
   - Confirmation candle bar highlight (subtle green/red tint)
   - Event markers at chart bottom (toggle on/off)
   - Arrows on chart (toggle on/off)
   - Consecutive same-direction signal suppression (optional)
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$lastProcessedDate  = new Date(0);
        this.$firstProcessedDate = new Date(2099, 0, 1);
        this.$lastSignal         = null;
        this.$alertedDate        = 0;
        this.$fastEMA            = null;
        this.$slowEMA            = null;
        this.$rsi                = null;

        return {
            caption:   "Trend Confirmation Signals",
            isOverlay: true,
            plots: [
                {
                    type:      "line",
                    caption:   "Fast EMA",
                    color:     "rgba(80,200,255,0.75)",
                    lineWidth: 1
                },
                {
                    type:      "line",
                    caption:   "Slow EMA",
                    color:     "rgba(255,165,40,0.65)",
                    lineWidth: 1
                }
            ],
            settingsFields: [
                // ---- Indicator settings ----
                {
                    id: "fastPeriod", caption: "Fast EMA Period",
                    type: "int", defaultValue: 9, min: 2, max: 100
                },
                {
                    id: "slowPeriod", caption: "Slow EMA Period",
                    type: "int", defaultValue: 21, min: 3, max: 300
                },
                {
                    id: "rsiPeriod", caption: "RSI Period",
                    type: "int", defaultValue: 14, min: 2, max: 100
                },
                {
                    id: "buyColor",  caption: "Buy Arrow Color",
                    type: "color", defaultValue: "#00e676"
                },
                {
                    id: "sellColor", caption: "Sell Arrow Color",
                    type: "color", defaultValue: "#ff5252"
                },
                {
                    id: "suppressConsec",
                    caption: "Suppress Consecutive Same-Direction Signals",
                    type: "bool", defaultValue: true
                },

                // ---- Display toggles ----
                {
                    id:      "showArrows",
                    caption: "Show Arrows on Chart",
                    type:    "bool",
                    defaultValue: true
                },
                {
                    id:      "showMarkers",
                    caption: "Show Signal Lines at Chart Bottom",
                    type:    "bool",
                    defaultValue: false
                },

                // ---- Alert settings ----
                {
                    id: "alertsOn", caption: "Enable Alerts (popup + sound)",
                    type: "bool", defaultValue: true
                },

                // ---- Telegram settings ----
                {
                    id: "telegramOn", caption: "Enable Telegram Alerts",
                    type: "bool", defaultValue: false
                },
                {
                    id: "telegramToken",
                    caption: "Telegram Bot Token  (from @BotFather)",
                    type: "text", defaultValue: ""
                },
                {
                    id: "telegramChatId",
                    caption: "Telegram Chat ID  (channel or group ID)",
                    type: "text", defaultValue: ""
                }
            ]
        };
    }

    onContextChange(data) { this._reset(); }
    onParameterChange(data) { this._reset(); }

    _reset() {
        this.$lastProcessedDate  = new Date(0);
        this.$firstProcessedDate = new Date(2099, 0, 1);
        this.$lastSignal         = null;
        this.$alertedDate        = 0;
        this.$fastEMA            = null;
        this.$slowEMA            = null;
        this.$rsi                = null;
        this.removeAllDrawings();
        this.removeAllEventMarkers();
        this.removeAllBarHighlights();
    }

    _readBool(val) {
        if (val === true  || val === "true"  || val === "yes" || val === 1) return true;
        if (val === false || val === "false" || val === "no"  || val === 0) return false;
        return !!val;
    }

    onCalculate(data, output) {
        var p            = data.parameters;
        var fastPeriod   = parseInt(p["fastPeriod"])  || 9;
        var slowPeriod   = parseInt(p["slowPeriod"])  || 21;
        var rsiPeriod    = parseInt(p["rsiPeriod"])   || 14;
        var buyColor     = p["buyColor"]              || "#00e676";
        var sellColor    = p["sellColor"]             || "#ff5252";
        var alertsOn     = this._readBool(p["alertsOn"]);
        var suppress     = this._readBool(p["suppressConsec"]);
        var showArrows   = this._readBool(p["showArrows"]);
        var showMarkers  = this._readBool(p["showMarkers"]);
        var telegramOn   = this._readBool(p["telegramOn"]);
        var tgToken      = (p["telegramToken"]  || "").trim();
        var tgChatId     = (p["telegramChatId"] || "").trim();
        var instrument   = data.context.instrument.name;
        var timeframe    = data.context.timeframe || "";
        var count        = data.valueCount;
        var minBars      = Math.max(slowPeriod, rsiPeriod) + 5;

        if (count < minBars) return;

        // ---- Build / maintain TA calculators ----
        if (!this.$fastEMA) this.$fastEMA = new FXB.ta.EMA({period: fastPeriod});
        if (!this.$slowEMA) this.$slowEMA = new FXB.ta.EMA({period: slowPeriod});
        if (!this.$rsi)     this.$rsi     = new FXB.ta.RSI({period: rsiPeriod});

        if (data.currentBarUpdateOnly) {
            this.$fastEMA.UpdateCurrent(data);
            this.$slowEMA.UpdateCurrent(data);
            this.$rsi.UpdateCurrent(data);
        } else {
            this.$fastEMA.LoadData(data);
            this.$slowEMA.LoadData(data);
            this.$rsi.LoadData(data);
        }

        // ---- Write EMA plots ----
        output.values[0] = this.$fastEMA.GetValueArray();
        output.values[1] = this.$slowEMA.GetValueArray();

        if (data.currentBarUpdateOnly) return;

        var fastArr = this.$fastEMA.GetValueArray();
        var slowArr = this.$slowEMA.GetValueArray();
        var rsiArr  = this.$rsi.GetValueArray();
        var barData = data.barData;

        var newDrawings = [];
        var newMarkers  = [];

        for (var i = count - 1; i >= 1; i--) {
            var barDate = barData.date[i];

            if (barDate >= this.$firstProcessedDate && barDate <= this.$lastProcessedDate) {
                continue;
            }

            if (i + 1 >= count) continue;

            var open  = barData.open[i];
            var high  = barData.high[i];
            var low   = barData.low[i];
            var close = barData.close[i];
            var range = high - low;
            if (range === 0) continue;

            var fastVal = fastArr[i];
            var slowVal = slowArr[i];
            var rsiVal  = rsiArr[i];
            if (!fastVal || !slowVal || !rsiVal) continue;

            var prevOpen  = barData.open[i + 1];
            var prevHigh  = barData.high[i + 1];
            var prevLow   = barData.low[i + 1];
            var prevClose = barData.close[i + 1];

            var prevInsideBar = false;
            if (i + 2 < count) {
                prevInsideBar = prevHigh <= barData.high[i + 2] &&
                                prevLow  >= barData.low[i + 2];
            }

            var prevBearishPullback = prevClose < prevOpen;
            var prevBullishPullback = prevClose > prevOpen;

            // BUY CONDITIONS
            var isBuy = fastVal > slowVal &&
                        close > fastVal   &&
                        close > open      &&
                        (close - low) / range >= 0.60 &&
                        rsiVal >= 40 && rsiVal <= 72  &&
                        (prevBearishPullback || prevInsideBar);

            // SELL CONDITIONS
            var isSell = fastVal < slowVal &&
                         close < fastVal   &&
                         close < open      &&
                         (high - close) / range >= 0.60 &&
                         rsiVal >= 28 && rsiVal <= 60   &&
                         (prevBullishPullback || prevInsideBar);

            if (suppress) {
                if (isBuy  && this.$lastSignal === "buy")  isBuy  = false;
                if (isSell && this.$lastSignal === "sell") isSell = false;
            }

            // ---- BUY ----
            if (isBuy) {
                this.$lastSignal = "buy";

                // Arrow — only if showArrows is on
                if (showArrows) {
                    newDrawings.push({
                        type:          "barMarker",
                        points:        [{date: barDate, value: low}],
                        iconColor:     buyColor,
                        icon:          "f0aa",
                        iconSize:      20,
                        markerOffset:  26,
                        text:          "BUY",
                        textAboveLine: false,
                        style:         {text: {color: buyColor, fontsize: 11}}
                    });
                }

                this.createBarHighlight({
                    date:  barDate,
                    color: "rgba(0,230,118,0.20)"
                });

                // Event marker line — only if showMarkers is on
                if (showMarkers) {
                    newMarkers.push({
                        date:  barDate,
                        color: buyColor,
                        icon:  "f0aa",
                        text:  "BUY — " + instrument
                    });
                }

                if (i === 1 && barDate !== this.$alertedDate) {
                    this.$alertedDate = barDate;

                    var buyMsg = "BUY Signal | " + instrument
                               + " | " + timeframe
                               + " | Price: " + close.toFixed(5);

                    if (alertsOn) {
                        this.createToast({
                            title: "▲ BUY Signal — " + instrument,
                            text:  timeframe + " | Entry next candle open | Price: " + close.toFixed(5)
                        });
                        this._playBeep("buy");
                    }

                    if (telegramOn && tgToken && tgChatId) {
                        this._sendTelegram(tgToken, tgChatId, "▲ " + buyMsg);
                    }
                }
            }

            // ---- SELL ----
            if (isSell) {
                this.$lastSignal = "sell";

                // Arrow — only if showArrows is on
                if (showArrows) {
                    newDrawings.push({
                        type:          "barMarker",
                        points:        [{date: barDate, value: high}],
                        iconColor:     sellColor,
                        icon:          "f0ab",
                        iconSize:      20,
                        markerOffset:  -26,
                        text:          "SELL",
                        textAboveLine: true,
                        style:         {text: {color: sellColor, fontsize: 11}}
                    });
                }

                this.createBarHighlight({
                    date:  barDate,
                    color: "rgba(255,82,82,0.20)"
                });

                // Event marker line — only if showMarkers is on
                if (showMarkers) {
                    newMarkers.push({
                        date:  barDate,
                        color: sellColor,
                        icon:  "f0ab",
                        text:  "SELL — " + instrument
                    });
                }

                if (i === 1 && barDate !== this.$alertedDate) {
                    this.$alertedDate = barDate;

                    var sellMsg = "SELL Signal | " + instrument
                                + " | " + timeframe
                                + " | Price: " + close.toFixed(5);

                    if (alertsOn) {
                        this.createToast({
                            title: "▼ SELL Signal — " + instrument,
                            text:  timeframe + " | Entry next candle open | Price: " + close.toFixed(5)
                        });
                        this._playBeep("sell");
                    }

                    if (telegramOn && tgToken && tgChatId) {
                        this._sendTelegram(tgToken, tgChatId, "▼ " + sellMsg);
                    }
                }
            }
        }

        this.$firstProcessedDate = barData.date[count - 1];
        this.$lastProcessedDate  = barData.date[1];

        if (newDrawings.length) this.createDrawing(newDrawings);
        if (newMarkers.length)  this.createEventMarker(newMarkers);
    }

    _sendTelegram(token, chatId, message) {
        try {
            var url  = "https://api.telegram.org/bot"
                     + encodeURIComponent(token)
                     + "/sendMessage";
            var body = JSON.stringify({
                chat_id:    chatId,
                text:       message,
                parse_mode: "HTML"
            });
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(body);
        } catch(e) {}
    }

    _playBeep(direction) {
        try {
            var ctx  = new (AudioContext || webkitAudioContext)();
            var now  = ctx.currentTime;
            var freq1 = direction === "buy" ? 660 : 880;
            var freq2 = direction === "buy" ? 880 : 660;

            var osc1 = ctx.createOscillator(), gain1 = ctx.createGain();
            osc1.connect(gain1); gain1.connect(ctx.destination);
            osc1.type = "sine"; osc1.frequency.value = freq1;
            gain1.gain.setValueAtTime(0.35, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
            osc1.start(now); osc1.stop(now + 0.20);

            var osc2 = ctx.createOscillator(), gain2 = ctx.createGain();
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.type = "sine"; osc2.frequency.value = freq2;
            gain2.gain.setValueAtTime(0.35, now + 0.18);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc2.start(now + 0.18); osc2.stop(now + 0.38);
        } catch(e) {}
    }
}