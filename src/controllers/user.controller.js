import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { unlinkSync } from "fs";
import { subscribe } from "diagnostics_channel";

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
};

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

});

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
});

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
        };

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

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, currentPassword } = req.body;

    const isPasswordValid = await User.isPasswordCorrect(oldPassword)
    if (!isPasswordValid) {
        throw new ApiErrors(400, "Old Password doesn't match!");
    };

    await User.findByIdAndUpdate(req.user._id,
        {
            $set: { password: currentPassword }
        },
        {
            new: true
        });

    res.status(201)
        .json(new ApiResponse(200, "Password changes Successfully!"));

});

const getCurrentUser = asyncHandler(async (req, res) => {

    if (!req.user) {
        throw new ApiErrors(400, "No User Found!");
    }

    res.status(200)
        .json(new ApiResponse(200, "fetched User Successfully!"));
});

const updateUserInfo = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
        throw new ApiErrors(400, "fullname and Email required!");
    }
    const user = User.findById(
        req.user._id,
        {
            $set: { fullname, email }
        },
        { new: true }
    ).select("-password -refreshToken");
    res
        .status(200)
        .json(new ApiResponse(200, user, " Account details updated successfully"));
});

const updateAvatarImage = asyncHandler(async (req, res) => {
    const avatarImagePath = req.files?.path;
    try {
        if (!avatarImagePath) {
            throw new ApiErrors(400, "Unable to find avatarImage!")
        };
        if (!req.user || req.user._id) {
            throw new ApiErrors(401, "No user found!");
        };
        const avatarImageUrl = await uploadOnCloudinary(avatarImagePath);

        if (!avatarImageUrl) {
            throw new ApiErrors(402, "Unable to upload Image on cloud!");
        };

        const user = User.findByIdAndUpdate(req.user._id, { $set: { avatarImage: avatarImageUrl } }, { new: true }).select("-refreshToken -password");
        if (!user) {
            throw new ApiErrors(401, " Invalid User!");
        }
        res.status(200).json(new ApiResponse(200, user, "Successfully updated coverImage!"));

    } catch (error) {
        unlinkSync(coverImagePath);
        throw new ApiErrors(500, error || "Not able to upload file!")
    }
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImagePath = req.files?.path;
    try {

        if (!coverImagePath) {
            throw new ApiErrors(400, "Unable to find coverImage!")
        };

        if (!req.user || req.user._id) {
            throw new ApiErrors(401, "No user found!");
        };

        const coverImageUrl = await uploadOnCloudinary(coverImagePath);

        if (!coverImageUrl) {
            throw new ApiErrors(402, "Unable to upload Image");
        };

        const user = User.findByIdAndUpdate(
            req.user._id,
            {
                $set: { coverImage: coverImageUrl }
            },
            { new: true }
        ).select("-refreshToken -password");

        if (!user) {
            throw new ApiErrors(401, " Invalid User!");
        }

        res.status(200).json(new ApiResponse(200, user, "Successfully updated coverImage!"));

    } catch (error) {
        unlinkSync(coverImagePath);
        throw new ApiErrors(500, error || "Not able to upload file!")
    }
});

const getChannelProfile = asyncHandler(async (req, res) => {
    const username = res.params.username;
    if (!username) {
        throw new ApiErrors(400, "username not found!");
    };
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localFileds: "_id",
                foreignField: "channel",
                as: "subscibers",
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "channel"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedChannelCount: {
                    $size: "$channel"
                },
                isSubscribed: {
                    $if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                    $then: true,
                    $else: false,
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedChannelCount: 1,
                isSubscribed: 1,
            }
        }
    ]);

    console.log(channel)
    if (!channel) {
        throw new ApiErrors(404, "No channel found!");
    };
    res
        .status(200)
        .json(new ApiResponse(200, channel, "Successfully found Channel!"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserInfo,
    updateAvatarImage,
    updateCoverImage,
    getChannelProfile,
};