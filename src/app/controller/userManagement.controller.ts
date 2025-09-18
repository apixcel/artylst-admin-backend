import { IAnyObject } from "../interface/any";
import Auth from "../models/auth.model";
import catchAsyncError from "../utils/catchAsync";

import mongoose, { PipelineStage } from "mongoose";
import AppError from "../errors/AppError";
import Artist from "../models/artist.model";
import sendResponse from "../utils/send.response";

const getAllFanAndBusinessAccounts = catchAsyncError(async (req, res) => {
  const {
    page = "1",
    limit = "20",
    searchTerm,
    role = "all",
    sort = "-createdAt",
    isBanned,
  } = req.query as {
    page?: string;
    limit?: string;
    searchTerm?: string;
    role?: "fan" | "business" | "all";
    sort?: string;
    isBanned?: string;
  };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const baseMatch: IAnyObject = {
    isVerified: true,
    role: { $in: ["fan", "business"] },
  };
  if (role === "fan" || role === "business") {
    baseMatch.role = role;
  }

  if (isBanned === "true") {
    baseMatch.isBanned = true;
  }

  if (isBanned === "false") {
    baseMatch.isBanned = false;
  }

  // Build sort
  const sortField = (() => {
    const allowed = new Set([
      "createdAt",
      "-createdAt",
      "name",
      "-name",
      "email",
      "-email",
      "orders",
      "-orders",
    ]);
    if (!allowed.has(sort)) {
      return "-createdAt";
    }
    return sort;
  })();

  const sortStage: PipelineStage = (() => {
    const dir = sortField.startsWith("-") ? -1 : 1;
    const field = sortField.replace(/^-/, "");
    // all sortable fields exist in the projection below
    return { $sort: { [field]: dir, _id: 1 } };
  })();

  const pipeline: mongoose.PipelineStage[] = [
    { $match: baseMatch },

    // Join to Fan / Business
    {
      $lookup: {
        from: "fans",
        localField: "_id",
        foreignField: "auth",
        as: "fan",
      },
    },
    {
      $lookup: {
        from: "businesses",
        localField: "_id",
        foreignField: "auth",
        as: "business",
      },
    },

    // Flatten a common profile & type
    {
      $addFields: {
        _fan: { $arrayElemAt: ["$fan", 0] },
        _business: { $arrayElemAt: ["$business", 0] },
      },
    },
    {
      $addFields: {
        role: {
          $cond: [{ $gt: [{ $size: "$fan" }, 0] }, "fan", "business"],
        },
        name: {
          $let: {
            vars: {
              fn: { $ifNull: ["$_fan.fullName", null] },
              bn: { $ifNull: ["$_business.fullName", null] },
            },
            in: { $ifNull: ["$$fn", { $ifNull: ["$$bn", "$userName"] }] },
          },
        },
        profileEmail: {
          $ifNull: [{ $ifNull: ["$_fan.email", null] }, { $ifNull: ["$_business.email", null] }],
        },
      },
    },

    // Count Orders per buyer (Auth)
    {
      $lookup: {
        from: "orders",
        let: { authId: "$_id" },
        pipeline: [{ $match: { $expr: { $eq: ["$buyer", "$$authId"] } } }, { $count: "count" }],
        as: "ordersAgg",
      },
    },
    {
      $addFields: {
        orders: {
          $ifNull: [{ $arrayElemAt: ["$ordersAgg.count", 0] }, 0],
        },
      },
    },

    // Prepare final fields for table
    {
      $project: {
        _id: 1,
        name: 1,
        email: { $ifNull: ["$profileEmail", "$email"] },
        role: 1,
        orders: 1,
        createdAt: 1,
        isBanned: 1,
      },
    },
  ];

  // Search
  if (searchTerm && String(searchTerm).trim().length > 0) {
    const term = String(searchTerm).trim();
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: term, $options: "i" } },
          { email: { $regex: term, $options: "i" } },
        ],
      },
    });
  }

  // Sorting, pagination with facet
  pipeline.push(
    sortStage,
    {
      $facet: {
        data: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
        total: [{ $count: "count" }],
      },
    },
    {
      $addFields: {
        total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
      },
    }
  );

  const [result] = await Auth.aggregate(pipeline);

  const total = result?.total ?? 0;
  const data = result?.data ?? [];

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data,
    message: "Accounts fetched successfully",
    meta: {
      page: pageNum,
      limit: limitNum,
      totalDoc: total as number,
    },
  });
});
const getAllArtists = catchAsyncError(async (req, res) => {
  const {
    page = "1",
    limit = "20",
    searchTerm,
    sort = "-createdAt",
    isBanned,
  } = req.query as {
    page?: string;
    limit?: string;
    searchTerm?: string;
    sort?: string;
    isBanned?: string;
  };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const sortField = (() => {
    const allowed = new Set([
      "createdAt",
      "-createdAt",
      "name",
      "-name",
      "email",
      "-email",
      "orders",
      "-orders",
    ]);
    if (!allowed.has(sort)) {
      return "-createdAt";
    }
    return sort;
  })();

  const sortStage: PipelineStage = (() => {
    const dir = sortField.startsWith("-") ? -1 : 1;
    const field = sortField.replace(/^-/, "");
    return { $sort: { [field]: dir, _id: 1 } };
  })();

  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: "auths",
        localField: "auth",
        foreignField: "_id",
        as: "auth",
      },
    },
    { $unwind: "$auth" },

    {
      $match: {
        "auth.isVerified": true,
        ...(isBanned === "true" ? { "auth.isBanned": true } : {}),
        ...(isBanned === "false" ? { "auth.isBanned": false } : {}),
      },
    },

    {
      $lookup: {
        from: "orders",
        let: { artistId: "$_id" },
        pipeline: [{ $match: { $expr: { $eq: ["$artist", "$$artistId"] } } }, { $count: "count" }],
        as: "ordersAgg",
      },
    },
    {
      $addFields: {
        orders: { $ifNull: [{ $arrayElemAt: ["$ordersAgg.count", 0] }, 0] },
      },
    },

    {
      $addFields: {
        name: { $ifNull: ["$displayName", "$fullName"] },
        emailResolved: { $ifNull: ["$email", "$auth.email"] },
        type: "artist",
      },
    },

    // ⬇️ include avatar in the final output
    {
      $project: {
        _id: "$auth._id",
        artistId: "$_id",
        name: 1,
        email: "$emailResolved",
        type: 1,
        orders: 1,
        createdAt: 1,
        isBanned: "$auth.isBanned",
        avatar: "$avatar", // <- added
      },
    },
  ];

  if (searchTerm && String(searchTerm).trim().length > 0) {
    const term = String(searchTerm).trim();
    pipeline.push({
      $match: {
        $or: [
          { name: { $regex: term, $options: "i" } },
          { email: { $regex: term, $options: "i" } },
        ],
      },
    });
  }

  pipeline.push(
    sortStage,
    {
      $facet: {
        data: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
        total: [{ $count: "count" }],
      },
    },
    {
      $addFields: {
        total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
      },
    }
  );

  const [result] = await Artist.aggregate(pipeline);

  const total = result?.total ?? 0;
  const data = result?.data ?? [];

  return sendResponse(res, {
    success: true,
    statusCode: 200,
    data,
    message: "Artists fetched successfully",
    meta: {
      page: pageNum,
      limit: limitNum,
      totalDoc: total as number,
    },
  });
});

const toggleAccountBanStatus = catchAsyncError(async (req, res) => {
  const authId = req.params.authId;

  const auth = await Auth.findById(authId);

  if (!auth) {
    throw new AppError(404, "Account not found");
  }

  auth.isBanned = !auth.isBanned;
  await auth.save();

  sendResponse(res, {
    data: null,
    success: true,
    statusCode: 200,
    message: "Account Ban status updated successfully",
  });
});

const userManagementController = {
  getAllFanAndBusinessAccounts,
  toggleAccountBanStatus,
  getAllArtists,
};

export default userManagementController;
