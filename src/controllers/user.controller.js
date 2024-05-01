import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        let user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken
        user.save({ validateBeforeSave: false });
        return { refreshToken, accessToken }
    } catch (error) {
        throw new ApiErrors(500, error);
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullname, username, email, password } = req.body;

    if (
        [fullname, username, email, password].some((fields) => fields?.trim() == "")
    ) {
        throw new ApiErrors(400, "All fields are required");
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] })


    if (existingUser) {
        throw new ApiErrors(409, "User with this email and username already exist!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalpath;
    if (Array.isArray(req.files?.coverImage) && res.files?.coverImage.length > 0) {
        coverImageLocalpath = req.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) return new ApiErrors(400, "Avatar is missing")

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalpath);


    if (!avatar) return new ApiErrors(400, "Avatar is required!")
    // if (!coverImage) return new ApiErrors(400, "CoverImage is required!")


    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });


    const createdUserExist = await User.findById(user._id).select("-password -refershToken");
    if (!createdUserExist) throw new ApiErrors(500, "Something went wrong While registering User!");
    return res.status(201).json(new ApiResponse(200, user, "successfully registered Data!"));

})
const loginUser = asyncHandler(async (req, res) => {

    let { email, username, password } = req.body;

    if (!username || !email) {
        throw new ApiErrors(400, " username or email is required");
    };
    let user = await User.findOne({ $or: [{ username }, { email }] })
    if (!user) {
        throw new ApiErrors(404, "User not found!")
    };

    const isPasswordvalid = await user.isPasswordCorrect(password);
    // console.log(isPasswordvalid)


    if (isPasswordvalid == false) {
        throw new ApiErrors(401, "password is incorrect!");
    };

    let { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    user.refreshToken = refreshToken
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    console.log("loggedInUser :", loggedInUser);

    const option = {
        httpOnly: true, secure: true
    }

    res.status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option).
        json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in Successfully"
            )
        )
})
const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            },
        },
        { new: true }).select("-password -refeshToken")

    const option = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(new ApiResponse(200, user, "User logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefershToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!incommingRefershToken) {
        throw new ApiErrors(406, "Unauthorised Request")
    }
    try {

        let decodedUserData = jwt.verify(incommingRefershToken, process.env.REFRESH_TOKEN_EXPIRY);
        const user = await User.findById(decodedUserData?._id).select(" -password");
        if (!user) {
            throw new ApiErrors(401, "Invalid Refresh Token")
        }
        if (incommingRefershToken != user.refreshToken) {
            throw new ApiErrors(401, "Refersh Token has been expired or Used!")
        }
        const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken();
        const option = {
            httpOnly: true,
            secure: true,
        }

        res.status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", refreshToken, option)
            .json(
                new ApiResponse(
                    201,
                    { "accessToken": accessToken, "refreshToken": refreshToken },
                    "Successfully updated Refresh Token"
                )
            );
    } catch (error) {
        throw new ApiErrors(401, error?.message || "Invalid Refresh Token");
    }
});


export { registerUser, loginUser, logoutUser, refreshAccessToken };