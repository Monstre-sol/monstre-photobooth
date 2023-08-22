import { Inter } from "next/font/google";
import React, { useEffect } from "react";
import Webcam from "react-webcam";
import { useRef, useState } from "react";
import { Cloudinary, CloudinaryImage } from "@cloudinary/url-gen";
import ReactImageFallback from "react-image-fallback";
import { Button } from "@/components/ui/button";
import { name } from "@cloudinary/url-gen/actions/namedTransformation";
import Lottie from "lottie-react";
import countdown from "../countdown.json";
import countdownthree from "../threeseconds.json";
import { motion, easeInOut, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { QRCode } from "react-qrcode-logo";
import { ArrowLeftCircle, Link, SwitchCamera } from "lucide-react";
import { Toaster, toast } from "sonner";
import Head from "next/head";

const cld = new Cloudinary({
  cloud: {
    cloudName: "{*your cloud name*}",
  },
  url: {
    secure: true,
  },
});

const OVERLAY_OPTIONS = [
  { id: "presetsix", name: "LamportDAO" },
  { id: "preseteight", name: "GM, Monstres" },
  { id: "preseteleven", name: "GM, Berlin" },
  { id: "presetnine", name: "Polaroid By Valenci" },
  { id: "presetten", name: "Bonk" },
  { id: "presettwelve", name: "Solana By Valenci" },
  { id: "presetthree", name: "Solana Beach" },
  { id: "presetfour", name: "Good Vibes" },
  { id: "presetfive", name: "Halloween" },
  { id: "presetone", name: "Dao Jones" },
];

const inter = Inter({ subsets: ["latin"] });

type CloudinaryResponse = {
  secure_url: string;
  public_id: string;
};

interface UploadResponse {
  tiplinkUrl: string;
}

//todo, change to useReducer
export default function Home() {
  const webcamRef = useRef<Webcam | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>();
  const [cldData, setCldData] = useState<CloudinaryResponse | null>(null);
  const [filter, setFilter] = useState<string | null>();
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [tiplinkUrl, setTiplinkUrl] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState<number>(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownCompleted, setCountdownCompleted] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const [imagesSrc, setImagesSrc] = useState<string[]>([]);
  const [src, setSrc] = useState<string | null>(imageSrc || null);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
  const [frozenImage, setFrozenImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState("user");
  const capturedImagesRef = useRef<string[]>([]);
  const [isFirstCountdown, setIsFirstCountdown] = useState(true);

  const videoConstraints = {
    width: 180,
    height: 180,
    facingMode: facingMode,
  };

  let myImage: any;

  function buildImageUrl(public_id: string, namedTransform: string) {
    const myImage = cld.image(public_id);
    myImage.namedTransformation(name(namedTransform)); // Use the passed named transformation
    return myImage.toURL();
  }

  useEffect(() => {
    if (cldData?.public_id && selectedOverlay) {
      const selectedPreset = OVERLAY_OPTIONS.find(
        (option) => option.id === selectedOverlay
      );
      if (selectedPreset) {
        setSrc(buildImageUrl(cldData.public_id, selectedPreset.id));
      }
    }
  }, [cldData, selectedOverlay]);

  function handleWebcamClick() {
    setIsTapped(true);
    setIsFirstCountdown(capturedImagesRef.current.length === 0);

    const startCaptureSequence = (duration: number | undefined) => {
      setShowCountdown(true);
      setTimeout(() => {
        captureImage();
      }, duration);
    };

    const captureImage = () => {
      const image = webcamRef.current?.getScreenshot();
      if (image) {
        capturedImagesRef.current.push(image);
        setCurrentSnapIndex((prev) => prev + 1);
        setFrozenImage(image); // Freeze the webcam

        setTimeout(() => {
          setFrozenImage(null); // Unfreeze after the specified delay.

          // If less than 4 images are captured, start the next sequence.
          if (capturedImagesRef.current.length < 4) {
            setIsFirstCountdown(false);
            // Add 2-second delay before initiating the next sequence.
            setTimeout(() => {
              startCaptureSequence(4000);
            }, 2000);
          } else {
            setImagesSrc([...capturedImagesRef.current]);
          }
        }, 2000); // Unfreeze after 2 seconds
      }
    };

    // Start the capture sequence
    startCaptureSequence(capturedImagesRef.current.length === 0 ? 5000 : 3000);
  }

  function handleOnReset() {
    capturedImagesRef.current = [];
    setImagesSrc([]);
    setImageSrc(null);
    setCldData(null); 
    setFilter(null);
    setSelectedOverlay(null);
    setTiplinkUrl(null);
    setCountdownCompleted(false);
    setShowCountdown(false);
    setIsTapped(false);
    setImagesSrc([]); 
    setSrc(null); 
    setCurrentSnapIndex(0);
    setFrozenImage(null); 
    setResetKey((prevKey) => prevKey + 1);
  }

  function handleOnResetRefresh() {
    capturedImagesRef.current = [];
    setImagesSrc([]);
    setImageSrc(null);
    setCldData(null); 
    setFilter(null);
    setSelectedOverlay(null);
    setTiplinkUrl(null);
    setCountdownCompleted(false);
    setShowCountdown(false);
    setIsTapped(false);
    setImagesSrc([]); 
    setSrc(null); 
    setCurrentSnapIndex(0);
    setFrozenImage(null); 
    setResetKey((prevKey) => prevKey + 1);
  }

  const MAX_RETRIES = 3; // Choose the number of retries you want, in case of choppy internet

  useEffect(() => {
    if (imagesSrc.length !== 4) return;

    const uploadCollage = async (retryCount: number = 0): Promise<any> => {
      try {
        const response = await fetch("/api/cloudinary/uploadCollage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: imagesSrc,
          }),
        });

        const data = await response.json();

        if (!data || !data.secure_url) {
          throw new Error("Failed to obtain a secure URL for the collage");
        }

        setCldData(data);
        setSrc(data.secure_url); // Use the collage URL
        return data;
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          return uploadCollage(retryCount + 1); // Retry by calling the function recursively
        } else {
          throw error; // If we've retried the max number of times, throw the error to be caught by toast.promise
        }
      }
    };

    // Use the toast.promise here
    toast.promise(uploadCollage(), {
      loading: "Rendering collage...",
      success: (data: any) => {
        return "Collage successfully rendered!";
      },
      error: (err: any) => {
        console.error(err);
        return "Failed to upload collage after multiple attempts.";
      },
    });
  }, [imagesSrc]);

  async function downloadAndUpload(imageUrl: RequestInfo | URL) {
    const uploadPromise = new Promise<UploadResponse>(
      async (resolve, reject) => {
        try {
          // Download the image
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const imageDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Upload the image
          const uploadResponse = await fetch("/api/cloudinary/uploadAndMint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imageDataUrl }),
          });

          const uploadData: UploadResponse = await uploadResponse.json();
          resolve(uploadData);
        } catch (error) {
          reject(error);
        }
      }
    );

    toast.promise(uploadPromise, {
      loading: "Minting your Collectible...",
      success: (data: UploadResponse) => {
        setTiplinkUrl(data.tiplinkUrl);
        return "Image successfully uploaded!";
      },
      error: "Failed to upload image.",
    });
  }

  return (
    <>
      <Head>
        <title>Monstrè OPOS Photo Booth</title>
        <meta
          name="description"
          content="Photos as digital collectibles minted as cNFTs on Solana!"
          key="desc"
        />
        <meta property="og:title" content="Monstrè OPOS Photo Booth" />
        <meta
          property="og:description"
          content="Photos as digital collectibles minted as cNFTs on Solana!"
        />
        <meta
          property="og:image"
          content="https://booth.monstre.net/monstre_bg.png"
        />
        <meta property="og:type" content="website" />
      </Head>
      <Toaster position="top-center" />
      <main
        className={`flex flex-col min-h-screen items-center justify-center p-4 ${inter.className}`}
        style={{
          backgroundImage: "url(/monstre_bg.png)",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <div
          onClick={handleWebcamClick}
          className="relative w-full cursor-pointer"
          style={{
            position: "relative",
            maxWidth: "720px",
            cursor: "pointer", // Set the cursor to a pointer
          }}
        >
          {!tiplinkUrl && !isTapped && (
            <div
              style={{
                position: "absolute",
                zIndex: 3,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "60px",
                fontWeight: "bold",
                color: "white",
                borderRadius: "16px",
                background: "rgba(0, 0, 0, 0.5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span>Tap to</span>
                <span>Snap!</span>
              </div>
            </div>
          )}
          {!tiplinkUrl && showCountdown && isFirstCountdown && (
            <Lottie
              animationData={countdown}
              loop={false}
              onComplete={() => {
                setCountdownCompleted(true);
                setShowCountdown(false); // Hide the countdown
              }}
              style={{
                position: "absolute",
                zIndex: 2,
                width: "100%",
                height: "100%",
              }}
            />
          )}
          {!tiplinkUrl && showCountdown && !isFirstCountdown && (
            <Lottie
              animationData={countdownthree}
              loop={false}
              onComplete={() => {
                setCountdownCompleted(true);
                setShowCountdown(false);
              }}
              style={{
                position: "absolute",
                zIndex: 2,
                width: "100%",
                height: "100%",
              }}
            />
          )}

          {!tiplinkUrl &&
            (src && countdownCompleted ? (
              <div className="flex justify-center">
                <motion.img
                  src={src}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 3 }}
                  className="w-3/5 lg:max-w-[468px] rounded-lg border-4 border-white"
                  style={{ width: "100%" }}
                />
              </div>
            ) : countdownCompleted && frozenImage ? (
              <AnimatePresence>
                <motion.img
                  src={frozenImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }} // You can adjust this duration as needed
                  exit={{
                    opacity: 1,
                  }}
                  style={{
                    zIndex: 1,
                    width: "100%",
                    height: "100%",
                    borderRadius: "16px",
                  }}
                />
              </AnimatePresence>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                style={{
                  zIndex: 1,
                  width: "100%",
                  height: "100%",
                }}
              >
                <Webcam
                  key={resetKey}
                  ref={webcamRef}
                  videoConstraints={videoConstraints}
                  screenshotFormat="image/webp"
                  style={{
                    zIndex: 1,
                    width: "100%",
                    height: "100%",
                    borderRadius: "16px",
                    border: "10px solid white",
                  }}
                />
              </motion.div>
            ))}
        </div>
        {!isTapped && (
          <div className="flex justify-center mt-4">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setFacingMode((prevMode) =>
                  prevMode === "user" ? "environment" : "user"
                );
              }}
              className="bg-blue-500 w-14 h-14 hover:bg-blue-600 text-white rounded-full p-2"
            >
              <SwitchCamera className="w-8 h-8 mx-auto justify-center" />
            </button>
          </div>
        )}

        {!tiplinkUrl && src && (
          <div className="flex flex-col items-center w-full lg:w-auto lg:max-w-[468px]">
            <div className="mt-2 w-full lg:max-w-[468px]">
              {!tiplinkUrl && countdownCompleted && (
                <div className="overflow-x-auto">
                  <div
                    className="flex whitespace-nowrap"
                    style={{ minWidth: "min-content" }}
                  >
                    {" "}
                    <ul className="flex items-center space-x-4">
                      {OVERLAY_OPTIONS.map((overlayOption) => {
                        return (
                          <li
                            key={overlayOption.id}
                            className="flex flex-col items-center space-y-2 w-40 inline-block"
                          >
                            <div
                              onClick={() =>
                                setSelectedOverlay(overlayOption.id)
                              }
                              className="cursor-pointer rounded-xl overflow-hidden flex items-center justify-center h-full"
                            >
                              <ReactImageFallback
                                src={buildImageUrl(
                                  cldData?.public_id as string,
                                  overlayOption.id || ""
                                )}
                                fallbackImage="bonk.png"
                                initialImage="bonk.png"
                                alt="overlayed image"
                                width="150"
                                height="150"
                              />
                            </div>
                            <Badge variant="tertiary">
                              {overlayOption.name}
                            </Badge>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {!tiplinkUrl && src && countdownCompleted && (
          <div className="flex justify-between items-center space-x-4 mt-4 w-full lg:w-[468px]">
            <Button
              className="text-sm rounded-xl"
              variant="secondary"
              onClick={handleOnReset}
              style={{ width: "200px" }}
            >
              Reset Photo
            </Button>
            <Button
              className="text-sm rounded-xl"
              variant="secondary"
              onClick={() => src && downloadAndUpload(src)}
              style={{ width: "200px" }}
            >
              Confirm and Mint Photo!
            </Button>
          </div>
        )}

        {tiplinkUrl && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                {" "}
                {/* This is the outer container */}
                <div
                  className="relative bg-white p-4 rounded"
                  style={{
                    borderRadius: "16px",
                  }}
                >
                  <QRCode
                    value={tiplinkUrl}
                    size={250}
                    bgColor={"transparent"}
                    fgColor={"#000"}
                    logoImage="/tiplinkqr.svg"
                    logoWidth={50}
                    logoHeight={50}
                    eyeRadius={6}
                    eyeColor={"#007cbf"}
                  />
                </div>
                <a
                  href={tiplinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4"
                >
                  <Button
                    className="w-full text-lg rounded-xl"
                    variant="secondary"
                  >
                    Open TipLink <Link className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              </div>
            </motion.div>

            <motion.div
              className="mt-4 w-20 h-20 flex items-center justify-center rounded-full backdrop-blur"
              onClick={handleOnResetRefresh}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                cursor: "pointer",
              }}
            >
              <ArrowLeftCircle className="w-16 h-16 text-white" />
            </motion.div>
          </>
        )}
      </main>
    </>
  );
}