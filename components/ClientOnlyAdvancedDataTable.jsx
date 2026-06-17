"use client";

import dynamic from "next/dynamic";

const AdvancedDataTableComponent = dynamic(
  () => import("@/components/AdvancedDataTableComponent"),
  { ssr: false }
);

export default function ClientOnlyAdvancedDataTable(props) {
  return <AdvancedDataTableComponent {...props} />;
}
