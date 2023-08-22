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
  res: NextApiResponse<any>
) {
  try {
    const images: string[] = req.body.images;
    const results = await Promise.all(
      images.map((image) => 
        cloudinary.uploader.upload(image, {
          transformation: [
            {
              width: 360,
              height: 360,
              crop: 'fill'
            }
          ]
        })
      )
    );
    

    // Make sure we have all 4 images uploaded
    if (results.length !== 4) {
      return res
        .status(400)
        .json({ error: "Expected 4 images for the collage." });
    }

    // Extract public_ids from the results
    const [firstPublicId, secondPublicId, thirdPublicId, forthPublicId] =
      results.map((result) => result.public_id);

    const collageUrl = cloudinary.url(firstPublicId, {
      transformation: [
        { width: 360, height: 360, crop: "fill" },
        {
          overlay: secondPublicId,
          width: 360,
          height: 360,
          x: 360, // Move to the right by half its width
          y: 0, // Stay at the top
          crop: "fill",
        },
        {
          overlay: thirdPublicId,
          width: 360,
          height: 360,
          x: -180, // Stay on the left edge
          y: 360, // Move down by half its height
          crop: "fill",
        },
        {
          overlay: forthPublicId,
          width: 360,
          height: 360,
          x: 180, // Move to the right by half its width
          y: 180, // Move down by half its height
          crop: "fill",
        },
      ],
    });

    const response = await fetch(collageUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch the collage.");
    }

    const imageData = Buffer.from(await response.arrayBuffer());

    const result = await new Promise<CloudinaryResponse | null>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (
            error: any,
            result:
              | CloudinaryResponse
              | PromiseLike<CloudinaryResponse | null>
              | null
          ) => {
            if (error) reject(error);
            else if (!result)
              reject(new Error("Upload stream returned no result."));
            else resolve(result);
          }
        );
        stream.write(imageData);
        stream.end();
      }
    );

    if (result) {
      const { public_id, secure_url } = result;
      return res.status(200).json({ public_id, secure_url });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}
