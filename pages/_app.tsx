import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';


export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>OPOS Photo Booth</title>
        <meta name="description" content="OPOS Photo Booth powered by cNFTs" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
