import jwt from "jsonwebtoken";
import User from "../schema/user";

/**
 * Middleware to authenticate users based on JWT.
 * Checks for the presence of a token and verifies it.
 * Sets user ID and role in the request object if valid.
 */
const auth = async (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace("Bearer ", "");
    try {
      const decoded = jwt.verify(token, process.env.SQ_JWT_SECRET);
      if (decoded) {
        const user = await User.findOne({ _id: decoded.id });
        if (user) {
          if (user.banned) {
            return res.status(403).send("User is banned");
          }
          req.userId = user._id;
          req.userRole = user.role;
          return next();
        } else {
          return res.sendStatus(404);
        }
      } else {
        return res.sendStatus(500);
      }
    } catch (err) {
      return next(err);
    }
  } else if (
    req.headers["x-sq-public-access"] === "true" &&
    req.headers["x-sq-server-secret"] === process.env.SQ_SERVER_SECRET
  ) {
    return next();
  } else {
    return res.sendStatus(401);
  }
};

export default auth;
