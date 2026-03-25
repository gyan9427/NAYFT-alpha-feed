# Sample Tweet Outputs (Before vs After)

The example below is based on the same underlying intelligence fields from `backend/data/newsintelligence.json` (BTC, bearish, moderate, immediate, signal_type=confirmed).

## Before (old engines)
```
BTC Alert (bearish, moderate, immediate)
Bitcoin's 4% drop in 12 hours looks painful - Here's why it could be opposite
Implication: Downside may be partly priced; bounces can still happen on noise.
Interpretation: Strong bearish pressure - treat continuation with care; already...
```

## After (new hook + narrative + formatter)
```
Keep an eye on BTC: the moderate setup is getting clearer.
Bitcoin's 4% drop in 12 hours looks painful - Here's why it could be opposite
A lot of this downside may already be priced in, bounces can still happen on noise. Strong bearish pressure. treat continua...
#crypto #trading
```

