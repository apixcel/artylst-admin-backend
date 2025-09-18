import { PipelineStage } from "mongoose";
import AppError from "../errors/AppError";
import { IAnyObject } from "../interface/any";
import Artist from "../models/artist.model";
import ArtistView from "../models/artistView.model";
import FeaturedArtist from "../models/featuredArtist.model";
import Genre from "../models/genre.model";
import Order from "../models/order.model";
import Pricing from "../models/pricing.model";
import Review from "../models/review.model";
import catchAsyncError from "../utils/catchAsync";
import sendResponse from "../utils/send.response";

const getArtists = catchAsyncError(async (req, res) => {
  const { searchTerm, genre, sort } = req.query as Record<string, string>;
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

  if (minPrice && maxPrice && minPrice > maxPrice) {
    throw new AppError(400, "minPrice cannot be greater than maxPrice");
  }

  // sorting
  const sortParam = String(sort || "").toLowerCase();

  let sortSpec: Record<string, 1 | -1>;
  switch (sortParam) {
    case "price-asc":
      sortSpec = { minStartingPrice: 1, avgRating: -1, createdAt: -1 };
      break;
    case "price-desc":
      sortSpec = { minStartingPrice: -1, avgRating: -1, createdAt: -1 };
      break;
    case "rating-asc":
      sortSpec = { avgRating: 1, createdAt: -1 };
      break;
    case "rating":
    case "rating-desc":
      sortSpec = { avgRating: -1, createdAt: -1 };
      break;
    case "newest":
      sortSpec = { createdAt: -1 };
      break;
    case "most-orders":
    case "orders":
      sortSpec = { ordersCount: -1, avgRating: -1, createdAt: -1 };
      break;
    default:
      // default: rating first, then newest
      sortSpec = { avgRating: -1, createdAt: -1 };
  }

  const sortStage: PipelineStage.Sort = { $sort: sortSpec };

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // ---- MATCH (search + genre via slugs)
  const match: IAnyObject = {};
  if (searchTerm?.trim()) {
    const rx = new RegExp(escapeRegex(searchTerm.trim()), "i");
    match.$or = [{ fullName: rx }, { displayName: rx }, { userName: rx }];
  }

  if (genre) {
    const slugs = Array.isArray(genre) ? genre : String(genre).split(",");
    const genres = await Genre.find({ slug: { $in: slugs } }, { _id: 1 });
    const genreIds = genres.map((g) => g._id);
    if (genreIds.length) {
      match.genre = { $in: genreIds };
    }
  }

  const pipeline: PipelineStage[] = [];
  if (Object.keys(match).length) {
    pipeline.push({ $match: match });
  }

  pipeline.push(
    {
      $lookup: {
        from: "orders", // <-- collection name (default for Order model)
        let: { artistId: "$_id" },
        pipeline: [
          // If only want completed orders to count, use the status filter below instead:
          // { $match: { $expr: { $and: [ { $eq: ["$artist", "$$artistId"] }, { $eq: ["$status", "completed"] } ] } } },
          { $match: { $expr: { $eq: ["$artist", "$$artistId"] } } },
          { $group: { _id: null, ordersCount: { $sum: 1 } } },
        ],
        as: "orderStats",
      },
    },
    {
      $addFields: {
        ordersCount: { $ifNull: [{ $first: "$orderStats.ordersCount" }, 0] },
      },
    },
    { $project: { orderStats: 0 } }
  );

  // ---- REVIEWS: avgRating, reviewCount
  pipeline.push(
    {
      $lookup: {
        from: "reviews",
        let: { artistId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$artist", "$$artistId"] } } },
          { $group: { _id: null, avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
        ],
        as: "reviewsStats",
      },
    },
    {
      $addFields: {
        avgRating: { $ifNull: [{ $first: "$reviewsStats.avgRating" }, 0] },
        reviewCount: { $ifNull: [{ $first: "$reviewsStats.reviewCount" }, 0] },
      },
    },
    { $project: { reviewsStats: 0 } }
  );

  // ---- PRICINGS: compute minStartingPrice across active tiers
  pipeline.push(
    {
      $lookup: {
        from: "pricings",
        let: { artistId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ["$artist", "$$artistId"] }, { $eq: ["$isActive", true] }] },
            },
          },
          {
            $group: { _id: null, minStartingPrice: { $min: "$priceUsd" }, tierCount: { $sum: 1 } },
          },
        ],
        as: "priceStats",
      },
    },
    {
      $addFields: {
        minStartingPrice: { $ifNull: [{ $first: "$priceStats.minStartingPrice" }, null] },
        pricingTierCount: { $ifNull: [{ $first: "$priceStats.tierCount" }, 0] },
      },
    },
    { $project: { priceStats: 0 } }
  );

  pipeline.push({
    $lookup: {
      from: "genres",
      let: { ids: "$genre" },
      pipeline: [
        {
          $match: {
            $expr: {
              $in: [
                "$_id",
                {
                  $cond: [
                    { $isArray: "$$ids" },
                    "$$ids",
                    { $ifNull: [["$$ids"], []] }, // wrap single value, or [] if null
                  ],
                },
              ],
            },
          },
        },
        // { $project: { name: 1 } }
      ],
      as: "genre",
    },
  });

  // get only proper artist, who have at least one active pricing and proper profile
  pipeline.push({
    $match: {
      coverPhoto: { $ne: null },
      avatar: { $ne: null },
      minStartingPrice: { $ne: null },
    },
  });

  // ---- PRICE RANGE FILTER (based on minStartingPrice)
  const priceMatch: IAnyObject = {};
  if (typeof minPrice === "number" && !Number.isNaN(minPrice)) {
    priceMatch.$gte = minPrice;
  }
  if (typeof maxPrice === "number" && !Number.isNaN(maxPrice)) {
    priceMatch.$lte = maxPrice;
  }
  if (Object.keys(priceMatch).length) {
    pipeline.push({ $match: { minStartingPrice: priceMatch } });
  }

  // optional rating filter
  if (typeof minRating === "number" && !Number.isNaN(minRating)) {
    pipeline.push({ $match: { avgRating: { $gte: minRating } } });
  }

  // ---- FACET for pagination + total
  pipeline.push({
    $facet: {
      data: [
        sortStage,
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            fullName: 1,
            displayName: 1,
            userName: 1,
            genre: 1,
            ordersCount: 1,
            gender: 1,
            createdAt: 1,
            avgRating: 1,
            reviewCount: 1,
            minStartingPrice: 1,
            pricingTierCount: 1,
            avatar: 1,
          },
        },
      ],
      total: [{ $count: "value" }],
    },
  });

  const [{ data, total }] = await Artist.aggregate(pipeline);
  const totalCount = total?.[0]?.value ?? 0;

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data,
    message: "Artists fetched successfully",
    meta: { totalDoc: totalCount, page, limit },
  });
});

const getArtistProfileByUserName = catchAsyncError(async (req, res) => {
  const userName = req.params.userName;

  const artist = await Artist.findOne({ userName: userName })
    .select("-password -auth -dob -email")
    .populate("genre");

  if (!artist) {
    throw new AppError(404, "Artist not found");
  }

  const minPrice = await Pricing.findOne({ artist: artist._id }).sort({ priceUsd: 1 });

  const avgRating = await Review.aggregate([
    {
      $match: {
        artist: artist._id,
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  const reviewCount = await Review.countDocuments({ artist: artist._id });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data: {
      ...artist.toObject(),
      avgRating: avgRating?.[0]?.avgRating ?? 0,
      minStartingPrice: minPrice?.priceUsd ?? 0,
      reviewCount,
      introVideo:
        "https://res.cloudinary.com/dlvchiynp/video/upload/v1742454532/samples/elephants.mp4",
      introThumbnail:
        "https://res.cloudinary.com/dlvchiynp/image/upload/v1753379828/showrepublic/ouakzjx1julao4zpoz2i.jpg",
    },
    message: "Artist Profile fetched successfully",
  });
});

const getRankedArtists = catchAsyncError(async (req, res) => {
  const validRanks = ["top", "featured"];
  const rankType = req.query.rankType as string;

  const type = rankType ? (validRanks.includes(rankType) ? rankType : "top") : "top";

  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;

  const ordersColl = Order.collection.name;
  const reviewsColl = Review.collection.name;
  const pricingsColl = Pricing.collection.name;
  const artistsColl = Artist.collection.name;

  const enrichPipeline: PipelineStage[] = [
    // Orders
    {
      $lookup: {
        from: ordersColl,
        let: { artistId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$artist", "$$artistId"] } } },
          { $group: { _id: null, totalIncome: { $sum: "$price" }, ordersCount: { $sum: 1 } } },
        ],
        as: "orderStats",
      },
    },
    // Reviews
    {
      $lookup: {
        from: reviewsColl,
        let: { artistId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$artist", "$$artistId"] } } },
          { $group: { _id: null, avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
        ],
        as: "reviewStats",
      },
    },
    // Pricing
    {
      $lookup: {
        from: pricingsColl,
        let: { artistId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$artist", "$$artistId"] }, isActive: true } },
          { $group: { _id: null, minStartingPrice: { $min: "$priceUsd" } } },
        ],
        as: "pricingStats",
      },
    },
    // Genres
    {
      $lookup: {
        from: "genres",
        localField: "genre",
        foreignField: "_id",
        as: "genre",
      },
    },

    // Unwind stats
    { $unwind: { path: "$orderStats", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$reviewStats", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$pricingStats", preserveNullAndEmptyArrays: true } },

    // Add fields
    {
      $addFields: {
        totalIncome: { $ifNull: ["$orderStats.totalIncome", 0] },
        ordersCount: { $ifNull: ["$orderStats.ordersCount", 0] },
        avgRating: { $ifNull: ["$reviewStats.avgRating", null] },
        reviewCount: { $ifNull: ["$reviewStats.reviewCount", 0] },
        minStartingPrice: { $ifNull: ["$pricingStats.minStartingPrice", null] },
        avgForSort: {
          $cond: [
            { $gt: [{ $ifNull: ["$reviewStats.reviewCount", 0] }, 0] },
            { $ifNull: ["$reviewStats.avgRating", 0] },
            -1,
          ],
        },
      },
    },

    // Sort
    { $sort: { reviewCount: -1, avgForSort: -1, ordersCount: -1, totalIncome: -1 } },

    {
      $match: {
        coverPhoto: { $ne: null },
        avatar: { $ne: null },
        minStartingPrice: { $ne: null },
      },
    },

    // Project
    {
      $project: {
        artistId: "$_id",
        displayName: 1,
        userName: 1,
        fullName: 1,
        avatar: 1,
        country: 1,
        genre: 1,
        ordersCount: 1,
        coverPhoto: 1,
        reviewCount: 1,
        minStartingPrice: 1,
        avgRating: {
          $cond: [{ $ne: ["$avgRating", null] }, { $round: ["$avgRating", 2] }, null],
        },
      },
    },
  ];

  let basePipeline: PipelineStage[] = [];

  if (type === "featured") {
    basePipeline = [
      { $group: { _id: "$artist" } },
      {
        $lookup: {
          from: artistsColl,
          localField: "_id",
          foreignField: "_id",
          as: "artist",
        },
      },
      { $unwind: "$artist" },
      { $replaceRoot: { newRoot: "$artist" } },
    ];
  } else {
    basePipeline = [];
  }

  const pipeline = [...basePipeline, ...enrichPipeline];

  const [results, totalArr] = await Promise.all([
    type === "featured"
      ? FeaturedArtist.aggregate([...pipeline, { $skip: skip }, { $limit: limit }])
      : Artist.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
    type === "featured"
      ? FeaturedArtist.aggregate([...pipeline, { $count: "count" }])
      : Artist.aggregate([...pipeline, { $count: "count" }]),
  ]);

  const total = totalArr[0]?.count || 0;

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data: results,
    message: `${type === "featured" ? "Featured" : "Top"} artists fetched successfully`,
    meta: { page, limit, totalDoc: total },
  });
});

const popularArtistsThisWeek = catchAsyncError(async (req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const ORDER_STATUS_FILTER = { status: "completed" };

  const pipeline: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: sevenDaysAgo, $lte: now },
        ...ORDER_STATUS_FILTER,
      },
    },

    //  Count orders grouped by artist
    { $group: { _id: "$artist", ordersCount: { $sum: 1 } } },

    //  Top 20 by order count
    { $sort: { ordersCount: -1 } },
    { $limit: 20 },

    //  Join artist document
    {
      $lookup: {
        from: "artists",
        localField: "_id",
        foreignField: "_id",
        as: "artist",
      },
    },
    { $unwind: "$artist" },

    // Reviews: avgRating & reviewCount
    {
      $lookup: {
        from: "reviews",
        let: { artistId: "$artist._id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$artist", "$$artistId"] } } },
          {
            $group: {
              _id: null,
              avgRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 },
            },
          },
        ],
        as: "reviewsStats",
      },
    },
    {
      $addFields: {
        avgRating: { $ifNull: [{ $first: "$reviewsStats.avgRating" }, 0] },
        reviewCount: { $ifNull: [{ $first: "$reviewsStats.reviewCount" }, 0] },
      },
    },
    { $project: { reviewsStats: 0 } },

    //  Pricings: minStartingPrice (+ count of active tiers)
    {
      $lookup: {
        from: "pricings",
        let: { artistId: "$artist._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$artist", "$$artistId"] }, { $eq: ["$isActive", true] }],
              },
            },
          },
          {
            $group: {
              _id: null,
              minStartingPrice: { $min: "$priceUsd" },
              tierCount: { $sum: 1 },
            },
          },
        ],
        as: "priceStats",
      },
    },
    {
      $addFields: {
        minStartingPrice: { $ifNull: [{ $first: "$priceStats.minStartingPrice" }, null] },
        pricingTierCount: { $ifNull: [{ $first: "$priceStats.tierCount" }, 0] },
      },
    },
    { $project: { priceStats: 0 } },

    //  Populate genre
    {
      $lookup: {
        from: "genres",
        localField: "artist.genre", // works for single ObjectId or array
        foreignField: "_id",
        as: "genre",
      },
    },

    {
      $project: {
        _id: 0,
        artistId: "$artist._id",
        email: "$artist.email",
        fullName: "$artist.fullName",
        displayName: "$artist.displayName",
        userName: "$artist.userName",
        genre: 1, // populated
        gender: "$artist.gender",
        createdAt: "$artist.createdAt",
        ordersCount: 1,
        avatar: "$artist.avatar",
        avgRating: 1,
        reviewCount: 1,
        minStartingPrice: 1,
        pricingTierCount: 1,
      },
    },
  ];

  const data = await Order.aggregate(pipeline);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data,
    message: "Popular artists for this week fetched successfully",
  });
});

const topViewedArtistsLast30Days = catchAsyncError(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const pipeline: PipelineStage[] = [
    { $match: { createdAt: { $gte: thirtyDaysAgo, $lte: now } } },

    { $group: { _id: "$artist", viewCount: { $sum: 1 } } },

    { $sort: { viewCount: -1 } },
    { $limit: 20 },

    {
      $lookup: {
        from: "artists",
        localField: "_id",
        foreignField: "_id",
        as: "artist",
      },
    },
    { $unwind: "$artist" },

    {
      $lookup: {
        from: "genres",
        localField: "artist.genre", // works for single ObjectId or array
        foreignField: "_id",
        as: "genre",
      },
    },
    {
      $project: {
        _id: 0,
        artistId: "$artist._id",
        fullName: "$artist.fullName",
        displayName: "$artist.displayName",
        userName: "$artist.userName",
        genre: 1, // populated array (or single if flattened)
        viewCount: 1, // last-30-days views
        avatar: "$artist.avatar",
        createdAt: "$artist.createdAt",
      },
    },
  ];

  const data = await ArtistView.aggregate(pipeline);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data,
    message: "Top viewed artists (last 30 days) fetched successfully",
  });
});

const getPicingListByArtistUserName = catchAsyncError(async (req, res) => {
  const userName = req.params.userName;

  const artist = await Artist.findOne({ userName: userName }).select("_id");

  if (!artist) {
    throw new AppError(404, "Artist not found");
  }

  const pricings = await Pricing.find({ artist: artist._id }).sort({ order: 1 });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data: pricings,
    message: "Pricings fetched successfully",
  });
});

const artistController = {
  getArtists,
  getPicingListByArtistUserName,
  getRankedArtists,
  getArtistProfileByUserName,
  topViewedArtistsLast30Days,
  popularArtistsThisWeek,
};

export default artistController;
