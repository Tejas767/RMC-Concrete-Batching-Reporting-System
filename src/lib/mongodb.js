/**
 * ==============================================================================
 * DATABASE UTILITY: MongoDB Connection (mongodb.js)
 * ==============================================================================
 * PURPOSE:
 *  Establishes and caches the Mongoose connection to MongoDB Atlas.
 *
 * KEY SERVERLESS & NEXT.JS OPTIMIZATIONS (Interview Talking Points):
 *  1. Global Connection Caching:
 *     In Next.js development, Hot Module Replacement (HMR) re-executes code on every
 *     file save. Without global caching (`global._mongoose`), each save creates a NEW
 *     database connection, quickly exhausting MongoDB's connection limit.
 *     We attach `cached` to the Node.js `global` object so connections persist.
 *
 *  2. Serverless Connection Pooling Options:
 *     - `maxPoolSize: 10`  : Limits active connections per lambda/serverless container.
 *     - `minPoolSize: 2`   : Keeps 2 warm connections open to avoid cold-start delays.
 *     - `serverSelectionTimeoutMS: 5000`: Fails fast (5 seconds) if DB is unreachable.
 * ==============================================================================
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI environment variable is missing.");
}

// Attach cache object to Node.js global context (survives hot-reloads in Next.js)
let cached = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB() {
  // 1. If an active connection exists, return it immediately
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  // 2. If no connection promise is pending, initiate new connection
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      dbName: "batching_system",
      maxPoolSize: 10,               // Max 10 connections per serverless instance
      minPoolSize: 2,                // Keep 2 warm connections ready
      serverSelectionTimeoutMS: 5000, // Fail fast if DB unreachable (5 seconds)
      socketTimeoutMS: 45000,         // Close idle sockets after 45 seconds
    });
  }

  // 3. Await connection promise and cache result
  cached.conn = await cached.promise;
  return cached.conn;
}
