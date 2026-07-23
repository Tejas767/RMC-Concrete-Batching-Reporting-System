/**
 * ==============================================================================
 * API ROUTE: /api/history
 * ==============================================================================
 * Supported Methods: GET, POST, DELETE
 *
 * PURPOSE:
 *  - GET    : Fetches paginated batch records for the logged-in user.
 *  - POST   : Saves a newly completed concrete batch record into MongoDB.
 *  - DELETE : Deletes a single batch record by ID, or clears all records.
 *
 * KEY PERFORMANCE & SCALABILITY TECHNIQUES (Interview Talking Points):
 *  1. MongoDB Aggregation Pipeline with `$facet`:
 *     Instead of issuing two separate database calls (one for `count()` and one
 *     for `find().skip().limit()`), we use `$facet`. This runs both operations in a
 *     SINGLE database roundtrip, cutting network latency by 50%.
 *
 *  2. Security — ReDoS (Regex Denial of Service) Guard:
 *     Search inputs are sanitized via `escapeRegex()` before passing to `$regex`.
 *     This prevents users from executing expensive regex queries that freeze MongoDB.
 *
 *  3. Explicit Mongoose ObjectId Casting:
 *     Mongoose `.find()` auto-casts string IDs to `ObjectId`, but `.aggregate()`
 *     does NOT. We explicitly wrap `session.id` with `new mongoose.Types.ObjectId()`.
 * ==============================================================================
 */

import { connectDB } from "@/lib/mongodb";
import BatchRecord from "@/lib/models/BatchRecord";
import { getSession } from "@/lib/auth";
import mongoose from "mongoose";

// Force Next.js to evaluate this API route dynamically on every request (no static caching)
export const dynamic = "force-dynamic";

/**
 * HELPER: Escape special regular expression characters.
 * Prevents ReDoS vulnerability when users search with symbols like `.*+?^${}()|[\]\\`.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * HELPER: Truncate string inputs to a maximum character length.
 * Prevents database storage bloat from overly large input payloads.
 */
function truncate(val, max = 200) {
  if (!val) return "";
  return String(val).slice(0, max);
}

// ==============================================================================
// 1. GET HANDLER — Fetch Paginated Batch Records
// ==============================================================================
export async function GET(request) {
  // Check session cookie for authentication
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Parse URL query parameters: ?page=1&limit=50&search=M20&from=2026-01-01&to=2026-01-31
    const { searchParams } = new URL(request.url);
    const from   = searchParams.get("from");
    const to     = searchParams.get("to");
    const search = searchParams.get("search");

    // Pagination calculations (capped at max 200 records per page for memory safety)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const MAX_LIMIT = 200;
    const requestedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;

    // Filter by currently authenticated user's ID
    const query = { userId: new mongoose.Types.ObjectId(session.id) };

    // Apply optional Date Range filters
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to)   query.createdAt.$lte = new Date(to + "T23:59:59.999Z");
    }

    // Apply optional Search filter across multiple text fields
    if (search) {
      const escaped = escapeRegex(search.trim().slice(0, 100));
      const s = { $regex: escaped, $options: "i" }; // "i" = case-insensitive search
      query.$or = [
        { docketNo: s },
        { customerName: s },
        { site: s },
        { grade: s },
        { truckNumber: s },
      ];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // HIGH-PERFORMANCE MONGO DB AGGREGATION USING $facet
    // Executes metadata count AND paginated data extraction in ONE DB round-trip.
    // ──────────────────────────────────────────────────────────────────────────
    const [result] = await BatchRecord.aggregate([
      { $match: query },
      {
        $facet: {
          // Branch 1: Count total matching documents for pagination math
          metadata: [{ $count: "total" }],
          
          // Branch 2: Sort, paginate, and project only necessary fields
          records: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                createdAt: 1, docketNo: 1, customerName: 1,
                site: 1, grade: 1, qty: 1, truckNumber: 1,
                truckDriver: 1, batchStart: 1, batchStop: 1,
                batchStartISO: 1, batchStopISO: 1,
                plantSN: 1, companyName: 1, orderNo: 1,
                mixDesign: 1, differences: 1, batchSize: 1,
                totals: 1, setWeights: 1, totalBatches: 1,
              },
            },
          ],
        },
      },
    ]);

    const total = result.metadata[0]?.total ?? 0;
    const records = result.records;

    // Normalize output keys to maintain contract with frontend client
    const data = records.map((r) => ({
      id:            r._id,
      created_at:    r.createdAt,
      docketNo:      r.docketNo,
      customerName:  r.customerName,
      site:          r.site,
      grade:         r.grade,
      qty:           r.qty,
      truckDriver:   r.truckDriver,
      truckNumber:   r.truckNumber,
      batchStart:    r.batchStart,
      batchStop:     r.batchStop,
      batchStartISO: r.batchStartISO,
      batchStopISO:  r.batchStopISO,
      plantSN:       r.plantSN,
      companyName:   r.companyName,
      orderNo:       r.orderNo,
      mixDesign:     r.mixDesign,
      differences:   r.differences,
      batchSize:     r.batchSize,
      totals:        r.totals,
      setWeights:    r.setWeights,
      totalBatches:  r.totalBatches,
    }));

    return Response.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/history error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ==============================================================================
// 2. POST HANDLER — Save New Batch Record
// ==============================================================================
export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const body = await request.json();
    const item = body.item || body;

    // Create record in MongoDB Atlas with sanitized input lengths
    const record = await BatchRecord.create({
      userId:        session.id,
      username:      truncate(session.username, 50),
      docketNo:      truncate(item.docketNo, 50),
      customerName:  truncate(item.customerName, 100),
      site:          truncate(item.site, 100),
      grade:         truncate(item.grade, 20),
      qty:           truncate(item.qty, 20),
      truckDriver:   truncate(item.truckDriver, 100),
      truckNumber:   truncate(item.truckNumber, 50),
      batchStart:    truncate(item.batchStart, 30),
      batchStop:     truncate(item.batchStop, 30),
      batchStartISO: truncate(item.batchStartISO, 50),
      batchStopISO:  truncate(item.batchStopISO, 50),
      plantSN:       truncate(item.plantSN, 50),
      companyName:   truncate(item.companyName, 100),
      orderNo:       truncate(item.orderNo, 50),
      mixDesign:     item.mixDesign    ?? {},
      differences:   item.differences  ?? {},
      batchSize:     Number(item.batchSize) || 0.5,
      totals:        item.totals       ?? {},
      setWeights:    item.setWeights   ?? {},
      totalBatches:  item.totalBatches ?? 0,
    });

    return Response.json({
      data: {
        id:         record._id,
        created_at: record.createdAt,
        docketNo:   record.docketNo,
      },
    });
  } catch (error) {
    // Handle MongoDB unique index error (docketNo unique constraint)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.docketNo) {
      return Response.json(
        { error: `Docket number ${error.keyValue.docketNo} already exists!` },
        { status: 409 }
      );
    }
    console.error("POST /api/history error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ==============================================================================
// 3. DELETE HANDLER — Remove One or All Records
// ==============================================================================
export async function DELETE(request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id  = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (all) {
      // Admin can delete all history, operators can only delete their own
      const filter = session.role === "admin" ? {} : { userId: session.id };
      const result = await BatchRecord.deleteMany(filter);
      return Response.json({ data: { deleted: result.deletedCount } });
    }

    if (!id) {
      return Response.json({ error: "id or all=true is required" }, { status: 400 });
    }

    const filter = { _id: id };
    if (session.role !== "admin") filter.userId = session.id;

    const result = await BatchRecord.findOneAndDelete(filter);

    if (!result) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }

    return Response.json({ data: { deleted: true } });
  } catch (error) {
    console.error("DELETE /api/history error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}