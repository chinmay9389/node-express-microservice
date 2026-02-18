const Search = require("../models/Search");
const logger = require("../utils/logger");
const redisClient = require("../utils/redis");

async function invalidateSearchCache() {
  console.log("invalidating search cache");
  const keys = await redisClient.keys("search:*");
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}
async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    invalidateSearchCache();
    logger.info(
      `Search post created: ${event.postId}, ${newSearchPost._id.toString()}`,
    );
  } catch (e) {
    logger.error(e, "Error handling post creation event");
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    invalidateSearchCache();
    logger.info(`Search post deleted: ${event.postId}}`);
  } catch (error) {
    logger.error(error, "Error handling post deletion event");
  }
}

module.exports = { handlePostCreated, handlePostDeleted };
