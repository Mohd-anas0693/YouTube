import { Router } from "express";
import { changeCurrentPassword, getChannelProfile, getWatchHistory, loginUser, logoutUser, registerUser, updateAccountDetails, updateAvatarImage, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/Auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields(
        [{
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }]
    ), registerUser);
router.route("/register").post(
    upload.fields(
        [{
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }]
    ), registerUser);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/update-account").post(verifyJWT, updateAccountDetails);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatarImage);
router.router("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router.router("/channel/:username").get(verifyJWT, getChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);


export default router;
