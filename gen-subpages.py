#!/usr/bin/env python3
"""
Regenerate the 17 Zbroo subpages (9 city + 8 brand) in the
"Variant C — Houston green neon" identity.

Preserves verbatim from each existing page:
  <title>, meta description, canonical, robots, geo tags, og tags,
  and the ENTIRE JSON-LD script content.
Re-extracts the page copy (eyebrow, h1, hero paragraph, body section,
cards, FAQ Q&A, nearby links) and re-renders it in the new design.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

DIRS = [
    "appliance-repair-houston", "appliance-repair-sugar-land",
    "appliance-repair-katy", "appliance-repair-cypress",
    "appliance-repair-spring", "appliance-repair-the-woodlands",
    "appliance-repair-pearland", "appliance-repair-pasadena",
    "appliance-repair-conroe",
    "samsung-appliance-repair", "lg-appliance-repair",
    "whirlpool-appliance-repair", "ge-appliance-repair",
    "bosch-appliance-repair", "sub-zero-appliance-repair",
    "kitchenaid-appliance-repair", "maytag-appliance-repair",
]


def grab(pattern, html, flags=re.S):
    m = re.search(pattern, html, flags)
    return m.group(1) if m else None


def extract(html):
    d = {}
    d["title"] = grab(r"<title>(.*?)</title>", html)
    d["description"] = grab(r'<meta name="description" content="(.*?)"', html)
    d["canonical"] = grab(r'<link rel="canonical" href="(.*?)"', html)
    d["robots"] = grab(r'<meta name="robots" content="(.*?)"', html)
    d["geo_region"] = grab(r'<meta name="geo.region" content="(.*?)"', html)
    d["geo_placename"] = grab(r'<meta name="geo.placename" content="(.*?)"', html)
    d["og_title"] = grab(r'<meta property="og:title" content="(.*?)"', html)
    d["og_description"] = grab(r'<meta property="og:description" content="(.*?)"', html)
    d["og_url"] = grab(r'<meta property="og:url" content="(.*?)"', html)
    d["og_type"] = grab(r'<meta property="og:type" content="(.*?)"', html)
    d["jsonld"] = grab(r'<script type="application/ld\+json">(.*?)</script>', html)

    # hero copy
    d["eyebrow"] = grab(r'<span class="eyebrow">(.*?)</span>', html)
    d["h1"] = grab(r"<h1>(.*?)</h1>", html)
    d["hero_p"] = grab(r"<h1>.*?</h1><p>(.*?)</p>", html)

    # main body section
    d["body_h2"] = grab(r'<section><div class="wrap"><h2>(.*?)</h2>', html)
    d["body_ps"] = re.findall(r'<p class="body">(.*?)</p>', html, re.S)
    d["cards"] = re.findall(
        r'<div class="card"><h3>(.*?)</h3><p>(.*?)</p></div>', html, re.S)

    # FAQ
    d["faq_h2"] = grab(r"<h2>(FAQ[^<]*)</h2>", html)
    d["faq"] = re.findall(
        r"<details><summary>(.*?)</summary><p>(.*?)</p></details>", html, re.S)

    # nearby links
    near = grab(r'<h2>((?:We also serve|Other brands)[^<]*)</h2><div class="chips">(.*?)</div>',
                html)
    m = re.search(r'<h2>((?:We also serve|Other brands)[^<]*)</h2><div class="chips">(.*?)</div>',
                  html, re.S)
    if m:
        d["near_h2"] = m.group(1)
        d["near_links"] = re.findall(r'<a href="(.*?)">(.*?)</a>', m.group(2))
    else:
        d["near_h2"], d["near_links"] = None, []
    return d


CSS = """
:root{
  --forest:#06241A;--ink:#131C16;--neon:#16C172;--paper:#F3F5EF;
  --slate:#6B776D;--g900:#084F30;--g700:#0C8B51;--g200:#97E6BD;
  --rule:rgba(12,139,81,.3);
  --glow-sm:0 0 6px rgba(22,193,114,.55),0 0 18px rgba(22,193,114,.30);
  --glow-md:0 0 8px rgba(22,193,114,.65),0 0 24px rgba(22,193,114,.38),0 0 64px rgba(22,193,114,.18);
  --disp:'Anton',Impact,'Arial Narrow',sans-serif;
  --body:'Karla',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --mono:'IBM Plex Mono','SFMono-Regular',Consolas,monospace;
  --pad:clamp(20px,5vw,72px);
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--forest);color:var(--paper);font-family:var(--body);font-weight:400;font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--neon);color:var(--ink)}
a{color:inherit;text-decoration:none}
.grain{position:fixed;inset:-50%;width:200%;height:200%;pointer-events:none;z-index:9000;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");opacity:.045}
.micro{font-family:var(--mono);font-weight:400;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--slate)}
.micro .tick{color:var(--g700)}
.btn{display:inline-block;font-family:var(--body);font-weight:700;font-size:14px;padding:13px 24px;border-radius:3px;cursor:pointer;border:1px solid transparent;transition:transform .2s,box-shadow .25s,color .2s,border-color .2s}
.btn-solid{background:var(--neon);color:var(--ink)}
.btn-solid:hover{box-shadow:0 0 22px rgba(22,193,114,.45);transform:translateY(-1px)}
.btn-outline{background:transparent;color:var(--paper);border-color:rgba(22,193,114,.5)}
.btn-outline:hover{border-color:var(--neon);color:var(--neon);box-shadow:0 0 16px rgba(22,193,114,.18)}
header{position:sticky;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px var(--pad);background:rgba(6,36,26,.93);border-bottom:1px solid var(--rule)}
.logo{font-family:var(--body);font-weight:800;font-size:24px;letter-spacing:-.02em;color:var(--paper);line-height:1}
.logo .dot{color:var(--neon);text-shadow:var(--glow-md)}
.head-right{display:flex;align-items:center;gap:22px}
.open-sign{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;color:var(--neon);border:1px solid rgba(22,193,114,.45);border-radius:2px;padding:6px 11px;white-space:nowrap;text-shadow:var(--glow-sm);box-shadow:0 0 10px rgba(22,193,114,.12),inset 0 0 10px rgba(22,193,114,.06);animation:signBreath 4.5s ease-in-out infinite}
@keyframes signBreath{0%,100%{text-shadow:0 0 5px rgba(22,193,114,.45),0 0 14px rgba(22,193,114,.22)}50%{text-shadow:0 0 8px rgba(22,193,114,.7),0 0 26px rgba(22,193,114,.4)}}
.head-phone{font-family:var(--mono);font-size:13px;color:var(--paper);letter-spacing:.02em;white-space:nowrap;border-bottom:1px solid transparent;transition:color .2s,border-color .2s}
.head-phone:hover{color:var(--neon);border-color:var(--g700)}
.hero{padding:clamp(56px,9vh,110px) var(--pad) clamp(48px,7vh,88px);border-bottom:1px solid var(--rule)}
.hero .micro{margin-bottom:clamp(20px,3vh,34px)}
.hero h1{font-family:var(--disp);font-weight:400;text-transform:uppercase;font-size:clamp(38px,7vw,92px);line-height:.98;letter-spacing:.005em;color:var(--paper);margin-bottom:clamp(20px,3vh,32px);max-width:18ch}
.hero h1 .nw{color:var(--neon);text-shadow:var(--glow-md)}
.hero p{max-width:60ch;color:var(--paper);font-size:clamp(16px,1.3vw,19px);margin-bottom:clamp(24px,4vh,38px)}
.hero-ctas{display:flex;gap:14px;flex-wrap:wrap}
.hero-ctas .btn{padding:15px 28px;font-size:15px}
section.sec{padding:clamp(56px,9vh,104px) var(--pad)}
.sec-head{display:flex;align-items:baseline;gap:18px;margin-bottom:clamp(30px,5vh,50px);border-bottom:1px solid var(--rule);padding-bottom:16px}
.sec-index{font-family:var(--mono);font-size:13px;color:var(--g700);letter-spacing:.15em}
.sec-title{font-family:var(--disp);font-weight:400;text-transform:uppercase;font-size:clamp(24px,3vw,40px);letter-spacing:.01em}
p.body{color:var(--g200);font-weight:400;max-width:76ch;margin-bottom:16px;font-size:16.5px}
p.body b,p.body strong{color:var(--paper)}
.rows{margin-top:clamp(28px,4vh,44px)}
.row{display:grid;grid-template-columns:64px minmax(160px,320px) 1fr;gap:clamp(16px,3vw,48px);align-items:baseline;padding:clamp(18px,2.8vh,26px) 0;border-bottom:1px solid var(--rule)}
.row:first-child{border-top:1px solid var(--rule)}
.row-idx{font-family:var(--mono);font-size:13px;color:var(--slate)}
.row h3{font-family:var(--disp);font-weight:400;text-transform:uppercase;font-size:clamp(20px,2.2vw,30px);letter-spacing:.01em;color:var(--paper)}
.row p{color:var(--slate);font-size:15px}
.faq-wrap{max-width:880px}
.faq-item{border-bottom:1px solid var(--rule)}
.faq-item:first-of-type{border-top:1px solid var(--rule)}
.faq-item summary{cursor:pointer;list-style:none;display:flex;align-items:baseline;justify-content:space-between;gap:20px;padding:20px 0;font-family:var(--body);font-weight:700;font-size:17px;color:var(--paper);transition:color .2s}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary .plus{font-family:var(--mono);font-size:18px;color:var(--g700);flex:none;transition:transform .3s,color .25s,text-shadow .25s}
.faq-item summary:hover{color:var(--g200)}
.faq-item[open] summary{color:var(--neon)}
.faq-item[open] summary .plus{transform:rotate(45deg);color:var(--neon);text-shadow:var(--glow-sm)}
.faq-item p{color:var(--slate);padding:0 0 20px;max-width:70ch}
.link-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));border-top:1px solid var(--rule);border-left:1px solid var(--rule)}
.link-grid a{font-family:var(--mono);font-weight:400;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--paper);border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:18px;display:flex;align-items:center;justify-content:space-between;gap:10px;transition:color .2s,background .2s}
.link-grid a::after{content:"\\2192";color:var(--g900);transition:color .2s,transform .25s}
.link-grid a:hover{color:var(--neon);background:rgba(22,193,114,.04)}
.link-grid a:hover::after{color:var(--neon);transform:translateX(4px)}
.cta-band{background:var(--ink);border-top:1px solid var(--rule);text-align:center;padding:clamp(56px,9vh,104px) var(--pad)}
.cta-band h2{font-family:var(--disp);font-weight:400;text-transform:uppercase;font-size:clamp(34px,5.5vw,76px);line-height:1;margin-bottom:16px}
.cta-band h2 .nw{color:var(--neon);text-shadow:var(--glow-md)}
.cta-band p{color:var(--slate);max-width:46ch;margin:0 auto 28px}
.cta-band .btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
footer{background:var(--forest);border-top:1px solid var(--rule);padding:clamp(44px,7vh,72px) var(--pad) 32px}
.foot-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(32px,5vw,80px);margin-bottom:clamp(36px,6vh,56px)}
.foot-logo{font-size:30px}
.foot-tag{margin-top:12px;color:var(--slate);font-size:15px;max-width:34ch}
.foot-col h4{font-family:var(--mono);font-size:10.5px;font-weight:400;letter-spacing:.18em;text-transform:uppercase;color:var(--g700);margin-bottom:16px}
.foot-contact a{display:block;font-family:var(--mono);font-size:13.5px;color:var(--paper);margin-bottom:11px;transition:color .2s}
.foot-contact a:hover{color:var(--neon)}
.foot-bottom{border-top:1px solid var(--rule);padding-top:22px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;color:var(--slate);text-transform:uppercase}
.sticky-call{position:fixed;right:16px;bottom:16px;z-index:1100;display:none;font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;background:var(--neon);color:var(--ink);font-weight:500;padding:14px 20px;border-radius:3px;box-shadow:0 0 18px rgba(22,193,114,.55),0 0 48px rgba(22,193,114,.25)}
@media (max-width:860px){.row{grid-template-columns:48px 1fr}.row p{grid-column:2}}
@media (max-width:760px){.open-sign,.head-phone{display:none}.sticky-call{display:block}.hero-ctas .btn{width:100%;text-align:center}.foot-grid{grid-template-columns:1fr}.link-grid{grid-template-columns:1fr 1fr}}
@media (max-width:460px){.link-grid{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}}
""".strip()


def render(d, slug):
    geo = ""
    if d["geo_region"]:
        geo += f'<meta name="geo.region" content="{d["geo_region"]}"/>'
    if d["geo_placename"]:
        geo += f'<meta name="geo.placename" content="{d["geo_placename"]}"/>'

    # hero h1: light up the city / brand part if pattern matches
    h1 = d["h1"]
    m = re.match(r"^(.*?\bin\b)(.*)$", h1)
    if m and m.group(2).strip():
        h1_html = f'{m.group(1)}<span class="nw">{m.group(2)}</span>'
    else:
        h1_html = h1

    body_ps = "\n".join(f'<p class="body">{p}</p>' for p in d["body_ps"])

    rows = "\n".join(
        f'''<div class="row"><span class="row-idx">/0{i+1}</span><h3>{h}</h3><p>{p}</p></div>'''
        for i, (h, p) in enumerate(d["cards"]))

    faq = "\n".join(
        f'''<details class="faq-item"><summary>{q} <span class="plus">+</span></summary><p>{a}</p></details>'''
        for q, a in d["faq"])

    near = "\n".join(f'<a href="{href}">{label}</a>'
                     for href, label in d["near_links"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{d["title"]}</title>
<meta name="description" content="{d["description"]}"/>
<meta name="theme-color" content="#06241A"/>
<link rel="canonical" href="{d["canonical"]}"/>
<meta name="robots" content="{d["robots"]}"/>
{geo}<meta property="og:title" content="{d["og_title"]}"/>
<meta property="og:description" content="{d["og_description"]}"/>
<meta property="og:url" content="{d["og_url"]}"/>
<meta property="og:type" content="{d["og_type"]}"/>
<script type="application/ld+json">{d["jsonld"]}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Karla:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
{CSS}
</style>
</head>
<body>
<div class="grain" aria-hidden="true"></div>

<header>
  <a href="/" class="logo" aria-label="zbroo home">zbroo<span class="dot">.</span></a>
  <div class="head-right">
    <span class="open-sign">OPEN NOW &middot; 7AM&ndash;9PM</span>
    <a class="head-phone" href="tel:+12819369141">(281) 936-9141</a>
    <a class="btn btn-solid" href="/#quote">Get a quote</a>
  </div>
</header>

<section class="hero">
  <p class="micro">{d["eyebrow"]} <span class="tick">&middot;</span> LICENSED &amp; INSURED</p>
  <h1>{h1_html}</h1>
  <p>{d["hero_p"]}</p>
  <div class="hero-ctas">
    <a class="btn btn-solid" href="/#quote">Get a free quote</a>
    <a class="btn btn-outline" href="tel:+12819369141">Call (281) 936-9141</a>
  </div>
</section>

<section class="sec">
  <div class="sec-head">
    <span class="sec-index">01</span>
    <h2 class="sec-title">{d["body_h2"]}</h2>
  </div>
  {body_ps}
  <div class="rows">
{rows}
  </div>
</section>

<section class="sec" style="background:var(--ink)">
  <div class="sec-head">
    <span class="sec-index">02</span>
    <h2 class="sec-title">{d["faq_h2"]}</h2>
  </div>
  <div class="faq-wrap">
{faq}
  </div>
</section>

<section class="sec">
  <div class="sec-head">
    <span class="sec-index">03</span>
    <h2 class="sec-title">{d["near_h2"]}</h2>
  </div>
  <nav class="link-grid" aria-label="{d["near_h2"]}">
{near}
  </nav>
</section>

<section class="cta-band">
  <h2>One call. <span class="nw">Fixed.</span></h2>
  <p>Free, no-obligation quote from a trusted local pro. Open 7am&ndash;9pm, seven days a week.</p>
  <div class="btns">
    <a class="btn btn-solid" href="/#quote">Get my free quote</a>
    <a class="btn btn-outline" href="tel:+12819369141">Call (281) 936-9141</a>
  </div>
</section>

<footer>
  <div class="foot-grid">
    <div>
      <div class="logo foot-logo">zbroo<span class="dot">.</span></div>
      <p class="foot-tag">Same-day appliance repair and trusted home services across Houston and Texas. Licensed &amp; insured pros.</p>
    </div>
    <div class="foot-col foot-contact">
      <h4>Contact</h4>
      <a href="tel:+12819369141">(281) 936-9141</a>
      <a href="mailto:aaron@zbroo.com">aaron@zbroo.com</a>
      <a href="/">Home</a>
      <a href="/#services">Services</a>
      <a href="/#faq">FAQ</a>
    </div>
  </div>
  <div class="foot-bottom">
    <span>&copy; <span id="yr"></span> Zbroo &middot; Houston, TX</span>
    <span>Licensed &amp; insured &middot; Serving Greater Houston</span>
  </div>
</footer>

<a class="sticky-call" href="tel:+12819369141">Call now</a>
<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>
</body>
</html>
"""


def main():
    ok = 0
    for slug in DIRS:
        path = ROOT / slug / "index.html"
        html = path.read_text(encoding="utf-8")
        d = extract(html)

        missing = [k for k in ("title", "description", "canonical", "robots",
                               "og_title", "og_description", "og_url", "og_type",
                               "jsonld", "eyebrow", "h1", "hero_p", "body_h2",
                               "faq_h2", "near_h2")
                   if not d.get(k)]
        if missing or len(d["cards"]) != 3 or len(d["faq"]) < 4 or not d["near_links"]:
            sys.exit(f"EXTRACTION FAILED for {slug}: missing={missing} "
                     f"cards={len(d['cards'])} faq={len(d['faq'])} "
                     f"near={len(d['near_links'])}")

        # validate JSON-LD before re-embedding
        json.loads(d["jsonld"])

        out = render(d, slug)
        # confirm JSON-LD survived verbatim
        assert d["jsonld"] in out, f"JSON-LD not embedded verbatim in {slug}"
        path.write_text(out, encoding="utf-8")
        ok += 1
        print(f"OK  {slug}  (jsonld {len(d['jsonld'])} bytes, "
              f"{len(d['faq'])} faq, {len(d['near_links'])} nearby links)")
    print(f"\n{ok}/{len(DIRS)} subpages regenerated.")


if __name__ == "__main__":
    main()
