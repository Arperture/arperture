# GEO Audit — Yield Bookkeeping Services, LLC

**Generative Engine Optimization audit** · `yieldbookkeeping.com` · Brambleton / Leesburg / Ashburn, VA
**Audit date:** 20 Jun 2026 · **Prepared by:** Arperture

> **Open `index.html` in any browser** for the full interactive dashboard (scores, prompt-test matrix, action board, citation map). This file is the written executive summary.

---

## Overall GEO Readiness: **43 / 100 — Grade D (Needs Work)**

| Pillar | Weight | Score |
|---|---|---|
| 🤖 AI Crawler Accessibility | 25% | **20** · Critical |
| 🔎 Generative Visibility / Share of Voice | 25% | **40** · Needs work |
| 🧱 Structured Data & Answer-Readiness | 15% | **35** · Needs work |
| 📍 Entity & NAP Consistency | 10% | **55** · Needs work |
| 🔗 Off-site Citations & Authority | 15% | **75** · Strong |
| ⭐ E-E-A-T & Reviews | 10% | **60** · Needs work |

---

## The one-paragraph story

Yield **wins branded and hyper-local AI answers** — ask an engine "best bookkeeper in Loudoun County" and Yield is named first, pulled from LoudounNow, Yelp and its 6-year award record. But Yield is **invisible on the high-value, non-branded queries** ("best remote bookkeeping for small business in Virginia"), where competitors like Remote Books Online are cited instead. The **root cause** is technical: the website returns **HTTP 403 to non-browser agents**, which blocks (or risks blocking) AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended). Engines therefore cite third-party directories *about* Yield rather than Yield's own pages — and never quote its services or differentiators directly. The off-site footprint and awards are a strong base; fix crawl access and add answer-ready content and visibility can climb quickly.

---

## Prompt-test results (ground truth)

| Prompt | Intent | Yield cited? | Notes |
|---|---|---|---|
| "Best bookkeepers in Loudoun County / Brambleton VA" | Local | ✅ **1st** | Via LoudounNow, Yelp, awards |
| "Yield Bookkeeping reviews" | Branded | ✅ Yes | Via LinkedIn, BBB, Yelp |
| "Remote bookkeeping for small business in Virginia" | Commercial | ❌ No | Remote Books Online dominates |
| "Best outsourced bookkeeping for startups / nonprofits" | Commercial | ❌ No | National players cited |
| "QuickBooks bookkeeper near Ashburn VA" | Local service | ⚠️ Partial | In lists, not primary rec |

---

## Findings

**Critical**
1. **AI crawlers blocked** — homepage returns `403 Forbidden` to non-browser user-agents; WAF/security plugin likely filtering AI bots too.
2. **Zero share-of-voice on non-branded commercial queries** — the prompts that win nationwide clients.

**High**
3. No detectable answer-ready/structured content (FAQ schema, quotable stats, comparison pages).
4. No `llms.txt`; `sitemap.xml`/`robots.txt` unverifiable behind the 403.

**Medium**
5. NAP inconsistency — Brambleton vs Leesburg vs Ashburn (ZIP 20148).
6. Not BBB-accredited; one prominent negative public review.

**Strengths**
- Deep off-site citation graph (LinkedIn, Yelp, BBB, Crunchbase, ZoomInfo, Chamber, etc.).
- Founder authority (Rochelle Dallons, est. 2013) + "Best Bookkeeper" 6 years running.

---

## Action roadmap (impact × effort)

**Now (weeks 1–2) — unblock the crawlers**
- ✅ Allow AI crawler user-agents (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot); remove blanket 403. *(Impact: Critical · Effort: Low)*
- ✅ Publish publicly-fetchable `robots.txt` + XML sitemap that explicitly allow the AI bots. *(High · Low)*
- ✅ Standardise NAP across Google Business, Yelp, BBB, LinkedIn, Facebook, chamber + aggregators. *(Med · Med)*

**Next (weeks 3–8) — make pages answer-ready**
- Add Schema.org JSON-LD: `AccountingService`/`LocalBusiness`, `FAQPage`, `Review`/`AggregateRating`, `Person` (founder). *(High · Med)*
- Build an FAQ + "how bookkeeping works" hub; lead each answer with the extractable fact. *(High · Med)*
- Publish a root `llms.txt` guiding AI agents to key pages. *(Med · Low)*

**Then (months 2–4) — win non-branded share of voice**
- Create commercial-intent landing pages for the exact prompts now being lost (remote bookkeeping / nonprofits / startups / restaurants). *(High · High)*
- Earn third-party "best of" roundup mentions — what AI quotes for non-branded queries. *(High · Med)*
- Pursue BBB accreditation + steady review velocity with public owner responses. *(Med · Med)*

---

## Methodology & caveats

GEO = optimizing how AI answer engines (ChatGPT/OpenAI search, Perplexity, Google AI Overviews, Gemini) discover, trust, and cite a business. Findings draw on live generative-search prompt tests, the brand's off-site citation graph, and direct fetch probes of the domain on 20 Jun 2026. On-page technical items marked "unverifiable" (schema, sitemap, `llms.txt`) could not be confirmed because the site returned **HTTP 403** to every non-browser request — itself the central finding. Pillar scores are a weighted heuristic, not an engine-published metric; treat them as directional and re-audit ~30 days after the "Now" fixes ship.
