import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
const verifyJWT = asyncHandler(async (req, _, next) => {
    const accessToken = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ", "");
    console.log(accessToken)
    if (!accessToken) {
        throw new ApiErrors(401, "Unauthorised request");
    };
    const decodeToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodeToken?._id;
    const user = await User.findById(userId).select(" -password -refreshToken")
    if (!user) {
        throw new ApiErrors(402, "Invalid AccessToken");
    }
    req.user = user
    next()
});
export { verifyJWT };