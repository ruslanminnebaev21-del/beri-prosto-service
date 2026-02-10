
// app/(app)/unit/page.tsx
import { Suspense } from "react";
import UnitClient from "./UnitClient";

export default function UnitPage() {
  return (
    <Suspense fallback={null}>
      <UnitClient />
    </Suspense>
  );
}
