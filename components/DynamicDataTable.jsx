"use client";
import dynamic from "next/dynamic";

const DynamicDataTable = dynamic(
  () => import("@/components/DataTableComponent"),
  { ssr: false }
);

export default DynamicDataTable;