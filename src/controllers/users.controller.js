import asyncHandler from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

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
    console.log("email: ",email);

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
        throw new apiError(409, "User already exists with this email or username");
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

export {registerUser};