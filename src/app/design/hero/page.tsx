import type { Metadata } from "next";

import { HeroLabC } from "@/features/home/hero-lab/hero-lab-c";
import { HeroLabD } from "@/features/home/hero-lab/hero-lab-d";
import { HeroLabStage } from "@/features/home/hero-lab/hero-lab-stage";

export const metadata: Metadata = {
  title: "Hero: чотири концепції",
  robots: { index: false },
};

const HeroLabPage = () => (
  <>
    <HeroLabStage letter="C" name="Креслення → фото">
      <HeroLabC />
    </HeroLabStage>
    <HeroLabStage letter="D" name="Креслення → фото → кадри" pausable>
      <HeroLabD />
    </HeroLabStage>
  </>
);

export default HeroLabPage;
