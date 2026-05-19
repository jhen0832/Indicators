/* ================================================================
   Liquid Charts Pro — Previous Day High / Low
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode: UDI
   5. Click ADD

   ── WHAT YOU SEE ──────────────────────────────────────────
   Two horizontal lines extending across today:

   ── PDH ──  Previous Day High  (orange line)
   ── PDL ──  Previous Day Low   (teal line)

   These are fixed levels from yesterday's completed session.
   They are key areas where price often reacts — breakouts
   above PDH are bullish, breaks below PDL are bearish.

   ── ALERTS ────────────────────────────────────────────────
   "Approaching PDH" — price is within alert zone of the high
   "BREAKING PDH"    — price just closed above the high
   "Approaching PDL" — price is within alert zone of the low
   "BREAKING PDL"    — price just closed below the low

   ── WORKS ON ALL INSTRUMENTS ──────────────────────────────
   Forex, Gold, Indices, Crypto — alert zone auto-scales
   based on the instrument's pip size so you only need to
   set it once and it works everywhere.
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$pdhId       = null;
        this.$pdlId       = null;
        this.$pdhPending  = false;
        this.$pdlPending  = false;
        this.$pdh         = null;
        this.$pdl         = null;
        this.$lastDay     = "";

        // Alert state
        this.$alertedNearPdh  = false;
        this.$alertedBreakPdh = false;
        this.$alertedNearPdl  = false;
        this.$alertedBreakPdl = false;

        return {
            caption:   "Prev Day High / Low",
            isOverlay: true,
            plots:     [],

            settingsFields: [
                {
                    id:           "alertZonePips",
                    caption:      "Alert Zone (pips from PDH/PDL)",
                    type:         "int",
                    defaultValue: 10,
                    min:          1,
                    max:          1000
                },
                {
                    id:           "showPDH",
                    caption:      "Show Previous Day High Line",
                    type:         "bool",
                    defaultValue: true
                },
                {
                    id:           "showPDL",
                    caption:      "Show Previous Day Low Line",
                    type:         "bool",
                    defaultValue: true
                },
                {
                    id:           "extendLine",
                    caption:      "Extend Lines Across Full Chart",
                    type:         "bool",
                    defaultValue: true
                },
                {
                    id:           "alertsOn",
                    caption:      "Enable Alerts (popup + sound)",
                    type:         "bool",
                    defaultValue: true
                },
                {
                    id:           "telegramOn",
                    caption:      "Enable Telegram Alerts",
                    type:         "bool",
                    defaultValue: false
                },
                {
                    id:      "tgToken",
                    caption: "Telegram Bot Token",
                    type:    "text",
                    defaultValue: ""
                },
                {
                    id:      "tgChatId",
                    caption: "Telegram Chat ID",
                    type:    "text",
                    defaultValue: ""
                },
                {
                    id:           "colorPDH",
                    caption:      "Previous Day High Color",
                    type:         "color",
                    defaultValue: "#ff7043"
                },
                {
                    id:           "colorPDL",
                    caption:      "Previous Day Low Color",
                    type:         "color",
                    defaultValue: "#26a69a"
                }
            ]
        };
    }

    onContextChange(data)   { this._reset(); }
    onParameterChange(data) { this._reset(); }

    _reset() {
        this.$pdhId           = null;
        this.$pdlId           = null;
        this.$pdhPending      = false;
        this.$pdlPending      = false;
        this.$pdh             = null;
        this.$pdl             = null;
        this.$lastDay         = "";
        this.$alertedNearPdh  = false;
        this.$alertedBreakPdh = false;
        this.$alertedNearPdl  = false;
        this.$alertedBreakPdl = false;
        this.removeAllDrawings();
    }

    _bool(v) {
        return v === true || v === "true" || v === "yes" || v === 1;
    }

    /* -------------------------------------------------------
       _dayKey — returns a "YYYY-MM-DD" string from ms
       Works universally regardless of timezone offset
    ------------------------------------------------------- */
    _dayKey(ms) {
        var d = new Date(ms);
        return d.getFullYear() + "-"
            + String(d.getMonth() + 1).padStart(2, "0") + "-"
            + String(d.getDate()).padStart(2, "0");
    }

    onCalculate(data, output) {
        var p          = data.parameters;
        var alertZone  = parseInt(p["alertZonePips"]) || 10;
        var showPDH    = this._bool(p["showPDH"]);
        var showPDL    = this._bool(p["showPDL"]);
        var extendLine = this._bool(p["extendLine"]);
        var alertsOn   = this._bool(p["alertsOn"]);
        var telegramOn = this._bool(p["telegramOn"]);
        var tgToken    = (p["tgToken"]  || "").trim();
        var tgChatId   = (p["tgChatId"] || "").trim();
        var colorPDH   = p["colorPDH"]  || "#ff7043";
        var colorPDL   = p["colorPDL"]  || "#26a69a";
        var instrument = data.context.instrument.name;
        var pipSize    = data.context.instrument.pipSize || 0.0001;
        var count      = data.valueCount;
        var bd         = data.barData;

        if (count < 5) return;

        // ── Find today and yesterday's bars ───────────────────
        // bd.date[0] = most recent bar (newest)
        // bd.date[count-1] = oldest bar
        // We scan from newest backwards to identify days

        var todayKey   = this._dayKey(bd.date[0]);
        var prevDayKey = null;

        // Find where today ends and yesterday begins
        var todayStartIdx  = 0;   // index where today's bars begin (highest index = oldest today bar)
        var prevDayEndIdx  = -1;  // index of the newest bar of yesterday
        var prevDayStartIdx = -1; // index of the oldest bar of yesterday

        // Walk from newest to oldest
        for (var i = 0; i < count; i++) {
            var dk = this._dayKey(bd.date[i]);

            if (dk === todayKey) {
                todayStartIdx = i; // keep updating — ends up as the oldest today bar
                continue;
            }

            // First non-today bar we hit = yesterday's newest bar
            if (prevDayKey === null) {
                prevDayKey    = dk;
                prevDayEndIdx = i;
            }

            // Still on yesterday
            if (dk === prevDayKey) {
                prevDayStartIdx = i; // keep updating — ends up as yesterday's oldest bar
                continue;
            }

            // Hit a day before yesterday — stop
            break;
        }

        // No previous day data yet (e.g. chart just opened, weekend gap)
        if (prevDayKey === null || prevDayEndIdx === -1) return;

        // ── Calculate previous day's High and Low ─────────────
        var pdh = null;
        var pdl = null;

        for (var j = prevDayEndIdx; j <= prevDayStartIdx; j++) {
            var hi = bd.high[j];
            var lo = bd.low[j];
            if (pdh === null || hi > pdh) pdh = hi;
            if (pdl === null || lo < pdl) pdl = lo;
        }

        if (pdh === null || pdl === null) return;

        // ── Reset when day changes ─────────────────────────────
        if (todayKey !== this.$lastDay) {
            this.$lastDay         = todayKey;
            this.$pdh             = null;
            this.$pdl             = null;
            this.$pdhId           = null;
            this.$pdlId           = null;
            this.$pdhPending      = false;
            this.$pdlPending      = false;
            this.$alertedNearPdh  = false;
            this.$alertedBreakPdh = false;
            this.$alertedNearPdl  = false;
            this.$alertedBreakPdl = false;
            this.removeAllDrawings();
        }

        // ── Draw / update lines ───────────────────────────────
        // Line runs from the start of today to far right
        // todayStartIdx is the oldest today bar = left anchor
        var lineLeft  = bd.date[todayStartIdx];   // left edge = start of today
        var barMs     = this._barMs(bd, count);
        // Right edge: extend well past current bar
        var lineRight = bd.date[0] - (50 * barMs); // project 50 bars to the right

        // If not extending, just run to current bar
        if (!extendLine) {
            lineRight = bd.date[0];
        }

        var self = this;

        // ── PDH line ──────────────────────────────────────────
        if (showPDH) {
            var pdhDef = {
                type:         "lineSegment",
                unselectable: true,
                points: [
                    {date: lineLeft,  value: pdh},
                    {date: lineRight, value: pdh}
                ],
                text:         "PDH  " + this._fmt(pdh),
                textPosition: "left",
                style: {
                    line: {color: colorPDH, width: 2, lineStyle: "solid"},
                    text: {color: colorPDH, fontsize: 11}
                }
            };

            if (this.$pdhId && !this.$pdhPending) {
                pdhDef.drawingId = this.$pdhId;
                this.changeDrawing(pdhDef);
            } else if (!this.$pdhPending && (this.$pdh !== pdh || !this.$pdhId)) {
                this.$pdhPending = true;
                this.$pdh = pdh;
                this.createDrawing([pdhDef], function(r) {
                    self.$pdhId      = r.drawingId[0];
                    self.$pdhPending = false;
                });
            }
        }

        // ── PDL line ──────────────────────────────────────────
        if (showPDL) {
            var pdlDef = {
                type:         "lineSegment",
                unselectable: true,
                points: [
                    {date: lineLeft,  value: pdl},
                    {date: lineRight, value: pdl}
                ],
                text:         "PDL  " + this._fmt(pdl),
                textPosition: "left",
                style: {
                    line: {color: colorPDL, width: 2, lineStyle: "solid"},
                    text: {color: colorPDL, fontsize: 11}
                }
            };

            if (this.$pdlId && !this.$pdlPending) {
                pdlDef.drawingId = this.$pdlId;
                this.changeDrawing(pdlDef);
            } else if (!this.$pdlPending && (this.$pdl !== pdl || !this.$pdlId)) {
                this.$pdlPending = true;
                this.$pdl = pdl;
                this.createDrawing([pdlDef], function(r) {
                    self.$pdlId      = r.drawingId[0];
                    self.$pdlPending = false;
                });
            }
        }

        // ── Alert logic ───────────────────────────────────────
        if (!alertsOn && !telegramOn) return;

        var price     = bd.close[0];
        var alertDist = alertZone * pipSize;

        // Approaching PDH
        var distH = pdh - price;
        if (distH >= 0 && distH <= alertDist && !this.$alertedNearPdh) {
            this.$alertedNearPdh = true;
            var pipsH = Math.round(distH / pipSize);
            var msgH  = "⬆ Approaching PDH | " + instrument
                      + " | PDH: " + this._fmt(pdh)
                      + " | " + pipsH + " pips away";
            if (alertsOn) {
                this.createToast({
                    title: "⬆ Approaching Prev Day High — " + instrument,
                    text:  pipsH + " pips from PDH  |  " + this._fmt(pdh)
                });
                this._beep("approach");
            }
            if (telegramOn && tgToken && tgChatId) {
                this._sendTelegram(tgToken, tgChatId, msgH);
            }
        }
        if (distH > alertDist * 2) this.$alertedNearPdh = false;

        // Breaking PDH
        if (price > pdh && !this.$alertedBreakPdh) {
            this.$alertedBreakPdh = true;
            var msgBH = "🚀 BREAKING PDH | " + instrument
                      + " | PDH: " + this._fmt(pdh)
                      + " | Price: " + this._fmt(price);
            if (alertsOn) {
                this.createToast({
                    title: "🚀 BREAKING Prev Day High — " + instrument,
                    text:  "Price broke above PDH  |  " + this._fmt(pdh)
                });
                this._beep("breakHigh");
            }
            if (telegramOn && tgToken && tgChatId) {
                this._sendTelegram(tgToken, tgChatId, msgBH);
            }
        }

        // Approaching PDL
        var distL = price - pdl;
        if (distL >= 0 && distL <= alertDist && !this.$alertedNearPdl) {
            this.$alertedNearPdl = true;
            var pipsL = Math.round(distL / pipSize);
            var msgL  = "⬇ Approaching PDL | " + instrument
                      + " | PDL: " + this._fmt(pdl)
                      + " | " + pipsL + " pips away";
            if (alertsOn) {
                this.createToast({
                    title: "⬇ Approaching Prev Day Low — " + instrument,
                    text:  pipsL + " pips from PDL  |  " + this._fmt(pdl)
                });
                this._beep("approach");
            }
            if (telegramOn && tgToken && tgChatId) {
                this._sendTelegram(tgToken, tgChatId, msgL);
            }
        }
        if (distL > alertDist * 2) this.$alertedNearPdl = false;

        // Breaking PDL
        if (price < pdl && !this.$alertedBreakPdl) {
            this.$alertedBreakPdl = true;
            var msgBL = "💥 BREAKING PDL | " + instrument
                      + " | PDL: " + this._fmt(pdl)
                      + " | Price: " + this._fmt(price);
            if (alertsOn) {
                this.createToast({
                    title: "💥 BREAKING Prev Day Low — " + instrument,
                    text:  "Price broke below PDL  |  " + this._fmt(pdl)
                });
                this._beep("breakLow");
            }
            if (telegramOn && tgToken && tgChatId) {
                this._sendTelegram(tgToken, tgChatId, msgBL);
            }
        }
    }

    /* -------------------------------------------------------
       _barMs — average milliseconds per bar
    ------------------------------------------------------- */
    _barMs(bd, count) {
        if (count < 3) return 60000;
        var total = 0, n = Math.min(10, count - 1);
        for (var i = 0; i < n; i++) {
            total += Math.abs(bd.date[i] - bd.date[i + 1]);
        }
        return (total / n) || 60000;
    }

    /* -------------------------------------------------------
       _fmt — universal price formatter
       Works for Forex, Gold, Indices, Crypto
    ------------------------------------------------------- */
    _fmt(price) {
        if (!price) return "";
        if (price > 10000) return price.toFixed(2);   // Indices, BTC
        if (price > 1000)  return price.toFixed(2);   // Gold, NAS100
        if (price > 10)    return price.toFixed(3);   // JPY pairs
        return price.toFixed(5);                       // Forex majors
    }

    /* -------------------------------------------------------
       _beep — distinct sounds per alert type
    ------------------------------------------------------- */
    _beep(type) {
        try {
            var ctx = new (AudioContext || webkitAudioContext)();
            var now = ctx.currentTime;
            var p = function(f, s, d, v) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = "sine"; o.frequency.value = f;
                g.gain.setValueAtTime(v || 0.28, now + s);
                g.gain.exponentialRampToValueAtTime(0.001, now + s + d);
                o.start(now + s); o.stop(now + s + d + 0.02);
            };
            if (type === "approach")  { p(550, 0, 0.15); p(550, 0.22, 0.15); }
            if (type === "breakHigh") { p(440, 0, 0.12); p(660, 0.11, 0.12); p(880, 0.22, 0.25); }
            if (type === "breakLow")  { p(880, 0, 0.12); p(660, 0.11, 0.12); p(440, 0.22, 0.25); }
        } catch(e) {}
    }

    _sendTelegram(token, chatId, message) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST",
                "https://api.telegram.org/bot"
                + encodeURIComponent(token) + "/sendMessage", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify({
                chat_id: chatId, text: message, parse_mode: "HTML"
            }));
        } catch(e) {}
    }
}