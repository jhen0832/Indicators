/* ================================================================
   Liquid Charts Pro — Smart Pivot Points v5
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode: UDI
   5. Click ADD

   COLORS ARE FIXED — they never change when you adjust settings:
     P  (Pivot)        → White  — the most important level
     R1, R2, R3        → Red    — resistance / sell zones
     S1, S2, S3        → Teal   — support / buy zones
     Fib 61.8%         → Purple — best entry zones
     Fib 38.2%         → Violet — targets / secondary zones
     Rejection zones   → Shaded red / teal boxes

   FIBONACCI AUTO-ADJUSTS:
   Levels are calculated from the previous period's High/Low
   and automatically scale to whatever timeframe you are on.
   No manual adjustment needed — switch timeframes freely.

   HOW TO READ IT:
   ─ Price ABOVE white P line → bullish bias → look to BUY
     → Best buy zones: green shaded area (S1-S2), Fib 61.8% S
     → Targets going up: S1 → P → R1 → R2

   ─ Price BELOW white P line → bearish bias → look to SELL
     → Best sell zones: red shaded area (R1-R2), Fib 61.8% R
     → Targets going down: R1 → P → S1 → S2

   ─ Wait for price to touch a zone, see a rejection candle,
     then enter in the direction of the bounce.

   TIMEFRAME GUIDE:
   M1–M30 → set Daily   | H1–H4 → set Weekly | D1 → set Monthly
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$candleStore   = null;
        this.$higherStore   = null;
        this.$currentParams = null;
        this.$currentPeriod = null;

        // ── HARDCODED COLORS — never change ───────────────────
        this.$colors = {
            P:      "#ffffff",          // Pivot — white
            R:      "#ef5350",          // Resistance — red
            S:      "#26a69a",          // Support — teal
            fib618: "#ab47bc",          // Fib 61.8% — purple
            fib382: "#9575cd",          // Fib 38.2% — violet
            zoneR:  "rgba(239,83,80,0.11)",   // Sell zone fill
            zoneS:  "rgba(38,166,154,0.11)",  // Buy zone fill
            pZone:  "rgba(255,255,255,0.04)"  // Pivot band fill
        };

        return {
            caption:   "Smart Pivot Points",
            isOverlay: true,
            plots:     [],

            settingsFields: [

                // ── Period ────────────────────────────────────
                {
                    id:           "period",
                    caption:      "Pivot Period",
                    type:         "select",
                    options: [
                        {k: "86400",   v: "Daily   — M1 / M5 / M15 / M30"},
                        {k: "604800",  v: "Weekly  — H1 / H4"},
                        {k: "2592000", v: "Monthly — D1"}
                    ],
                    defaultValue: "86400"
                },

                // ── Display toggles ───────────────────────────
                {
                    id: "showFib",
                    caption: "Show Fibonacci Levels (61.8% + 38.2%)",
                    type: "bool", defaultValue: true
                },
                {
                    id: "showZones",
                    caption: "Show Rejection Zones (shaded boxes)",
                    type: "bool", defaultValue: true
                },
                {
                    id: "showR3S3",
                    caption: "Show R3 / S3 (extreme outer levels)",
                    type: "bool", defaultValue: false
                },
                {
                    id: "showLabels",
                    caption: "Show Price Labels on Lines",
                    type: "bool", defaultValue: true
                },

                // ── Display options ───────────────────────────
                {
                    id: "lookback",
                    caption: "How Many Past Periods to Show",
                    type: "int", defaultValue: 2, min: 1, max: 5
                },
                {
                    id: "lineWidth",
                    caption: "Line Width",
                    type: "int", defaultValue: 1, min: 1, max: 3
                },
                {
                    id: "histOpacity",
                    caption: "Past Period Fade % (lower = more faded)",
                    type: "int", defaultValue: 25, min: 5, max: 80
                }
            ]
        };
    }

    onContextChange(data) {
        this.$candleStore = null;
        this.$higherStore = null;
        this.removeAllDrawings();
    }

    onParameterChange(data) {
        // Save new params FIRST so _redraw uses them
        this.$currentParams = data.parameters;

        // Only destroy the candle store if the period changed
        if (this.$currentPeriod !== null) {
            var newPeriod = this._calcPeriod(
                parseInt(data.parameters.period) || 86400,
                data.context ? (data.context.instrument.timeframe || 60) : 60
            );
            if (newPeriod !== this.$currentPeriod) {
                this.$candleStore   = null;
                this.$higherStore   = null;
                this.$currentPeriod = null;
            }
        }

        // Clear drawings — onCalculate fires right after and redraws
        this.removeAllDrawings();
    }

    onCalculate(data, output) {
        // Always keep params in sync
        this.$currentParams = data.parameters;

        var chartTf    = data.context.instrument.timeframe || 60;
        var periodSecs = this._calcPeriod(
            parseInt(data.parameters.period) || 86400,
            chartTf
        );

        if (chartTf > periodSecs) return;

        var self = this;

        if (!this.$candleStore || this.$currentPeriod !== periodSecs) {
            this.$currentPeriod = periodSecs;
            this.$candleStore   = new FXB.CandleStore();
            this.$candleStore.LoadData(data);
            this.$higherStore   = this.$candleStore.Aggregate(periodSecs);

            this.$higherStore.OnLoad = function() {
                self._redraw();
            };

            this.$higherStore.OnCurrentCandleChange = function() {};

            this._redraw();

        } else {
            this.$higherStore.LoadData(data);
            // Always redraw so param changes are reflected immediately
            if (this.$higherStore.length >= 2) {
                this._redraw();
            }
        }
    }

    /* -------------------------------------------------------
       _calcPeriod — adjust period to be a multiple of chartTf
    ------------------------------------------------------- */
    _calcPeriod(requestedSecs, chartTf) {
        if (requestedSecs % chartTf === 0) return requestedSecs;
        return Math.ceil(requestedSecs / chartTf) * chartTf;
    }

    /* -------------------------------------------------------
       _readBool — safe boolean coercion
    ------------------------------------------------------- */
    _readBool(val) {
        if (val === true  || val === "true"  || val === "yes" || val === 1) return true;
        if (val === false || val === "false" || val === "no"  || val === 0) return false;
        return !!val;
    }

    /* -------------------------------------------------------
       _redraw — draws all pivot + Fibonacci levels
    ------------------------------------------------------- */
    _redraw() {
        this.removeAllDrawings();

        if (!this.$higherStore || this.$higherStore.length < 2) return;
        if (!this.$currentParams) return;

        var p          = this.$currentParams;
        var C          = this.$colors;   // hardcoded color set

        // Read settings with safe coercion
        var showFib    = this._readBool(p.showFib);
        var showZones  = this._readBool(p.showZones);
        var showR3S3   = this._readBool(p.showR3S3);
        var showLabels = this._readBool(p.showLabels);
        var lookback   = Math.min(parseInt(p.lookback)    || 2,  this.$higherStore.length - 1);
        var lw         = parseInt(p.lineWidth)            || 1;
        var histOp     = (parseInt(p.histOpacity)         || 25) / 100;
        var periodSecs = this.$currentPeriod              || 86400;

        var drawings = [];

        // Alpha helper using hardcoded colors
        function fade(hexOrRgba, a) {
            // If it's already rgba, just override alpha
            if (hexOrRgba.indexOf("rgba") === 0) {
                return hexOrRgba.replace(/[\d.]+\)$/, a.toFixed(2) + ")");
            }
            var hex = hexOrRgba.replace("#", "");
            var r = parseInt(hex.slice(0,2), 16) || 0;
            var g = parseInt(hex.slice(2,4), 16) || 0;
            var b = parseInt(hex.slice(4,6), 16) || 0;
            return "rgba(" + r + "," + g + "," + b + "," + a.toFixed(2) + ")";
        }

        for (var i = 1; i <= lookback; i++) {
            var src    = this.$higherStore.GetCandle(i);
            var target = this.$higherStore.GetCandle(i - 1);
            if (!src || !target) continue;

            var H     = src.h;
            var L     = src.l;
            var Cl    = src.c;
            var range = H - L;
            if (range <= 0) continue;

            var tStart    = target.i;
            var tEnd      = tStart + ((periodSecs - 60) * 1000);
            var isCurrent = (i === 1);
            var alpha     = isCurrent ? 1.0 : histOp;

            // ── Standard Pivots ────────────────────────────────
            var P  = (H + L + Cl) / 3;
            var R1 = (2 * P) - L;
            var R2 = P + range;
            var R3 = R1 + range;
            var S1 = (2 * P) - H;
            var S2 = P - range;
            var S3 = S1 - range;

            // ── Fibonacci — auto-scales to any timeframe ───────
            // Calculated from previous period range, always correct
            var fib618R = P + 0.618 * range;
            var fib382R = P + 0.382 * range;
            var fib382S = P - 0.382 * range;
            var fib618S = P - 0.618 * range;

            // ── Rejection zones ────────────────────────────────
            if (showZones && isCurrent) {
                // Sell zone R1→R2
                drawings.push({
                    type: "rectangle", unselectable: true, showInBackground: true,
                    points: [{date: tStart, value: R2}, {date: tEnd, value: R1}],
                    style: {line: {color: "rgba(0,0,0,0)"}, fill: {color: C.zoneR}}
                });
                // Buy zone S1→S2
                drawings.push({
                    type: "rectangle", unselectable: true, showInBackground: true,
                    points: [{date: tStart, value: S1}, {date: tEnd, value: S2}],
                    style: {line: {color: "rgba(0,0,0,0)"}, fill: {color: C.zoneS}}
                });
                // Pivot band
                var band = range * 0.008;
                drawings.push({
                    type: "rectangle", unselectable: true, showInBackground: true,
                    points: [{date: tStart, value: P + band}, {date: tEnd, value: P - band}],
                    style: {line: {color: "rgba(0,0,0,0)"}, fill: {color: C.pZone}}
                });
            }

            // ── Level definitions (all use hardcoded colors) ───
            var levels = [
                // Pivot — white, thicker
                {price: P,  color: fade(C.P, alpha),           lw: lw + 1, dash: false, label: "P"},

                // Resistance — red
                {price: R1, color: fade(C.R, alpha),           lw: lw, dash: true, label: "R1"},
                {price: R2, color: fade(C.R, alpha * 0.80),    lw: lw, dash: true, label: "R2"},

                // Support — teal
                {price: S1, color: fade(C.S, alpha),           lw: lw, dash: true, label: "S1"},
                {price: S2, color: fade(C.S, alpha * 0.80),    lw: lw, dash: true, label: "S2"}
            ];

            if (showR3S3) {
                levels.push({price: R3, color: fade(C.R, alpha * 0.55), lw: lw, dash: true, label: "R3"});
                levels.push({price: S3, color: fade(C.S, alpha * 0.55), lw: lw, dash: true, label: "S3"});
            }

            // Fibonacci — purple / violet (hardcoded)
            if (showFib) {
                levels.push({price: fib618R, color: fade(C.fib618, alpha * 0.90), lw: lw, dash: true, label: "Fib 61.8% R"});
                levels.push({price: fib382R, color: fade(C.fib382, alpha * 0.70), lw: lw, dash: true, label: "Fib 38.2% R"});
                levels.push({price: fib382S, color: fade(C.fib382, alpha * 0.70), lw: lw, dash: true, label: "Fib 38.2% S"});
                levels.push({price: fib618S, color: fade(C.fib618, alpha * 0.90), lw: lw, dash: true, label: "Fib 61.8% S"});
            }

            // ── Create line drawings ───────────────────────────
            for (var d = 0; d < levels.length; d++) {
                var def = levels[d];
                if (!def.price || isNaN(def.price)) continue;

                var drawing = {
                    type:         "lineSegment",
                    unselectable: true,
                    points: [
                        {date: tStart, value: def.price},
                        {date: tEnd,   value: def.price}
                    ],
                    style: {
                        line: {
                            color:     def.color,
                            width:     def.lw,
                            lineStyle: def.dash ? "dashed" : "solid"
                        }
                    }
                };

                // Labels — current period only, right side
                if (showLabels && isCurrent) {
                    drawing.text         = def.label + "  " + this._fmt(def.price);
                    drawing.textPosition = "right";
                    drawing.style.text   = {color: def.color, fontsize: 10};
                }

                drawings.push(drawing);
            }
        }

        if (drawings.length > 0) {
            this.createDrawing(drawings);
        }
    }

    /* -------------------------------------------------------
       _fmt — smart price formatter
    ------------------------------------------------------- */
    _fmt(price) {
        if (!price || isNaN(price)) return "";
        if (price > 1000) return price.toFixed(2);   // Gold, indices, crypto
        if (price > 10)   return price.toFixed(3);   // JPY pairs
        return price.toFixed(5);                      // Forex majors
    }
}