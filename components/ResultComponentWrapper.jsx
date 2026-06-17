"use client";

import dynamic from "next/dynamic";

const ResultComponent = dynamic(() => import("@/components/ResultComponent"), {
  ssr: false,
});

export default function ResultComponentWrapper(props) {
  return <ResultComponent {...props} />;
}
