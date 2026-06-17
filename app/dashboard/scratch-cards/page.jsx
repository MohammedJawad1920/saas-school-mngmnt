import ScratchCards from "@/components/ScratchCards";
import Header from "@/components/Header";

export default function ScratchPage() {
  return (
    <>
      <Header
        title="SCRATCH CARDS"
        subTitle="Generate and scratch cards to reveal hidden letters"
      />
      <ScratchCards />
    </>
  );
}
