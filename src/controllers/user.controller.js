import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {

    const { fullname, username, email, password } = req.body;
    //validtion Check for empty fields
    if (
        [fullname, username, email, password].some((fields) => fields?.trim() == "")
    ) {
        throw new ApiErrors(400, "All fields are required");
    }

    const existingUser = User.findOne({ $or: [{ username }, { email }] })

    // console.log("existing User : ", existingUser);


    // if (existingUser) {
    //     throw new ApiErrors(409, "User with this email and username already exist!")
    // }
    console.log("Files", req.files.avatar[0]);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalpath = req.files?.coverImage[0]?.path;

    console.log(avatarLocalPath);
    if (!avatarLocalPath) return new ApiErrors(400, "Avatar is missing")
    if (!coverImageLocalpath) return new ApiErrors(400, "Avatar is missing")

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalpath);

    if (!avatar) return new ApiErrors(400, "Avatar is required!")
    if (!coverImage) return new ApiErrors(400, "CoverImage is required!")

    console.log(avatar);

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    console.log("user", user);

    const createdUserExist = await User.findById(user._id).select("-password -refershToken");
    if (!createdUserExist) throw new ApiErrors(500, "Something went wrong While registering User!");
    return res.status(201).json(new ApiResponse(200, user, "successfully registered Data!"));

})

export { registerUser };