"""
Gemini token usage monitor.

Wraps the google-genai client so that every `generate_content` call reports how
many tokens were consumed (prompt / output / total) and an estimated USD cost.

Usage (drop-in replacement for `client.models.generate_content`):

    from monitoring.gemini_token_monitor import gemini

    response = gemini.generate_content(
        model="gemini-2.5-pro",
        contents=[prompt],
        config={"temperature": 0},
        label="bowling-stage-1",   # optional, shows up in the logs/stats
    )

`response` is exactly what the underlying genai client returns, so existing code
that reads `response.text` keeps working unchanged.

Running totals for the process are available via `gemini.totals()`.
"""

import os
import logging
import threading

from google import genai

# Token usage is written to its own file, separate from the main app logs.
_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gemini_token_usage.log")

logger = logging.getLogger("gemini_monitor")
logger.setLevel(logging.INFO)
# Don't bubble up to the root logger / main app log handlers.
logger.propagate = False
if not logger.handlers:
    _file_handler = logging.FileHandler(_LOG_FILE)
    _file_handler.setFormatter(
        logging.Formatter("%(asctime)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(_file_handler)

# ---------------------------------------------------------------------------
# Pricing (USD per 1,000,000 tokens). Update if Google changes their rates.
# Source: https://ai.google.dev/gemini-api/docs/pricing
# ---------------------------------------------------------------------------
PRICING_PER_MILLION = {
    "gemini-2.5-pro":        {"input": 1.25, "output": 10.00},   # <=200k token prompts
    "gemini-2.5-pro-long":   {"input": 2.50, "output": 15.00},   # >200k token prompts
    "gemini-2.5-flash":      {"input": 0.30, "output": 2.50},
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
    "gemini-1.5-pro":        {"input": 1.25, "output": 5.00},
    "gemini-1.5-flash":      {"input": 0.075, "output": 0.30},
}
_DEFAULT_PRICING = {"input": 1.25, "output": 10.00}  # fall back to 2.5-pro rates


def _price_for(model: str, prompt_tokens: int):
    """Return the (input, output) per-million pricing for a model."""
    key = (model or "").strip()
    # 2.5-pro has a higher tier for prompts over 200k tokens.
    if key == "gemini-2.5-pro" and prompt_tokens > 200_000:
        key = "gemini-2.5-pro-long"
    return PRICING_PER_MILLION.get(key, _DEFAULT_PRICING)


class GeminiTokenMonitor:
    """Thin wrapper around genai.Client that tracks token usage per call."""

    def __init__(self, api_key: str = None):
        api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment")

        # The actual Gemini API client lives here.
        self.client = genai.Client(api_key=api_key)

        self._lock = threading.Lock()
        self._totals = {
            "calls": 0,
            "prompt_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cost_usd": 0.0,
        }

    # -- the wrapped call ---------------------------------------------------
    def generate_content(self, model, contents, label=None, **kwargs):
        """
        Drop-in replacement for client.models.generate_content().

        Calls Gemini, then logs the token usage and estimated cost for this
        single call. Returns the original genai response untouched.
        """
        response = self.client.models.generate_content(
            model=model, contents=contents, **kwargs
        )

        usage = self._extract_usage(response)
        prompt_tokens = usage["prompt_tokens"]
        output_tokens = usage["output_tokens"]
        total_tokens = usage["total_tokens"]

        pricing = _price_for(model, prompt_tokens)
        cost = (
            prompt_tokens / 1_000_000 * pricing["input"]
            + output_tokens / 1_000_000 * pricing["output"]
        )

        tag = f" [{label}]" if label else ""
        logger.info(
            "🧮 Gemini call%s model=%s | prompt=%d output=%d total=%d tokens | ~$%.6f",
            tag, model, prompt_tokens, output_tokens, total_tokens, cost,
        )

        with self._lock:
            self._totals["calls"] += 1
            self._totals["prompt_tokens"] += prompt_tokens
            self._totals["output_tokens"] += output_tokens
            self._totals["total_tokens"] += total_tokens
            self._totals["cost_usd"] += cost
            running = dict(self._totals)

        logger.info(
            "📊 Running totals: %d calls | %d total tokens | ~$%.4f",
            running["calls"], running["total_tokens"], running["cost_usd"],
        )

        # Attach the per-call numbers to the response for callers that want them.
        try:
            response._token_usage = {**usage, "cost_usd": cost, "model": model}
        except Exception:
            pass

        return response

    @staticmethod
    def _extract_usage(response):
        """Pull token counts out of the genai response's usage_metadata."""
        meta = getattr(response, "usage_metadata", None)
        prompt_tokens = getattr(meta, "prompt_token_count", 0) or 0
        output_tokens = getattr(meta, "candidates_token_count", 0) or 0
        total_tokens = getattr(meta, "total_token_count", 0) or 0
        if not total_tokens:
            total_tokens = prompt_tokens + output_tokens
        return {
            "prompt_tokens": prompt_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
        }

    def totals(self):
        """Return a snapshot of cumulative usage for this process."""
        with self._lock:
            return dict(self._totals)

    def reset(self):
        """Reset the running totals."""
        with self._lock:
            for key in self._totals:
                self._totals[key] = 0 if key != "cost_usd" else 0.0


# Shared, ready-to-use instance.
gemini = GeminiTokenMonitor()
