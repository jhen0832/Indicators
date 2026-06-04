/* ================================================================
   Liquid Charts Pro — Market News Feed
   ================================================================
   INSTALL:
   1. Open Liquid Charts Pro → open any chart
   2. Indicators → Advanced → Add UDI
   3. Paste this file into the Code tab
   4. Mode: UDI  (no Framework needed)
   5. Click ADD
================================================================ */

class MyIndicator extends UserDefinedIndicator {

    onInit(data) {
        this.$htmlCreated  = false;
        this.$lastFetch    = 0;
        this.$fetchPending = false;
        this.$params       = {};

        var self = this;
        setInterval(function() { self._tick(); }, 30000);

        return {
            caption:   "Market News",
            isOverlay: true,
            plots:     [],
            settingsFields: [
                {id:"hoursAhead",  caption:"Show events hours ahead",     type:"int",  defaultValue:72, min:1, max:168},
                {id:"showMedium",  caption:"Show medium impact events",   type:"bool", defaultValue:false},
                {id:"alertBefore", caption:"Alert minutes before event",  type:"int",  defaultValue:5,  min:1, max:60},
                {id:"alertsOn",    caption:"Enable pre-event alerts",     type:"bool", defaultValue:true},
                {id:"position",    caption:"Card position",               type:"select",
                 options:[{k:"top-right",v:"Top Right"},{k:"top-left",v:"Top Left"},
                          {k:"bottom-right",v:"Bottom Right"},{k:"bottom-left",v:"Bottom Left"}],
                 defaultValue:"top-right"}
            ]
        };
    }

    onContextChange(data) {}

    onParameterChange(data) {
        this.$params = data.parameters || {};
        if (this.$htmlCreated) {
            this.sendHTMLMessage({action:"updateSettings", params:this.$params});
        }
    }

    onCalculate(data, output) {
        this.$params = data.parameters || {};
        if (!this.$htmlCreated) {
            this.$htmlCreated = true;
            this._buildCard();
        }
    }

    onHTMLMessage(msg) {
        if (!msg) return;
        if (msg.action === "ready")   { this._fetchNews(); return; }
        if (msg.action === "refresh") { this.$lastFetch = 0; this._fetchNews(); return; }
        if (msg.action === "newsAlert") {
            var impact = msg.impact || "high";
            this.createToast({
                title: "⚠ [" + (msg.type||"NEWS") + "] " + msg.title,
                text:  "In " + msg.mins + " min  |  " + msg.time + "  |  " + impact.toUpperCase()
            });
            this._beep(impact);
        }
    }

    _tick() {
        if (!this.$htmlCreated) return;
        if (Date.now() - this.$lastFetch > 300000) this._fetchNews();
    }

    _fetchNews() {
        if (this.$fetchPending) return;
        this.$fetchPending = true;
        this.$lastFetch    = Date.now();
        this._tryUrl(0);
    }

    _tryUrl(idx) {
        var self = this;
        var FF   = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
        var urls = [
            FF,
            "https://api.allorigins.win/raw?url=" + encodeURIComponent(FF),
            "https://corsproxy.io/?" + encodeURIComponent(FF),
            "https://thingproxy.freeboard.io/fetch/" + FF
        ];
        if (idx >= urls.length) {
            self.$fetchPending = false;
            self._useBuiltIn();
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", urls[idx], true);
        xhr.timeout = 8000;
        xhr.onload = function() {
            if (xhr.status === 200 && xhr.responseText && xhr.responseText.length > 50) {
                try {
                    var text = xhr.responseText.trim();
                    var parsed;
                    if (text.charAt(0) === '{') {
                        var w = JSON.parse(text);
                        parsed = w.contents ? JSON.parse(w.contents) : w;
                    } else {
                        parsed = JSON.parse(text);
                    }
                    var events = self._parseEvents(parsed);
                    if (events && events.length > 0) {
                        self.$fetchPending = false;
                        self.sendHTMLMessage({action:"events", events:events, source:"Live"});
                        return;
                    }
                } catch(e) {}
            }
            self._tryUrl(idx + 1);
        };
        xhr.onerror   = function() { self._tryUrl(idx + 1); };
        xhr.ontimeout = function() { self._tryUrl(idx + 1); };
        xhr.send();
    }

    _useBuiltIn() {
        var events = this._generateWeeklySchedule();
        this.sendHTMLMessage({action:"events", events:events, source:"Schedule"});
    }

    _generateWeeklySchedule() {
        var now       = new Date();
        var day       = now.getDay();
        var weekStart = new Date(now);
        weekStart.setDate(now.getDate() - day);
        weekStart.setUTCHours(0, 0, 0, 0);

        var s = [
            [1, 14,  0, "ISM Manufacturing PMI",           "high",    ["NAS100","US30"]],
            [1, 14,  0, "Construction Spending m/m",        "medium",  ["NAS100","US30"]],
            [2, 13, 30, "CPI m/m",                          "extreme", ["NAS100","US30","GOLD"]],
            [2, 13, 30, "Core CPI m/m",                     "extreme", ["NAS100","US30","GOLD"]],
            [2, 13, 30, "CPI y/y",                          "extreme", ["NAS100","US30","GOLD"]],
            [2, 15,  0, "CB Consumer Confidence",           "high",    ["NAS100","US30"]],
            [2, 15,  0, "JOLTS Job Openings",               "high",    ["NAS100","US30","GOLD"]],
            [3, 13, 15, "ADP Non-Farm Employment Change",   "high",    ["NAS100","US30","GOLD"]],
            [3, 13, 30, "PPI m/m",                          "high",    ["NAS100","US30","GOLD"]],
            [3, 13, 30, "Core PPI m/m",                     "high",    ["NAS100","US30","GOLD"]],
            [3, 15,  0, "ISM Services PMI",                 "high",    ["NAS100","US30"]],
            [3, 18,  0, "FOMC Interest Rate Decision",      "extreme", ["NAS100","US30","GOLD"]],
            [3, 18, 30, "FOMC Press Conference",            "extreme", ["NAS100","US30","GOLD"]],
            [3, 19,  0, "FOMC Meeting Minutes",             "extreme", ["NAS100","US30","GOLD"]],
            [4, 12, 30, "GDP q/q",                          "extreme", ["NAS100","US30","GOLD"]],
            [4, 13, 30, "Initial Jobless Claims",           "high",    ["NAS100","US30","GOLD"]],
            [4, 13, 30, "Continuing Jobless Claims",        "high",    ["NAS100","US30","GOLD"]],
            [4, 13, 30, "Retail Sales m/m",                 "high",    ["NAS100","US30"]],
            [4, 13, 30, "Core Retail Sales m/m",            "high",    ["NAS100","US30"]],
            [4, 13, 30, "Durable Goods Orders m/m",         "high",    ["NAS100","US30"]],
            [4, 15,  0, "Philly Fed Manufacturing Index",   "medium",  ["NAS100","US30"]],
            [5, 13, 30, "Non-Farm Payrolls",                "extreme", ["NAS100","US30","GOLD"]],
            [5, 13, 30, "Unemployment Rate",                "extreme", ["NAS100","US30","GOLD"]],
            [5, 13, 30, "Average Hourly Earnings m/m",      "high",    ["NAS100","US30","GOLD"]],
            [5, 13, 30, "Core PCE Price Index m/m",         "extreme", ["NAS100","US30","GOLD"]],
            [5, 13, 30, "PCE Price Index m/m",              "high",    ["NAS100","US30","GOLD"]],
            [5, 15,  0, "Michigan Consumer Sentiment",      "high",    ["NAS100","US30","GOLD"]]
        ];

        var events = [];
        s.forEach(function(ev) {
            var d = new Date(weekStart);
            d.setDate(weekStart.getDate() + ev[0]);
            d.setUTCHours(ev[1], ev[2], 0, 0);
            events.push({
                time:      d.getTime(),
                title:     ev[3],
                country:   "USD",
                impact:    ev[4],
                affects:   ev[5],
                forecast:  "",
                previous:  "",
                actual:    "",
                estimated: true
            });
        });
        events.sort(function(a,b){ return a.time - b.time; });
        return events;
    }

    _parseEvents(raw) {
        if (!Array.isArray(raw)) return this._generateWeeklySchedule();

        var extremeKw = ["Non-Farm","NFP","FOMC","Federal Funds Rate","Interest Rate Decision",
                         "CPI","Consumer Price Index","Fed Chair","Powell","PCE","Core PCE"];
        var highKw    = ["GDP","Retail Sales","ISM","PMI","ADP","Jobless Claims","PPI",
                         "Producer Price","Consumer Confidence","Durable Goods","JOLTS",
                         "BOE Rate","Bank of England","Employment Change","Nonfarm"];

        var affectsMap = function(title, country) {
            var a = country === "USD" ? ["NAS100","US30","GOLD"] :
                    country === "GBP" ? ["GOLD"] : [];
            var gk = ["FOMC","Fed","CPI","PCE","NFP","GDP","Rate"];
            if (gk.some(function(k){return title.indexOf(k)!==-1;}) && a.indexOf("GOLD")===-1)
                a.push("GOLD");
            return a;
        };

        var now    = Date.now();
        var cutoff = now + 72 * 3600000;
        var results = [];

        raw.forEach(function(ev) {
            if (ev.country !== "USD" && ev.country !== "GBP") return;
            var t = new Date(ev.date).getTime();
            if (isNaN(t) || t < now - 7200000 || t > cutoff) return;
            var title  = ev.title || ev.name || "";
            var impact = "medium";
            if (extremeKw.some(function(k){return title.indexOf(k)!==-1;})) impact = "extreme";
            else if (highKw.some(function(k){return title.indexOf(k)!==-1;})) impact = "high";
            else {
                var ff = (ev.impact||"").toLowerCase();
                if (ff === "high") impact = "high";
                else if (ff !== "medium") return;
            }
            results.push({
                time:      t,
                title:     title,
                country:   ev.country,
                impact:    impact,
                affects:   affectsMap(title, ev.country),
                forecast:  ev.forecast || "",
                previous:  ev.previous || "",
                actual:    ev.actual   || "",
                estimated: false
            });
        });

        results.sort(function(a,b){return a.time - b.time;});
        return results.length > 0 ? results : this._generateWeeklySchedule();
    }

    _buildCard() {
        var p      = this.$params;
        var pos    = p.position || "top-right";
        var ha     = parseInt(p.hoursAhead)  || 72;
        var ab     = parseInt(p.alertBefore) || 5;
        var ao     = p.alertsOn   === true || p.alertsOn   === "true" || p.alertsOn   === 1;
        var sm     = p.showMedium === true || p.showMedium === "true";
        var posCSS = {"top-right":"top:14px;right:14px;","top-left":"top:14px;left:14px;",
                      "bottom-right":"bottom:14px;right:14px;","bottom-left":"bottom:14px;left:14px;"}[pos]
                    || "top:14px;right:14px;";

        var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
+ '* { box-sizing:border-box; margin:0; padding:0; }'
+ 'html,body { background:transparent; overflow:hidden; pointer-events:none; font-family:-apple-system,"Segoe UI",Arial,sans-serif; }'
+ '#card { pointer-events:all; position:fixed; ' + posCSS + ' width:288px; background:#0d0f1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px; box-shadow:0 16px 60px rgba(0,0,0,0.8); overflow:hidden; }'
+ '.accent { height:3px; background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4,#6366f1); background-size:300% 100%; animation:shimmer 4s linear infinite; }'
+ '@keyframes shimmer { 0%{background-position:0% 0} 100%{background-position:300% 0} }'
+ '.hdr { display:flex; align-items:center; justify-content:space-between; padding:10px 13px 9px; cursor:grab; user-select:none; border-bottom:1px solid rgba(255,255,255,0.06); }'
+ '.hdr:active { cursor:grabbing; }'
+ '.hdr-l { display:flex; align-items:center; gap:8px; }'
+ '.logo { width:22px; height:22px; background:linear-gradient(135deg,#6366f1,#06b6d4); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:11px; }'
+ '.brand { font-size:10px; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; color:rgba(255,255,255,0.55); }'
+ '.hdr-r { display:flex; align-items:center; gap:8px; }'
+ '.live-badge { display:flex; align-items:center; gap:4px; background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.25); border-radius:20px; padding:2px 7px; }'
+ '.live-dot { width:5px; height:5px; border-radius:50%; background:#22c55e; animation:pulse 2s infinite; }'
+ '.live-txt { font-size:8px; font-weight:700; color:#22c55e; letter-spacing:1px; }'
+ '@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }'
+ '.cbtn { background:rgba(255,255,255,0.06); border:none; cursor:pointer; color:rgba(255,255,255,0.4); font-size:10px; padding:3px 7px; border-radius:5px; }'
+ '#body { max-height:370px; overflow-y:auto; overflow-x:hidden; }'
+ '#body::-webkit-scrollbar { width:2px; }'
+ '#body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }'
+ '.empty { padding:24px 14px; text-align:center; color:rgba(255,255,255,0.25); font-size:11px; line-height:1.8; }'
+ '.ev { position:relative; padding:11px 13px 10px 14px; border-bottom:1px solid rgba(255,255,255,0.045); }'
+ '.ev:last-child { border-bottom:none; }'
+ '.ev.past { opacity:0.28; }'
+ '.bar { position:absolute; left:0; top:8px; bottom:8px; width:3px; border-radius:0 3px 3px 0; }'
+ '.bar.extreme { background:linear-gradient(180deg,#f87171,#ef4444); box-shadow:0 0 8px rgba(239,68,68,0.6); }'
+ '.bar.high { background:linear-gradient(180deg,#fb923c,#f97316); box-shadow:0 0 5px rgba(249,115,22,0.4); }'
+ '.bar.medium { background:#eab308; }'
+ '.ev-type { display:inline-block; font-size:8px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:2px 6px; border-radius:4px; margin-bottom:5px; }'
+ '.ev-type.nfp    { background:rgba(239,68,68,0.18);   color:#fca5a5; }'
+ '.ev-type.fomc   { background:rgba(139,92,246,0.2);   color:#c4b5fd; }'
+ '.ev-type.cpi    { background:rgba(249,115,22,0.18);  color:#fdba74; }'
+ '.ev-type.pce    { background:rgba(236,72,153,0.15);  color:#f9a8d4; }'
+ '.ev-type.gdp    { background:rgba(34,197,94,0.15);   color:#86efac; }'
+ '.ev-type.speech { background:rgba(6,182,212,0.15);   color:#67e8f9; }'
+ '.ev-type.jobs   { background:rgba(234,179,8,0.15);   color:#fde68a; }'
+ '.ev-type.pmi    { background:rgba(99,102,241,0.18);  color:#a5b4fc; }'
+ '.ev-type.sales  { background:rgba(20,184,166,0.15);  color:#5eead4; }'
+ '.ev-type.other  { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.4); }'
+ '.r1 { display:flex; align-items:flex-start; justify-content:space-between; gap:6px; margin-bottom:5px; }'
+ '.ev-name { font-size:12px; font-weight:600; color:rgba(255,255,255,0.92); line-height:1.3; flex:1; }'
+ '.ctag { font-size:8px; font-weight:700; padding:2px 6px; border-radius:20px; letter-spacing:0.5px; flex-shrink:0; margin-top:1px; }'
+ '.ctag.USD { background:rgba(99,102,241,0.2); color:#818cf8; }'
+ '.ctag.GBP { background:rgba(168,85,247,0.2); color:#c084fc; }'
+ '.r2 { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }'
+ '.ev-time { font-size:11px; color:rgba(255,255,255,0.35); }'
+ '.ev-cd { font-size:12px; font-weight:700; }'
+ '.ev-cd.now   { color:#f87171; animation:blink 0.7s infinite; }'
+ '.ev-cd.soon  { color:#f87171; }'
+ '.ev-cd.close { color:#fb923c; }'
+ '.ev-cd.ahead { color:rgba(255,255,255,0.4); }'
+ '.ev-cd.gone  { color:rgba(255,255,255,0.18); }'
+ '@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }'
+ '.r3 { display:flex; gap:4px; margin-bottom:5px; }'
+ '.itag { font-size:9px; font-weight:700; padding:2px 8px; border-radius:20px; letter-spacing:0.3px; }'
+ '.itag.nas  { background:rgba(6,182,212,0.15);  color:#22d3ee; border:1px solid rgba(6,182,212,0.25); }'
+ '.itag.dow  { background:rgba(99,102,241,0.15); color:#818cf8; border:1px solid rgba(99,102,241,0.25); }'
+ '.itag.gold { background:rgba(234,179,8,0.15);  color:#fbbf24; border:1px solid rgba(234,179,8,0.25); }'
+ '.r4 { display:flex; gap:10px; }'
+ '.dp { font-size:9px; color:rgba(255,255,255,0.28); }'
+ '.dp b { color:rgba(255,255,255,0.58); }'
+ '.dp b.act { color:#4ade80; }'
+ '.est-lbl { font-size:8px; color:rgba(255,255,255,0.18); font-style:italic; margin-top:3px; }'
+ '.ftr { display:flex; align-items:center; justify-content:space-between; padding:8px 13px; border-top:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.015); }'
+ '.ftr-clk { font-size:10px; color:rgba(255,255,255,0.22); }'
+ '.ftr-r { display:flex; align-items:center; gap:10px; }'
+ '.ftr-src { font-size:8px; color:rgba(255,255,255,0.18); }'
+ '.ftr-btn { background:none; border:none; cursor:pointer; font-size:9px; color:rgba(255,255,255,0.3); padding:0; }'
+ '</style></head><body>'
+ '<div id="card">'
+ '<div class="accent"></div>'
+ '<div class="hdr" id="dragHdr">'
+ '<div class="hdr-l"><div class="logo">&#128240;</div><span class="brand">Market News</span></div>'
+ '<div class="hdr-r">'
+ '<div class="live-badge"><span class="live-dot"></span><span class="live-txt">LIVE</span></div>'
+ '<button class="cbtn" id="cbtn" onclick="event.stopPropagation();toggleCollapse()">&#9650;</button>'
+ '</div></div>'
+ '<div id="body"><div class="empty">Loading events...</div></div>'
+ '<div class="ftr"><span class="ftr-clk" id="clk">--:--:--</span>'
+ '<div class="ftr-r"><span class="ftr-src" id="src"></span>'
+ '<button class="ftr-btn" onclick="doRefresh()">&#8635; refresh</button>'
+ '</div></div></div>'
+ '<script>'
+ 'var collapsed=false,allEvents=[],alerted={},'
+ 'hoursAhead=' + ha + ',alertBefore=' + ab + ',alertsOn=' + (ao?'true':'false') + ',showMedium=' + (sm?'true':'false') + ';'
+ 'function getType(t){'
+ 'var u=t.toUpperCase();'
+ 'if(u.indexOf("NON-FARM")!==-1||u.indexOf("NFP")!==-1||u.indexOf("NONFARM")!==-1) return {c:"nfp",l:"NFP"};'
+ 'if(u.indexOf("FOMC")!==-1||u.indexOf("FEDERAL FUNDS")!==-1||u.indexOf("INTEREST RATE")!==-1) return {c:"fomc",l:"FOMC"};'
+ 'if(u.indexOf("CPI")!==-1||u.indexOf("CONSUMER PRICE")!==-1) return {c:"cpi",l:"CPI"};'
+ 'if(u.indexOf("PCE")!==-1) return {c:"pce",l:"PCE"};'
+ 'if(u.indexOf("GDP")!==-1) return {c:"gdp",l:"GDP"};'
+ 'if(u.indexOf("SPEECH")!==-1||u.indexOf("TESTIMONY")!==-1||u.indexOf("POWELL")!==-1||u.indexOf("SPEAKS")!==-1||u.indexOf("FED CHAIR")!==-1) return {c:"speech",l:"SPEECH"};'
+ 'if(u.indexOf("BARKIN")!==-1||u.indexOf("WALLER")!==-1||u.indexOf("WILLIAMS")!==-1||u.indexOf("DALY")!==-1) return {c:"speech",l:"FED"};'
+ 'if(u.indexOf("JOBLESS")!==-1||u.indexOf("EMPLOYMENT")!==-1||u.indexOf("ADP")!==-1||u.indexOf("PAYROLL")!==-1||u.indexOf("UNEMPLOYMENT")!==-1) return {c:"jobs",l:"JOBS"};'
+ 'if(u.indexOf("PMI")!==-1||u.indexOf("ISM")!==-1) return {c:"pmi",l:"PMI"};'
+ 'if(u.indexOf("RETAIL")!==-1||u.indexOf("SALES")!==-1) return {c:"sales",l:"SALES"};'
+ 'if(u.indexOf("PPI")!==-1||u.indexOf("PRODUCER")!==-1) return {c:"cpi",l:"PPI"};'
+ 'return {c:"other",l:"DATA"};'
+ '}'
+ 'function cd(ms){'
+ 'if(ms<-300000){var a=Math.abs(ms);return a<3600000?Math.round(a/60000)+"m ago":Math.round(a/3600000)+"h ago";}'
+ 'if(ms>=0&&ms<60000)return "NOW";'
+ 'var m=Math.floor(ms/60000),h=Math.floor(m/60),d=Math.floor(h/24);'
+ 'if(d>0)return d+"d "+(h%24)+"h";if(h>0)return h+"h "+(m%60)+"m";return m+"m";'
+ '}'
+ 'function cdCls(ms){if(ms<0)return"gone";if(ms<60000)return"now";if(ms<300000)return"soon";if(ms<1800000)return"close";return"ahead";}'
+ 'function fmt(ts){var d=new Date(ts);return d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0");}'
+ 'function render(){'
+ 'var el=document.getElementById("body"),now=Date.now(),cut=now+hoursAhead*3600000;'
+ 'var vis=allEvents.filter(function(e){if(e.time<now-7200000||e.time>cut)return false;if(!showMedium&&e.impact==="medium")return false;return true;});'
+ 'if(!vis.length){el.innerHTML=\'<div class="empty">No events in next \'+hoursAhead+\'h<br><span style="font-size:9px;opacity:0.6">Try refresh or increase hours</span></div>\';return;}'
+ 'var h="";'
+ 'vis.forEach(function(ev){'
+ 'var ms=ev.time-now,past=ms<-300000,aff=ev.affects||[],tp=getType(ev.title);'
+ 'var tags=aff.map(function(a){var c=a==="NAS100"?"nas":a==="US30"?"dow":"gold";return\'<span class="itag \'+c+\'">\'+a+"</span>";}).join("");'
+ 'var data="";'
+ 'if(ev.forecast||ev.previous||ev.actual){'
+ 'data=\'<div class="r4">\';'
+ 'if(ev.forecast)data+=\'<span class="dp">F: <b>\'+ev.forecast+"</b></span>";'
+ 'if(ev.previous)data+=\'<span class="dp">P: <b>\'+ev.previous+"</b></span>";'
+ 'if(ev.actual)data+=\'<span class="dp">A: <b class="act">\'+ev.actual+"</b></span>";'
+ 'data+="</div>";'
+ '}'
+ 'h+=\'<div class="ev\'+(past?" past":"")+\'">\';'
+ 'h+=\'<div class="bar \'+ev.impact+\'"></div>\';'
+ 'h+=\'<span class="ev-type \'+tp.c+\'">\'+tp.l+"</span>";'
+ 'h+=\'<div class="r1"><span class="ev-name">\'+ev.title+\'</span><span class="ctag \'+ev.country+\'">\'+ev.country+"</span></div>";'
+ 'h+=\'<div class="r2"><span class="ev-time">\'+fmt(ev.time)+\'</span><span class="ev-cd \'+cdCls(ms)+\'">\'+cd(ms)+"</span></div>";'
+ 'if(tags)h+=\'<div class="r3">\'+tags+"</div>";'
+ 'if(data)h+=data;'
+ 'if(ev.estimated)h+=\'<div class="est-lbl">estimated time</div>\';'
+ 'h+="</div>";'
+ 'if(alertsOn&&ms>0&&ms<=alertBefore*60000){'
+ 'var key=String(ev.time);'
+ 'if(!alerted[key]){alerted[key]=true;window.parent.postMessage({action:"newsAlert",title:ev.title,type:tp.l,time:fmt(ev.time),impact:ev.impact,mins:Math.ceil(ms/60000)},"*");}'
+ '}'
+ '});'
+ 'el.innerHTML=h;'
+ '}'
+ 'setInterval(function(){var n=new Date(),el=document.getElementById("clk");if(el)el.textContent=n.getHours().toString().padStart(2,"0")+":"+n.getMinutes().toString().padStart(2,"0")+":"+n.getSeconds().toString().padStart(2,"0");},1000);'
+ 'setInterval(render,30000);'
+ 'function toggleCollapse(){collapsed=!collapsed;var b=document.getElementById("body"),btn=document.getElementById("cbtn");b.style.display=collapsed?"none":"block";btn.innerHTML=collapsed?"&#9660;":"&#9650;";}'
+ 'function doRefresh(){var d=document.querySelector(".live-dot");if(d){d.style.background="#f97316";setTimeout(function(){d.style.background="#22c55e";},2000);}window.parent.postMessage({action:"refresh"},"*");}'
+ '(function(){'
+ 'var card=document.getElementById("card"),hdr=document.getElementById("dragHdr");'
+ 'var drag=false,sx=0,sy=0,ox=0,oy=0;'
+ 'hdr.addEventListener("mousedown",function(e){'
+   'if(e.target.tagName==="BUTTON")return;'
+   'drag=true;'
+   'var r=card.getBoundingClientRect();'
+   'ox=r.left; oy=r.top; sx=e.clientX; sy=e.clientY;'
+   'card.style.right="auto"; card.style.bottom="auto";'
+   'card.style.left=ox+"px"; card.style.top=oy+"px";'
+   'card.style.willChange="left,top";'
+   'e.preventDefault();'
+ '});'
+ 'document.addEventListener("mousemove",function(e){'
+   'if(!drag)return;'
+   'card.style.left=(ox+(e.clientX-sx))+"px";'
+   'card.style.top=(oy+(e.clientY-sy))+"px";'
+ '});'
+ 'document.addEventListener("mouseup",function(){if(drag){drag=false;card.style.willChange="auto";}});'
+ 'card.addEventListener("wheel",function(e){e.stopPropagation();window.parent.postMessage({action:"wheelEvent",deltaY:e.deltaY,ctrlKey:e.ctrlKey},"*");},{passive:true});'
+ '}());'
+ 'window.addEventListener("message",function(e){var d=e.data;if(!d)return;'
+ 'if(d.action==="events"){allEvents=d.events||[];var s=document.getElementById("src");if(s)s.textContent=d.source||"";render();}'
+ 'if(d.action==="updateSettings"){var p=d.params||{};hoursAhead=parseInt(p.hoursAhead)||72;alertBefore=parseInt(p.alertBefore)||5;alertsOn=p.alertsOn===true||p.alertsOn==="true";showMedium=p.showMedium===true||p.showMedium==="true";render();}'
+ '});'
+ 'window.parent.postMessage({action:"ready"},"*");'
+ '</script></body></html>';

        this.createHTML({
            foreground: true,
            style: { width:"304px", height:"520px", right:"14px", top:"14px" },
            html: html
        });
    }

    _beep(impact) {
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            var ctx = new AC();
            var now = ctx.currentTime;
            var t = function(f,s,d) {
                var o=ctx.createOscillator(), g=ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type="sine"; o.frequency.value=f;
                g.gain.setValueAtTime(0.28,now+s);
                g.gain.exponentialRampToValueAtTime(0.001,now+s+d);
                o.start(now+s); o.stop(now+s+d+0.05);
            };
            if (impact==="extreme") { t(880,0,0.12); t(880,0.18,0.12); t(880,0.36,0.22); }
            else if (impact==="high") { t(660,0,0.14); t(880,0.17,0.22); }
            else { t(550,0,0.22); }
        } catch(e) {}
    }

    _sendTelegram(token, chatId, message) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST","https://api.telegram.org/bot"+encodeURIComponent(token)+"/sendMessage",true);
            xhr.setRequestHeader("Content-Type","application/json");
            xhr.send(JSON.stringify({chat_id:chatId, text:message, parse_mode:"HTML"}));
        } catch(e) {}
    }
}