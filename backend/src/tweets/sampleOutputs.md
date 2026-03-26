# Sample Tweet Outputs (Before vs After)

This file illustrates upgrades across:

- **Hook library** (20+ patterns: curiosity, contrarian, alert, tension, reaction, risk) with deterministic selection
- **Hook–title alignment** (e.g. reaction-style hooks when the rewritten title describes a past move)
- **Title rewrite** variants (avoid repetitive “headline” phrasing; more trader-native lines)
- **Narrative compression** (one sharp idea, “risky here” phrasing where applicable)
- **Formatter** hook/title de-duplication when two lines repeat the same core idea

## Example 1 (BTC; medium intensity; past-move title → reaction/tension hook pool)

### Before
```
Hook: BTC might be setting up for a move.
Title: BTC just moved 4% in 12h... but the headline doesn't tell the whole story.
Narrative: (long stacked implication + interpretation)
```

### After
```
Something about BTC is starting to shift.
BTC just moved 4% in 12h... this could be a trap.
A lot of this downside may already be priced in, but pressure is still strong—so chasing this move can be risky here.
#crypto #trading
```
(Hook aligns with “move already happened”; title uses a non-generic variant; narrative compressed.)

## Example 2 (ETH; insight style; curiosity hook)

### Before
```
Hook: Keep an eye on ETH right now.
Title: Ethereum price update: market sees mixed signals...
Narrative: Reason: Little actionable edge from this label alone; use other context.
```

### After
```
Something about ETH is starting to shift.
ETH is back in focus right now.
Little actionable edge from this label alone; use other context.
#crypto #trading
```

## Example 3 (SOL; high intensity; warning title → risk hook)

### Before
```
Hook: Pay attention to SOL here.
Title: Solana faces liquidation risk...
Narrative: Strong bearish pressure — treat continuation...
```

### After
```
This could be a risky moment for SOL.
This SOL setup is starting to look risky.
Strong bearish pressure.
#crypto #trading
```

## Example 4 (Contrarian style; tension vs contrarian pool)

### Before
```
Hook: Everyone thinks BTC is moderate right now.
Title: (generic)
Narrative: (duplicated ideas)
```

### After
```
Everyone is looking at BTC wrong right now.
BTC just moved 2% in 30m... this move is not as simple as it looks.
A lot of this downside may already be priced in, but pressure is still strong—so chasing this move could be risky here.
#crypto #trading
```

## Example 5 (Formatter de-dupe: hook and title overlapped)

### Before
```
Hook: This move in BTC doesn't look normal.
Title: BTC moved in a way that doesn't look normal.
Narrative: ...
```
(Title repeats the hook’s core idea.)

### After
```
This move in BTC doesn't look normal.
BTC: follow-through matters more than the first print.
A lot of this downside may already be priced in, but pressure is still strong—so chasing this move can be risky here.
#crypto #trading
```
(When overlap is detected, title is replaced with a complementary deterministic line.)
