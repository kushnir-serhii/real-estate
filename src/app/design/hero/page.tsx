import type { Metadata } from "next";

import { HeroLabA, HeroLabABars } from "@/features/home/hero-lab/hero-lab-a";
import { HeroLabB } from "@/features/home/hero-lab/hero-lab-b";
import { HeroLabC } from "@/features/home/hero-lab/hero-lab-c";
import { HeroLabStage } from "@/features/home/hero-lab/hero-lab-stage";

export const metadata: Metadata = {
  title: "Hero: три концепції",
  robots: { index: false },
};

const HeroLabPage = () => (
  <>
    <HeroLabStage letter="A" name="Кіно-серія кадрів" footer={<HeroLabABars />}>
      <HeroLabA />
    </HeroLabStage>
    <HeroLabStage letter="B" name="Двері залу">
      <HeroLabB />
    </HeroLabStage>
    <HeroLabStage letter="C" name="Креслення → фото">
      <HeroLabC />
    </HeroLabStage>
  </>
);

export default HeroLabPage;
