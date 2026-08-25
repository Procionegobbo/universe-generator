# Exoplanet Habitability & Life-Complexity Model

A heuristic, order-of-magnitude model for estimating the probability that life has developed on a given exoplanet, and how complex it might be, calibrated against Earth as the only known data point.

## Background

Based on current research (2025-2026):

- The **Earth Similarity Index (ESI)** is the standard metric for comparing exoplanets to Earth, built primarily around surface temperature, radius, density, and escape velocity. It correlates with habitability but is not direct proof of it.
- **Habitable stars (HabStars)** span roughly spectral class F through mid-K (~4000-7000 K photosphere temperature). The Sun (G2) sits near the middle of this range. M dwarfs host habitable zones very close to the star, which increases tidal locking and flare exposure, reducing real-world habitability despite nominally being "in the zone."
- A 2026 study (Kaltenegger, Cornell/Carl Sagan Institute, using Gaia + NASA Exoplanet Archive data) identified 45 rocky exoplanets in the habitable zone under standard criteria, narrowed to 24 under stricter 3D habitable-zone criteria (notable names: Proxima Centauri b, TRAPPIST-1e/f, Kepler-186f, Kepler-442b).
- **K2-18b** remains the highest-profile case study: a sub-Neptune around an M dwarf, proposed as a "Hycean world" (liquid ocean under a hydrogen-rich atmosphere). JWST detections of dimethyl sulfide (DMS) and dimethyl disulfide (DMDS) in 2023 and 2025 were floated as possible biosignatures, but 2026 follow-up studies (including a systematic search across 661 molecules and a NASA-led reassessment) found the signal inconclusive. Technosignature searches on the same system also came back empty. Current consensus: promising but unconfirmed.
- Other relevant factors from the literature: atmospheric composition (e.g. ozone narrows the habitable/uninhabitable margin at a given radiation level), stellar luminosity stability, flare activity, magnetic field presence, and position within the habitable zone (HZD).

## Part 1: Habitability Probability

$$P = S \times T \times R \times A \times A_{age}$$

All factors are normalized to [0, 1].

### Star type factor (S)

Fixed weight by spectral class, reflecting stability and lifespan:

| Class | S |
|---|---|
| G | 1.0 |
| K | 0.9 |
| F | 0.7 |
| M | 0.5 (penalized for flares / tidal locking) |
| Other | 0.1 |

### Temperature factor (T)

Gaussian centered on Earth's mean equilibrium temperature (288 K):

$$T = e^{-\frac{(T_{eq} - 288)^2}{2\sigma^2}}$$

with $\sigma \approx 30$ K as the tolerance band.

### Planet type factor (R)

| Type | R |
|---|---|
| Rocky, 0.5-1.5 R⊕ | 1.0 |
| Rocky/super-Earth, 1.5-2 R⊕ | 0.7 |
| Sub-Neptune / ocean world | 0.4 |
| Gas giant | 0.05 |

### Atmosphere factor (A) — optional

| Condition | A |
|---|---|
| Stable atmosphere, compatible pressure | 1.0 |
| Unknown | 0.6 (neutral default) |
| Absent / unstable | 0.3 |

### Stellar age factor (A_age)

Estimated stellar main-sequence lifetime (mass-luminosity approximation):

$$L \approx 10 \times \left(\frac{M}{M_\odot}\right)^{-2.5} \text{ Gyr}$$

Age factor as a sigmoid gated by a step function that zeroes out once the star has exceeded its usable lifetime:

$$A_{age} = \frac{1}{1 + e^{-k(t - t_0)}} \times H(L - t)$$

where $t$ = current system age (Gyr), $t_0 \approx 0.5$ Gyr (minimum time for prebiotic chemistry to start, calibrated on Earth), $k \approx 2$, and $H(L-t)$ is a step function that forces the result to 0 once $t > L$.

### Worked example

Rocky planet, 1.1 R⊕, equilibrium temperature 295 K, K-type star, unknown atmosphere, system age well within stellar lifetime:

$$P = 0.9 \times e^{-\frac{(295-288)^2}{2\times30^2}} \times 1.0 \times 0.6 \times A_{age} \approx 0.9 \times 0.995 \times 1.0 \times 0.6 \approx 0.54$$

(assuming $A_{age} \approx 1$ for a mature, stable system)

## Part 2: Life Complexity Index

This estimates how far evolution might have progressed, *given* that life exists, using Earth's timeline as the only calibration point available (n=1 sample — treat this as an order-of-magnitude exercise, not a prediction).

### Earth's evolutionary milestones

| Time since planet formation (~4.54 Gyr ago) | Event | Complexity level |
|---|---|---|
| ~0.5 Gyr | First life (prokaryotes) | 1 |
| ~2.0 Gyr | Oxygenic photosynthesis (Great Oxidation) | 2 |
| ~2.7 Gyr | Eukaryotes | 3 |
| ~3.9 Gyr | Multicellular life | 4 |
| ~4.0 Gyr | Cambrian explosion, complex animals | 5 |
| ~4.54 Gyr | Intelligent/technological life | 6 |

### Complexity function

Logistic curve fit to the milestones above (slow start, acceleration, plateau):

$$C(t_{bio}) = \frac{6}{1 + e^{-k_c(t_{bio} - 3.2)}}$$

where $t_{bio}$ = time elapsed since conditions became favorable (system age minus $t_0$), and $k_c \approx 1.3$ (calibrated so $C$ moves from ~1 to ~5 across the 0.5-4 Gyr range, matching Earth's timeline).

### Final complexity index

Gated by habitability probability — if conditions were never favorable, elapsed time is irrelevant:

$$C_{index} = P \times C(t_{bio})$$

### Worked example

Same planet as above, system age 4.2 Gyr, so $t_{bio} = 4.2 - 0.5 = 3.7$ Gyr:

$$C(3.7) = \frac{6}{1+e^{-1.3(3.7-3.2)}} \approx \frac{6}{1.52} \approx 3.9$$

$$C_{index} = 0.54 \times 3.9 \approx 2.1$$

**Interpretation**: moderate habitability probability (~54%), and if life is present, elapsed time suggests a stage between eukaryotes and multicellular life (level ~2, approaching 3) — not yet complex animals.

## Caveats

- The entire complexity model assumes Earth's evolutionary pace is "typical." This is unverifiable: evolution could be far slower (major bottlenecks like the oxygenation event took billions of years for reasons that are not fully understood) or Earth could be an unusually fast/lucky case.
- The habitability formula is a heuristic multiplicative index inspired by ESI and Drake-equation-style reasoning, not a calibrated physical probability — there is no real dataset of confirmed inhabited exoplanets to fit it against.
- Useful for relative ranking and order-of-magnitude intuition, not for literal probability claims.
