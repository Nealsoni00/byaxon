import type { Metadata } from "next";

const GAME_IMAGE = 'https://igaqhhu6xiolnmsh.public.blob.vercel-storage.com/images/1773363194597-optimuschime.png';

export const metadata: Metadata = {
  title: "Chime Fighters | Optimus vs Prime",
  description: "Battle it out in this epic pixel fighting game! Optimus Chime vs Prime Chime - who will emerge victorious? Best of 3 rounds, compete for the leaderboard!",
  keywords: ["fighting game", "pixel game", "browser game", "optimus chime", "prime chime", "arcade"],
  authors: [{ name: "byaxon" }],
  openGraph: {
    title: "Chime Fighters | Optimus vs Prime",
    description: "Epic pixel fighting game! Battle as Optimus Chime against Prime Chime AI. Best of 3 rounds - climb the leaderboard!",
    type: "website",
    images: [
      {
        url: GAME_IMAGE,
        width: 400,
        height: 400,
        alt: "Optimus Chime - Chime Fighters",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chime Fighters | Optimus vs Prime",
    description: "Epic pixel fighting game! Battle as Optimus Chime against Prime Chime AI.",
    images: [GAME_IMAGE],
  },
  icons: {
    icon: GAME_IMAGE,
    apple: GAME_IMAGE,
  },
  other: {
    "theme-color": "#1a1a2e",
  },
};

export default function OptimusChimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
