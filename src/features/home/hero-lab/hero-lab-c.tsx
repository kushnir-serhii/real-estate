import { HeroBackdrop } from "../hero-backdrop";
import { HeroLabContent } from "./hero-lab-content";

/** C (now the home hero): the drawing builds itself on midnight, a scan line develops the photo it traces, the drawing dims onto the edges. */
export const HeroLabC = () => (
  <>
    <HeroBackdrop />
    <HeroLabContent start={400} />
  </>
);
