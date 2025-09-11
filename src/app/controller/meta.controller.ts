import QueryBuilder from "../builder/QueryBuilder";
import Genre from "../models/genre.model";
import Vibe from "../models/vibe.model";
import catchAsyncError from "../utils/catchAsync";
import sendResponse from "../utils/send.response";

const getGenres = catchAsyncError(async (req, res) => {
  const model = Genre.find({});

  const queryBuilder = new QueryBuilder(model, req.query)
    .search(["label"])
    .filter()
    .sort()
    .paginate();
  await queryBuilder.count();
  const genres = await queryBuilder.modelQuery;
  const meta = queryBuilder.getMeta();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data: genres,
    message: "Genres fetched successfully",
    meta,
  });
});
const getVibes = catchAsyncError(async (req, res) => {
  const model = Vibe.find({});

  const queryBuilder = new QueryBuilder(model, req.query)
    .search(["label"])
    .filter()
    .sort()
    .paginate();
  await queryBuilder.count();
  const vibes = await queryBuilder.modelQuery;
  const meta = queryBuilder.getMeta();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    data: vibes,
    message: "Vibes fetched successfully",
    meta,
  });
});

const metaController = {
  getGenres,
  getVibes,
};

export default metaController;
