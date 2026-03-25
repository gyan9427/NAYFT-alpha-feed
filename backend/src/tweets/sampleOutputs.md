# Sample Tweet Outputs (Before vs After)

Below are 3 examples showing how the new pipeline changes:
- Hook intensity (LOW / MEDIUM / HIGH) based on confidence thresholds
- Title rewriting into tweet-native, conversational lines (deterministic)
- Final 4-line structure (Hook / Rewritten Title / Narrative / Hashtags)

## Example 1 (MEDIUM intensity; drop/spike title rewrite)

### Before (old engines)
```
BTC Alert (bearish, moderate, immediate)
Bitcoin's 4% drop in 12 hours looks painful - Here's why it could be opposite
Implication: Downside may be partly priced; bounces can still happen on noise.
Interpretation: Strong bearish pressure - treat continuation with care; already...
```

### After (new engines)
```
This move in BTC might be more important than it seems.
BTC just moved 4% in 12h... but this might not be what it looks like.
A lot of this downside may already be priced in, bounces can still happen on noise. Strong bearish pressure. treat continuation with care; already reacted. avoid late entry.
#crypto #trading
```

## Example 2 (LOW intensity; general title rewrite)

### Before (old engines)
```
ETH Alert (neutral, weak, immediate)
Ethereum price update: market sees mixed signals as traders wait for direction
Reason: Little actionable edge from this label alone; use other context.
#crypto #trading
```

### After (new engines)
```
Keep an eye on ETH right now.
ETH is back in focus right now.
Little actionable edge from this label alone; use other context.
#crypto #trading
```

## Example 3 (HIGH intensity; warning title rewrite; gated by direction/signalType)

### Before (old engines)
```
SOL Alert (bearish, moderate, immediate)
Solana faces liquidation risk as leverage builds - report suggests caution
Interpretation: Strong bearish pressure - treat continuation with care; already reacted - avoid late entry.
#crypto #trading
```

### After (new engines)
```
Something about SOL isn't adding up right now...
This SOL setup is starting to look risky.
Strong bearish pressure. treat continuation with care; already reacted. avoid late entry.
#crypto #trading
```

