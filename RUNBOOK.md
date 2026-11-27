# PayReso daily social post: runbook

Everything the daily run needs lives in this repo (Gbassey/payreso-social). Nothing is read from
or written to the founder's computer files. The only thing on the founder's computer is the
Claude desktop app, whose built-in browser is signed in to Metricool.

Decided by the founder on 23 Nov 2026: posts are **scheduled live** (Auto publish on) for 10:00
Europe/London on Facebook, Instagram and LinkedIn. No approval step. The founder can still edit
or delete a post in Metricool during the 7 days before it goes out.

## 0. Target date
`TARGET = today (Europe/London) + 7 days`, as YYYY-MM-DD. (`TZ=Europe/London date -d '+7 days' +%F`)

## 1. Get the repo
`add_repo` Gbassey/payreso-social (push access), clone it, work in the clone. Push to `main`.

## 2. Already done?
Open https://app.metricool.com/planner?blogId=8277320&userId=6522694 in the built-in browser
(`preview_start`), wait ~6 s, then in `javascript_tool`:

```js
(0,eval)(await (await fetch('https://raw.githubusercontent.com/Gbassey/payreso-social/main/tools/metricool_helpers.js',{cache:'no-store'})).text());
await prGoWeek('TARGET'); prExists('TARGET')
```
If it lists any post at 10:00 AM for TARGET (draft or scheduled), stop: nothing to do.
If the page shows a Metricool login screen, stop and notify the founder (never enter passwords).
If the browser tools can't reach the desktop app, stop and notify the founder that the Claude
desktop app needs to be open.

## 3. Calendar
`tools/calendar.json` holds the posts. If it has no entry for TARGET, add the next 14 days first:
- Mix: carousels Mon, Tue, Thu, Sat (cover + 4 points + CTA = 6 slides); statics Wed, Fri, Sun (1 slide).
- Pillars: Founding Pilot sign-ups, UK late-payment education, founder/build story, product features.
- Follow the content rules in the project doc `claude/social-media-pipeline.md` (no promises of
  payment or recovery; only live features; Commercial Payments Bill = proposed; "8% above the
  Bank of England base rate"; £40/£70/£100). Check any new fact with a web search.
- **LinkedIn captions (founder decision, 27 Nov 2026):** no links and no hashtags (both cut reach;
  never "link in comments" either). The first line is a hook under ~110 characters, and plain
  keywords ("late payment", "UK small businesses", "cash flow", "invoices") appear in the first
  two lines. Use a specific UK example. End with one genuine question that people can answer from
  experience, never engagement bait ("comment YES"). Legal posts still end with "General info, not
  legal advice". Facebook/Instagram captions may keep payresoai.com and hashtags.
- One LinkedIn caption a week (Tue–Thu) is a question post that invites experiences
  (Metricool can't create LinkedIn polls, so ask in text).
- **Founder posts (Tue, Wed, Thu):** also write `captions.founder`, a first-person version for
  the founder's personal LinkedIn, signed off "— Godwin". It should be a personal angle (what a
  customer told him, what he learned building), not a copy of the company caption. Same rules,
  no links, no hashtags.
- Each entry: date, type, pillar, topic, bg_prompt, slides[], captions{linkedin, instagram, facebook, founder?}.
  Slide kinds: `cover` (tag, headline, sub), `point` (num, title, body), `cta` (headline, body, button),
  `static` (tag, headline, sub). `[brackets]` in text = cyan accent.
Commit the calendar change.

## 4. Background image (0.15 credits)
Higgsfield `generate_image` with `{model: "z_image", aspect_ratio: "3:4", use_unlim: false, count: 1,
prompt: <bg_prompt>}`, then `jobs_wait`. Download the result URL with curl. Only one generation per run.
If z_image fails, one retry with gpt_image_2_6 (0.75 credits) is allowed; say so in the summary.

## 5. Render
`python3 tools/render.py TARGET --bg <downloaded image>` writes `posts/TARGET_<carousel|static>_NN.jpg`
(and a PDF for carousels). Fonts and logo are in `tools/`. **Look at the images** (Read) and fix any
text overflow by shortening copy in calendar.json and re-rendering.

## 6. Publish images
`git add posts tools && git commit && git push origin HEAD:main`. Check one raw URL returns 200:
`https://raw.githubusercontent.com/Gbassey/payreso-social/main/posts/<file>.jpg`.
If the push is refused, stop and notify the founder.

## 7. Create the Metricool post
In the planner tab (helpers already loaded; reload them after any page navigation):

```js
const r = {};
r.load = await prLoad('TARGET');
r.create = await prCreate();
r.ebn = await prEditByNetwork();
r.drop = await prDrop(prImages(prPost));
await prSleep(4000);
r.fb = await prNet('facebook', prPost.captions.facebook);
r.ig = await prNet('instagram', prPost.captions.instagram);
r.li = await prNet('linkedin', prPost.captions.linkedin);
r.open = await prOpenDate();
r.date = await prDate('TARGET', 10, 0, 'AM');   // throws unless the label reads e.g. "Nov 30, 2026 10:00 AM"
r.blur = await prBlur();
JSON.stringify(r)
```
If prEditByNetwork fails with "chip not found", the editor opened with only one network selected
(seen 24 Nov: only LinkedIn). Click the Facebook and Instagram icons at the top of the editor so all
three are highlighted, then continue from `prEditByNetwork()`.

Then take a screenshot and check: 3 network icons, the images in each network tab, the date
button showing TARGET 10:00 AM, "Auto publish" on, and the button reading **Schedule 3**.
Then `await prSchedule(3)`.

Wait for the upload ("Loading, please wait… Uploading files…"); with the pane hidden it can take a
minute or more. When the editor closes, run `await prGoWeek('TARGET'); prExists('TARGET')` and
confirm three 10:00 AM entries without the word "Draft".

Never press Escape or click Cancel/Close in the editor: that discards the post. Don't click the
image icon in the editor (its menu sits over Edit by network and opens Adobe Express; if that
happens, `prKillAdobe()` removes the overlay safely).

## 7b. Founder LinkedIn draft (Tue, Wed, Thu only, when `captions.founder` exists)
**Only once the founder's personal LinkedIn is connected in Metricool** (see the project doc;
until then skip this step). Create a second post for the founder's personal profile with the same
images and `captions.founder`, date TARGET 10:00 AM, and **save it as a Draft, never Schedule**.
The founder approves founder posts himself. Never post to the personal profile in bursts: one
draft per run at most.

## 8. Report
- Success: no notification needed unless something is unusual. Send a one-line SendUserMessage:
  date, topic, networks, credits used.
- Anything that stopped the run (desktop app offline, Metricool signed out, network disconnected,
  push refused, schedule failed): PushNotification with what the founder needs to do.
