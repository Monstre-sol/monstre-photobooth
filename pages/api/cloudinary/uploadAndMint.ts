// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { TipLink } from "@tiplink/api";
import base58 from "bs58";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import {
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  MetadataArgs,
  createMintToCollectionV1Instruction,
  TokenProgramVersion,
  TokenStandard,
} from "@metaplex-foundation/mpl-bubblegum";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import Redis from "ioredis";

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

type Data = {
  tiplinkUrl: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { image } = req.body;

  const redis = new Redis(process.env.REDIS_URL as string);
  let globalCounter = await redis.get("globalcounteropos");

  if (!globalCounter) {
    await redis.set("globalcounteropos", "1");
    globalCounter = "1";
  }

  const publicIdWithCounter = `monstreboothopos${globalCounter}`;

  const results = await cloudinary.uploader.upload(image, {
    format: "png",
    public_id: publicIdWithCounter,
  });

  const tiplink = await TipLink.create();

  //save Public Key
  const tiplinkPublicKey = tiplink.keypair.publicKey.toBase58();

  const convertTiplinkPublicKey = new PublicKey(tiplinkPublicKey);

  //save tiplinkurl
  const tiplinkUrl = tiplink.url.toString();

  const shopPrivateKey = process.env.OP_PRIVATE_KEY as string;
  const shopKeypair = Keypair.fromSecretKey(base58.decode(shopPrivateKey));
  const shopPublicKey = shopKeypair.publicKey;

  const connection = new Connection(
    `https://rpc.helius.xyz/?api-key=${process.env.HELIUS_API_KEY}`
  );

  const [{ blockhash, lastValidBlockHeight }] = await Promise.all([
    connection.getLatestBlockhash(),
  ]);

  const transaction = new Transaction({
    feePayer: shopPublicKey,
    blockhash,
    lastValidBlockHeight,
  });

  const glowPublicKey = new PublicKey(
    "G1tCgTadgcxKFMsu544aHsL1eexzwLi1ZgRN9b3KQkrL"
  );

  const compressedNFTMetadata: MetadataArgs = {
    name: `Monstre Photo Booth`,
    symbol: "MON",
    uri: `https://shdw-drive.genesysgo.net/HcnRQ2WJHfJzSgPrs4pPtEkiQjYTu1Bf6DmMns1yEWr8/oposbooth${globalCounter}.json`,
    creators: [
      {
        address: shopPublicKey,
        verified: false,
        share: 100,
      },
      {
        address: glowPublicKey,
        verified: false,
        share: 0,
      },
    ],
    editionNonce: 0,
    uses: null,
    collection: null,
    primarySaleHappened: false,
    sellerFeeBasisPoints: 0,
    isMutable: false,
    tokenProgramVersion: TokenProgramVersion.Original,
    tokenStandard: TokenStandard.NonFungible,
  };

  const collectionMint = new PublicKey(
    "E4UoNp3xrE2VYRe4huepMqVGjQD4SaJ8MvsRG4Dd49r7"
  );
  const metadataAccount = new PublicKey(
    "4mKqFQt13AmAu81FotJUs8pRYHAYK7t929BrLRRcqwJy"
  );
  const masterEditionAccount = new PublicKey(
    "HFZt4g4nqT7kXvGHo3uqZ6o2MYx1Akc4h1jjVVSHeMYZ"
  );
  const treePub = new PublicKey("HCWBzn7eomDYsUtMXpxaTK5NC1sa6MGTuAJJdxHzaLac");

  const [bubblegumSigner, _bump2] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection_cpi", "utf8")],
    BUBBLEGUM_PROGRAM_ID
  );

  const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
    [treePub.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );

  const mintIxs: TransactionInstruction[] = [];
  mintIxs.push(
    createMintToCollectionV1Instruction(
      {
        payer: shopPublicKey,

        merkleTree: treePub,
        treeAuthority,
        treeDelegate: shopPublicKey,

        // set the receiver of the NFT
        leafOwner: convertTiplinkPublicKey,
        // set a delegated authority over this NFT
        leafDelegate: shopPublicKey,
        collectionAuthority: shopPublicKey,
        collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,
        collectionMint: collectionMint,
        collectionMetadata: metadataAccount,
        editionAccount: masterEditionAccount,

        // other accounts
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        bubblegumSigner: bubblegumSigner,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      },
      {
        metadataArgs: Object.assign(compressedNFTMetadata, {
          collection: { key: collectionMint, verified: false },
        }),
      }
    )
  );

  transaction.add(...mintIxs);
  await sendAndConfirmTransaction(connection, transaction, [shopKeypair], {
    commitment: "confirmed",
  });

  // to do, add retry if increment fails, webhook to inform operator.
  await redis.incrby("globalcounteropos", 1);

  // Add tiplinkUrl to the response
  res.status(200).json({ tiplinkUrl });
}
