// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

//export const config = {
//runtime: 'edge',
//};

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

type CloudinaryResponse = {
  public_id: string;
  secure_url: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CloudinaryResponse>
) {
  const { image } = req.body;
  const results = await cloudinary.uploader.upload(image, {
    transformation: [
      {
        width: 720,
        height: 720,
        crop: 'fill' // This will ensure that the image fills the 720x720 size.
      }
    ]
  });
  
  const { public_id, secure_url } = results;

  res.status(200).json({ public_id, secure_url });
}
