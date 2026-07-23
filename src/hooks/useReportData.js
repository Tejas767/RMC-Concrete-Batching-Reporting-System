/**
 * ==============================================================================
 * CUSTOM HOOK: useReportData (useReportData.js)
 * ==============================================================================
 * PURPOSE:
 *  Computes the autographic record batch rows, target set weights, and actual totals
 *  for printing dockets and generating autographic reports.
 *
 * ADVANCED ALGORITHMIC CONCEPTS (Interview Talking Points):
 *  1. Seeded Deterministic PRNG (Mulberry32 + FNV-1a Hash):
 *     Instead of standard `Math.random()` (which produces different numbers on every render),
 *     we hash docket metadata (`docketNo`, `customerName`, `grade`, `qty`) using FNV-1a
 *     to seed a Mulberry32 PRNG.
 *     Result: The report values remain EXACTLY identical whenever you open, view,
 *     or print the same batch record!
 *
 *  2. Memoization with `useMemo`:
 *     Heavy calculations (looping over batch rows and summing totals) are cached
 *     and recomputed ONLY when input props (`entry`, `targets`, `batchSize`, `differences`) change.
 * ==============================================================================
 */

"use client";

import { useMemo } from "react";
import { MIXER_CAPACITY, defaultDifferences } from "@/constants/mixConfig";

/**
 * FNV-1a 32-bit Hash Function
 * Converts a string into a deterministic integer seed.
 */
function hashSeed(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mulberry32 Pseudo-Random Number Generator (PRNG)
 * Produces reproducible random numbers between [0, 1) based on an initial seed.
 */
function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a random integer between min and max (inclusive) using a seeded PRNG.
 */
function randBetween(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Returns a deterministic offset with meaningful magnitude between [diff/2, diff].
 * Guarantees the gap between Set Weight and Actual is always noticeable for quality logs.
 */
function randOffset(rng, diff) {
  const direction  = rng() >= 0.5 ? 1 : -1;
  const minMag     = Math.max(1, Math.ceil(diff * 0.5));
  const magnitude  = minMag + Math.floor(rng() * (diff - minMag + 1));
  return direction * magnitude;
}

export function useReportData(entry, targets, batchSize = MIXER_CAPACITY, differences = {}) {
  return useMemo(() => {
    // 1. Generate deterministic seed from entry metadata
    const seed = hashSeed(`${entry.docketNo}-${entry.customerName}-${entry.grade}-${entry.qty}`);
    
    // Two separate RNG streams: one for per-row display, one for totals
    const rowRng   = mulberry32(seed);
    const totalRng = mulberry32(seed ^ 0xdeadbeef);

    const productionQty = Number(entry.qty || 0);
    const capacity = Number(batchSize || MIXER_CAPACITY);

    // Calculate total batch iterations: TotalBatches = Math.floor(ProdQty / Capacity)
    let totalBatches = 0;
    if (productionQty > 0 && capacity > 0) {
      totalBatches = Math.floor(productionQty / capacity);
    }

    // Resolve difference tolerance configuration
    const getDiff = (key) => {
      const val = differences[key];
      if (val !== undefined && val !== null && val !== "") return Number(val);
      return defaultDifferences[key] ?? 0;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: Generate per-batch rows with realistic industrial tolerance values
    // ──────────────────────────────────────────────────────────────────────────
    const rows = [];

    for (let i = 0; i < totalBatches; i += 1) {
      const row = { id: i + 1 };
      const t = (key) => Number(targets[key]) || 0;

      // Aggregates: ±2 kg variance
      row.mm10  = t("mm10")   > 0 ? t("mm10")   + randBetween(rowRng, -2, 2) : 0;
      row.cSan  = t("cSan")   > 0 ? t("cSan")   + randBetween(rowRng, -2, 2) : 0;
      row.moi   = "0.0";
      row.cSand = t("cSand")  > 0 ? t("cSand")  + randBetween(rowRng, -2, 2) : 0;
      row.mm20  = t("mm20")   > 0 ? t("mm20")   + randBetween(rowRng, -2, 2) : 0;

      // Cementitious Materials: ±2 kg variance
      row.cem1   = t("cem1")   > 0 ? t("cem1")   + randBetween(rowRng, -2, 2) : 0;
      row.ggbs   = t("ggbs")   > 0 ? t("ggbs")   + randBetween(rowRng, -2, 2) : 0;
      row.flyAsh = t("flyAsh") > 0 ? t("flyAsh") + randBetween(rowRng, -2, 2) : 0;

      // Water & Ice: ±1 for ice, ±2 for water
      row.watIce = t("watIce") > 0 ? t("watIce") + randBetween(rowRng, -1, 1) : 0;
      row.pm     = 0;
      row.water  = t("water")  > 0 ? t("water")  + randBetween(rowRng, -2, 2) : 0;

      // Silica Fume: ±1
      row.silica = t("silica") > 0 ? t("silica") + randBetween(rowRng, -1, 1) : 0;

      // Chemical Admixtures: floating point precision ±0.04 kg
      row.admix1 = t("admix1") > 0 ? Number((t("admix1") + (rowRng() - 0.5) * 0.04).toFixed(2)) : 0.00;
      row.admix2 = t("admix2") > 0 ? Number((t("admix2") + (rowRng() - 0.5) * 0.04).toFixed(2)) : 0.00;

      rows.push(row);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: Compute Total Actual Weights (Sum of all batch rows)
    // ──────────────────────────────────────────────────────────────────────────
    const totals = {
      mm10:   rows.reduce((sum, r) => sum + (r.mm10   || 0), 0),
      cSan:   rows.reduce((sum, r) => sum + (r.cSan   || 0), 0),
      cSand:  rows.reduce((sum, r) => sum + (r.cSand  || 0), 0),
      mm20:   rows.reduce((sum, r) => sum + (r.mm20   || 0), 0),
      cem1:   rows.reduce((sum, r) => sum + (r.cem1   || 0), 0),
      ggbs:   rows.reduce((sum, r) => sum + (r.ggbs   || 0), 0),
      flyAsh: rows.reduce((sum, r) => sum + (r.flyAsh || 0), 0),
      watIce: rows.reduce((sum, r) => sum + (r.watIce || 0), 0),
      water:  rows.reduce((sum, r) => sum + (r.water  || 0), 0),
      silica: rows.reduce((sum, r) => sum + (r.silica || 0), 0),
      admix1: rows.reduce((sum, r) => sum + (r.admix1 || 0), 0),
      admix2: rows.reduce((sum, r) => sum + (r.admix2 || 0), 0),
    };

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: Compute Target Set Weights (Total Actual ± Tolerated Difference)
    // ──────────────────────────────────────────────────────────────────────────
    const calcSetWeight = (key, isAdmix = false) => {
      const base   = (Number(targets[key]) || 0) * totalBatches;
      if (base === 0) return isAdmix ? 0.00 : 0;

      const diff   = getDiff(key);
      const actual = isAdmix
        ? Number((totals[key] || 0).toFixed(2))
        : Math.round(totals[key] || 0);

      if (diff === 0) return actual;

      const offset = randOffset(totalRng, diff);
      const raw    = actual + offset;

      if (isAdmix) {
        let r = Number(raw.toFixed(2));
        if (r === actual) r = Number((r + (offset >= 0 ? 0.01 : -0.01)).toFixed(2));
        return r;
      } else {
        let r = Math.round(raw);
        if (r === actual) r += (offset >= 0 ? 1 : -1);
        return r;
      }
    };

    const setWeights = {
      mm10:   calcSetWeight("mm10"),
      cSan:   calcSetWeight("cSan"),
      cSand:  calcSetWeight("cSand"),
      mm20:   calcSetWeight("mm20"),
      cem1:   calcSetWeight("cem1"),
      ggbs:   calcSetWeight("ggbs"),
      flyAsh: calcSetWeight("flyAsh"),
      watIce: calcSetWeight("watIce"),
      water:  calcSetWeight("water"),
      silica: calcSetWeight("silica"),
      admix1: calcSetWeight("admix1", true),
      admix2: calcSetWeight("admix2", true),
    };

    return { rows, totals, setWeights, totalBatches, productionQty };
  }, [entry, targets, batchSize, differences]);
}
