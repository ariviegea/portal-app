import { Suspense } from "react";
import { connection } from "next/server";
import { getPortalData } from "@/controllers/portalController";
import { PortalLayout } from "@/views/portal/PortalLayout";
import { PortalLoading, PortalView } from "@/views/portal/PortalView";

// Route wiring only: the controller loads the data, the view renders it.
async function PortalResults() {
  // The APIs are called for each visit, never while the page shell is prebuilt.
  await connection();
  const results = await getPortalData();
  return <PortalView results={results} />;
}

export default function PortalPage() {
  return (
    <PortalLayout>
      <Suspense fallback={<PortalLoading />}>
        <PortalResults />
        <h1>Welcome</h1>
      </Suspense>
    </PortalLayout>
  );
}
