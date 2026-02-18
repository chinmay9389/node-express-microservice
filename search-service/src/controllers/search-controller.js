const Search = require("../models/Search");
const logger = require("../utils/logger");

//implement caching here for 2 to 5 min

const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit!");
  try {
    const { query } = req.query;
    const cacheKey = `search:${query}`;
    const cachedSearchResult = await req.redisClient.get(cacheKey);

    if (cachedSearchResult) {
      console.log("cache hit for search query:", query);
      return res.json(JSON.parse(cachedSearchResult));
    }

    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(results));
    res.json(results);
  } catch (e) {
    logger.error("Error while searching post", e);
    res.status(500).json({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };
