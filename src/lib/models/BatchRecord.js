/**
 * ==============================================================================
 * MONGOOSE MODEL: BatchRecord (BatchRecord.js)
 * ==============================================================================
 * PURPOSE:
 *  Defines the MongoDB schema and indexes for storing concrete batching records.
 *
 * KEY DATABASE OPTIMIZATION TECHNIQUES (Interview Talking Points):
 *  1. Compound Indexes for Speed:
 *     - `{ userId: 1, createdAt: -1 }`: Optimizes the primary operator query
 *       ("Show MY batches sorted newest first").
 *     - `{ userId: 1, docketNo: 1 }`: Ensures docket numbers are UNIQUE per user
 *       and provides instant B-tree lookup (~17 comparisons for 300,000 records).
 *
 *  2. Data Normalization vs Storage Optimization:
 *     - Dynamic calculations (like material rows) are reconstructed client-side
 *       instead of storing massive JSON arrays, keeping document size tiny.
 *
 *  3. Model Caching in Next.js Serverless:
 *     - Uses `models.BatchRecord || model(...)` to prevent Mongoose re-compilation
 *       errors during Next.js Hot Module Replacement (HMR).
 * ==============================================================================
 */

import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const BatchRecordSchema = new Schema(
  {
    // ── Ownership Link ────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },

    // ── Batch Entry Information ───────────────────
    docketNo:      { type: String, default: "" },
    customerName:  { type: String, default: "" },
    site:          { type: String, default: "" },
    grade:         { type: String, default: "" },
    qty:           { type: String, default: "" },
    truckDriver:   { type: String, default: "" },
    truckNumber:   { type: String, default: "" },
    batchStart:    { type: String, default: "" },
    batchStop:     { type: String, default: "" },
    batchStartISO: { type: String, default: "" },
    batchStopISO:  { type: String, default: "" },
    plantSN:       { type: String, default: "" },
    companyName:   { type: String, default: "" },
    orderNo:       { type: String, default: "" },

    // ── Concrete Mix Recipe Snapshot ──────────────
    mixDesign:    { type: Schema.Types.Mixed, default: {} },
    differences:  { type: Schema.Types.Mixed, default: {} },
    batchSize:    { type: Number, default: 0.5 },
    totals:       { type: Schema.Types.Mixed, default: {} },
    setWeights:   { type: Schema.Types.Mixed, default: {} },
    totalBatches: { type: Number, default: 0 },
    
    // ── Extra Delivery Metadata ───────────────────
    challanData:  { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// ──────────────────────────────────────────────────────────────────────────────
// COMPOUND INDEXES FOR MAXIMUM QUERY EFFICIENCY
// ──────────────────────────────────────────────────────────────────────────────
// 1. Index 1: Fast sorting for history page
BatchRecordSchema.index({ userId: 1, createdAt: -1 });

// 2. Index 2: Prevent duplicate docket numbers per user
BatchRecordSchema.index({ userId: 1, docketNo: 1 }, { unique: true });

// 3. Index 3: Search Filter Indexes
BatchRecordSchema.index({ customerName: 1 });
BatchRecordSchema.index({ site: 1 });
BatchRecordSchema.index({ truckNumber: 1 });
BatchRecordSchema.index({ grade: 1 });

export default models.BatchRecord || model("BatchRecord", BatchRecordSchema);
