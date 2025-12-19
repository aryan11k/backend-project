import asyncHandler from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateTokens = async(userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    }
    catch(error){
        throw new apiError(500, "Error in generating tokens");
    }
}

const registerUser = asyncHandler(async (req, res) =>{
    //get user data from frontend
    //validate the data
    //check if user already exists
    //chech for image upload
    // upload image to cloudinary
    //create user in the database
    //remove password and refresh token from the response
    // send response back to the client

    const{ fullName, email, password, username } = req.body;  
    // console.log("email: ",email);

    if(
        [fullName, email, password, username].some(field => field?.trim() === "")
    ){
        throw new apiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{email}, {username}]
    })

    // console.log("existed", existedUser);
    

    if(existedUser){
        throw new apiError(400, "User already exists with this email or username");
    }

    

    const avatarlocalpath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    // console.log("avatar path:", avatarlocalpath);
    // console.log("cover image path:", coverImageLocalPath);

    if(!avatarlocalpath){
        throw new apiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new apiError(500, "Error in uploading avatar image");
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new apiError(500, "Something went wrong in creating user");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));

    
})

const loginUser = asyncHandler(async (req, res) => {
    //req body -> data
    //username or email
    //find user in db
    //password matching
    //generate tokens
    //send cookies

    const{email, password, username} = req.body;

    if(!(username || email)){
        throw new apiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{email},{username}]
    })
    if(!user){
        throw new apiError(404, "User not found");
    }
    
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new apiError(401, "Password is incorrect");
    }
    const {accessToken, refreshToken} = await generateTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200,
        {
            user: loggedInUser,
            accessToken,
            refreshToken
        },
        "User logged in successfully"
    ));
});
const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new apiError(401, "Refresh token is missing");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new apiError(404, "User not found");
        }
    
        if(user.refreshToken !== incomingRefreshToken){
            throw new apiError(401, "Invalid refresh token");
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newrefreshToken} = await generateTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(new ApiResponse(200, {accessToken, refreshToken: newrefreshToken}, "Access token refreshed successfully"));
    } 
    catch (error) {
        throw new apiError(500, "Error in refreshing access token");
    }
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};
