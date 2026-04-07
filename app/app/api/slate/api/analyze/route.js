// Free AI analysis — no API key needed
// Uses smart rule-based analysis from the player stats

export async function POST(req) {
const { prompt } = await req.json();

const analysis = generateAnalysis(prompt);

// Stream it word by word for a nice effect
const encoder = new TextEncoder();
const words = analysis.split(” “);

const readable = new ReadableStream({
async start(controller) {
for (let i = 0; i < words.length; i++) {
await new Promise(r => setTimeout(r, 30));
const text = (i === 0 ? “” : “ “) + words[i];
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
}
controller.enqueue(encoder.encode(“data: [DONE]\n\n”));
controller.close();
},
});

return new Response(readable, {
headers: {
“Content-Type”: “text/event-stream”,
“Cache-Control”: “no-cache”,
Connection: “keep-alive”,
},
});
}

function generateAnalysis(prompt) {
const get = (pattern, def = 0) => parseFloat(prompt.match(pattern)?.[1] || def);
const isHR   = /hr prop/i.test(prompt);
const isNRFI = /nrfi/i.test(prompt);

if (isNRFI) {
const rate   = get(/NRFI hit rate ([\d.]+)/, 52);
const away   = prompt.match(/Away SP: ([\w. ]+) F1/)?.[1]?.trim() || “Away SP”;
const home   = prompt.match(/Home SP: ([\w. ]+) F1/)?.[1]?.trim() || “Home SP”;
const awayF1 = get(/Away SP.*?F1 ERA ([\d.]+)/, 4);
const homeF1 = get(/Home SP.*?F1 ERA ([\d.]+)/, 4);
const avgF1  = ((awayF1 + homeF1) / 2).toFixed(2);
const rec    = rate >= 65 ? “strong NRFI play” : rate >= 55 ? “lean NRFI” : rate <= 38 ? “strong YRFI play” : rate <= 45 ? “lean YRFI” : “coin flip — skip”;
return `With a ${rate}% historical NRFI rate, this is a ${rec}. Combined first-inning ERA of ${avgF1} between ${away} and ${home} ${parseFloat(avgF1) < 3.5 ? "supports the NRFI further" : "adds some risk to the lean"}. ${rate >= 60 ? "Both starters keeping it clean early makes this a quality play." : "Look for a better line or consider passing."}`;
}

if (isHR) {
const barrel  = get(/Barrel=([\d.]+)/);
const hrProb  = get(/Sim HR=([\d.]+)/);
const evDK    = get(/DK EV=([-\d.]+)/);
const score   = get(/Score=([\d.]+)/);
const iso     = get(/ISO=([\d.]+)/);
const park    = get(/Park=([\d.]+)/);
const name    = prompt.match(/HR prop: ([\w. ]+) (/)?.[1]?.trim() || “This hitter”;
const pitcher = prompt.match(/vs ([\w. ]+) (/)?.[1]?.trim() || “the opposing pitcher”;
const bTier   = barrel >= 18 ? “elite barrel rate” : barrel >= 14 ? “above-average barrel rate” : barrel >= 10 ? “solid barrel rate” : “below-average barrel rate”;
const verdict = score >= 80 ? “a top-tier HR target today” : score >= 65 ? “a solid play” : score >= 50 ? “a marginal lean” : “one to avoid”;
const evTxt   = evDK >= 10 ? `+${evDK.toFixed(1)}% EV makes this a strong value bet` : evDK >= 3 ? `+${evDK.toFixed(1)}% EV gives a slight edge` : evDK >= 0 ? `roughly fair value at current price` : `${evDK.toFixed(1)}% EV — overpriced, look for a better number`;
return `${name} posts an ${bTier} of ${barrel}% with ISO ${iso} against ${pitcher}, rating ${score}/100 — ${verdict}. Sim HR probability of ${hrProb.toFixed(1)}% vs the book's ~25% implied odds shows ${evTxt}. ${park >= 1.1 ? "The ballpark is a clear HR booster" : "Park is neutral to slightly suppressive"} — ${hrProb >= 30 ? "this is a play." : "consider waiting for better odds."}`;
}

// Pitcher K
const kPct    = get(/K%=([\d.]+)/);
const oppKPct = get(/OppK%=([\d.]+)/);
const csw     = get(/CSW=([\d.]+)/);
const score   = get(/Score=([\d.]+)/);
const proj    = get(/Proj:? ([\d.]+)K/);
const lineTxt = prompt.match(/O/U ([\d.]+)/)?.[1] || “—”;
const evDK    = get(/DK EV=([-\d.]+)/);
const hitRate = get(/HitRate=([\d.]+)/);
const name    = prompt.match(/K prop: ([\w. ]+) (/)?.[1]?.trim() || “This pitcher”;
const kTier   = kPct >= 28 ? “elite strikeout rate” : kPct >= 24 ? “above-average K rate” : kPct >= 20 ? “league-average K rate” : “below-average K rate”;
const verdict = score >= 80 ? “strong over lean” : score >= 65 ? “solid over lean” : score >= 50 ? “marginal lean” : “avoid the over”;
const evTxt   = evDK >= 8 ? `+${evDK.toFixed(1)}% EV is a strong edge` : evDK >= 3 ? `+${evDK.toFixed(1)}% EV gives a playable edge` : evDK >= 0 ? “roughly fair value” : “negative EV, pass”;
return `${name} carries an ${kTier} of ${kPct}% with CSW ${csw}% and a projected ${proj > 0 ? proj.toFixed(1) + "K" : "solid output"} against the O/U ${lineTxt} — ${verdict} at ${score}/100. Hit rate of ${hitRate > 0 ? hitRate.toFixed(0) + "%" : "—"} on the line shows ${evTxt}. ${oppKPct >= 24 ? "The opposing lineup's high K rate is a key tailwind." : "The opposing lineup makes contact, which limits ceiling."}`;
}
