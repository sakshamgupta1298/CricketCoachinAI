# Gemini API Cost Analysis

_Last updated: 2026-06-12_

## TL;DR

A single video analysis (one upload) runs a **3-call pipeline** — Stage 1 biomechanics → Stage 2 coaching → training plan — and costs roughly **$0.08–0.09 per upload** (typical), ranging **$0.04 (short clip) to ~$0.14 (long clip)**. The Stage‑1 biomechanics call dominates because it ships the full pose‑keypoint CSV.

> ⚠️ **These are estimates.** The code does **not** capture `usage_metadata` (real token counts) on any call, so every number below is derived from payload sizes × Gemini list pricing. To get exact costs, add token logging (see [Recommendations](#cost-drivers--recommendations)).

---

## Pricing & Methodology

All production calls use **`gemini-2.5-pro`**. One non‑production test script uses `gemini-2.5-flash`.

### Gemini list pricing (paid tier, as of 2026-06-12)

| Model | Input ($/1M tokens) | Output ($/1M tokens) |
|---|---|---|
| **Gemini 2.5 Pro** (prompt ≤ 200k tok) | $1.25 | $10.00 |
| Gemini 2.5 Pro (prompt > 200k tok) | $2.50 | $15.00 |
| **Gemini 2.5 Flash** | $0.30 | $2.50 |

All our prompts stay **under the 200k‑token tier**, so we use the $1.25 / $10.00 rates throughout.

### Token estimation
- Rule of thumb: **~4 characters ≈ 1 token** for our CSV/JSON payloads.
- Input is dominated by the pose‑keypoint CSV (converted to JSON). 50KB ≈ 12.5k tok, 150KB ≈ 37.5k tok, 300KB ≈ 75k tok.
- Output sizes are estimated from typical JSON response lengths. **Output is the expensive side** ($10/1M vs $1.25/1M), so even modest responses matter.
- All calls run `temperature=0, top_p=1, top_k=1` with **no `max_output_tokens` cap** — output length is uncapped, which is a cost risk.

---

## Per-Call Cost Estimates

Costs shown as **low / typical / high** in USD per call.

| # | Call | File:line | Model | Input tok (typ) | Output tok (typ) | Input $ | Output $ | **Total (low/typ/high)** |
|---|------|-----------|-------|----------------:|-----------------:|--------:|---------:|---|
| 1 | Batting biomechanics (Stage 1) | [backend_script.py:1436](backend_script.py:1436) | 2.5-pro | 37,500 | 750 | $0.047 | $0.0075 | **$0.021 / $0.054 / $0.109** |
| 2 | Batting coaching (Stage 2) | [backend_script.py:1607](backend_script.py:1607) | 2.5-pro | 875 | 1,250 | $0.0011 | $0.0125 | **$0.008 / $0.014 / $0.022** |
| 3 | Bowling biomechanics (Stage 1) | [backend_script.py:1978](backend_script.py:1978) | 2.5-pro | 37,500 | 750 | $0.047 | $0.0075 | **$0.021 / $0.054 / $0.109** |
| 4 | Bowling coaching (Stage 2) | [backend_script.py:2153](backend_script.py:2153) | 2.5-pro | 875 | 1,250 | $0.0011 | $0.0125 | **$0.008 / $0.014 / $0.022** |
| 5 | Keeping biomechanics (Stage 1) | [backend_script.py:2898](backend_script.py:2898) | 2.5-pro | 37,500 | 750 | $0.047 | $0.0075 | **$0.021 / $0.054 / $0.109** |
| 6 | Keeping coaching (Stage 2) | [backend_script.py:3057](backend_script.py:3057) | 2.5-pro | 875 | 1,250 | $0.0011 | $0.0125 | **$0.008 / $0.014 / $0.022** |
| 7 | Training plan | [backend_script.py:3333](backend_script.py:3333) | 2.5-pro | 1,875 | 1,500 | $0.0023 | $0.015 | **$0.010 / $0.017 / $0.032** |
| 8 | Video comparison | [backend_script.py:4728](backend_script.py:4728) | 2.5-pro | 3,750 | 1,250 | $0.0047 | $0.0125 | **$0.011 / $0.017 / $0.030** |
| 9 | Bat-ball contact | [bat_ball_contact.py:134](bat_ball_contact.py:134) | 2.5-pro | 500 | 250 | $0.0006 | $0.0025 | **$0.002 / $0.003 / $0.005** |
| 10 | Bat-ball contact (standalone dup) | [bat-ball-contact.py:124](bat-ball-contact.py:124) | 2.5-pro | 500 | 250 | $0.0006 | $0.0025 | **$0.002 / $0.003 / $0.005** |
| 11 | Test script (non-prod) | [test_api_key.py:78](test_api_key.py:78) | 2.5-flash | 375 | 750 | $0.0001 | $0.0019 | **$0.001 / $0.002 / $0.003** |

> Calls 1/3/5 are identical in cost shape (same keypoint‑CSV input pattern). The ~$0.047 input cost is the single biggest line item and scales with video length / number of frames.

---

## Per-Upload Pipeline Cost

A user upload triggers **3 calls**: one Stage‑1 biomechanics call, one Stage‑2 coaching call, and one training‑plan call.

| Upload type | Calls | Low | **Typical** | High |
|---|---|---|---|---|
| **Batting** | 1 + 2 + 7 | $0.039 | **$0.085** | $0.163 |
| **Bowling** | 3 + 4 + 7 | $0.039 | **$0.085** | $0.163 |
| **Keeping** | 5 + 6 + 7 | $0.039 | **$0.085** | $0.163 |

Optional/extra calls not part of the core upload:
- **Video comparison** (#8): ~**$0.017** per user-initiated compare.
- **Bat-ball contact** (#9): ~**$0.003** per detected contact event (fires per event, can add up on long clips).

So a "normal" upload ≈ **$0.085**. Round to **~$0.10/upload** for safe budgeting.

---

## Monthly Cost Projection

Assuming the typical **$0.085 / upload** (core 3-call pipeline):

| Uploads / month | Low ($0.039) | **Typical ($0.085)** | High ($0.163) |
|---:|---:|---:|---:|
| 100 | $3.90 | **$8.50** | $16.30 |
| 1,000 | $39 | **$85** | $163 |
| 10,000 | $390 | **$850** | $1,630 |
| 100,000 | $3,900 | **$8,500** | $16,300 |

Add ~$0.017 per video comparison and ~$0.003 per bat-ball contact event on top, based on how often those features get used.

---

## Cost Drivers & Recommendations

**What drives cost:**
1. **Stage‑1 biomechanics calls (#1/#3/#5) are ~60–65% of every upload** — entirely because they ship the full pose‑keypoint CSV (50–300KB) into a $1.25/1M‑token Pro model.
2. **No output cap** — output is billed at $10/1M and is currently uncapped; a runaway response is the biggest tail risk.

**How to cut cost:**
1. **Move cheaper stages to `gemini-2.5-flash`.** Flash input is ~4× cheaper ($0.30 vs $1.25) and output ~4× cheaper ($2.50 vs $10). The Stage‑2 coaching and training‑plan calls work on small structured input and are good candidates; even moving Stage‑1 to Flash could cut the biggest line item ~75% — worth an A/B on output quality.
2. **Add `usage_metadata` logging** to every `generate_content` call to replace these estimates with real token counts (`response.usage_metadata.prompt_token_count` / `candidates_token_count`). This is the single highest-value change for cost accuracy.
3. **Cap `max_output_tokens`** on each call to bound the expensive output side and remove tail risk.
4. **Trim / downsample the keypoint CSV** before sending (drop unused columns, reduce frame rate, round coordinates). This directly shrinks the dominant Stage‑1 input cost.
5. **Throttle bat-ball contact calls (#9)** — firing once per contact event can multiply on long videos; batch contacts into one call.

---

### Notes
- `bat-ball-contact.py` (#10) appears to be a standalone duplicate of `bat_ball_contact.py` (#9) and isn't part of the live request path.
- `test_api_key.py` (#11) is a manual test/demo using Flash — not billed in production traffic.
