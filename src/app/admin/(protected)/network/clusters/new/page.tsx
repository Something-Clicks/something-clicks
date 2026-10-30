import { ClusterForm } from "@/components/admin/ClusterForm";
import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { dbConfigured } from "@/lib/db";
import { listJourneys } from "@/lib/network/admin";

export default async function NewClusterPage() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  return (
    <>
      <NetworkNav active="/admin/network" />
      <h1 className="text-3xl">New cluster</h1>
      <div className="mt-6 max-w-4xl">
        <ClusterForm journeys={await listJourneys()} />
      </div>
    </>
  );
}
