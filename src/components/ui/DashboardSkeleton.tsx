"use client";

function PulseLine({ w = "full", h = "h-4" }: { w?: string; h?: string }) {
  return (
    <div
      className={`bg-surface animate-pulse rounded-md ${h} ${
        w === "full" ? "w-full" : `w-${w}`
      }`}
    />
  );
}

function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-3.5 w-24 bg-surface animate-pulse rounded-md" />
        <div className="w-4 h-4 bg-surface animate-pulse rounded-md" />
      </div>
      <div className="h-7 w-28 bg-surface animate-pulse rounded-md" />
      <div className="h-3 w-20 bg-surface animate-pulse rounded-md" />
    </div>
  );
}

function SkeletonContentCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 space-y-4 ${tall ? "min-h-52" : ""}`}>
      <div className="h-4 w-32 bg-surface animate-pulse rounded-md" />
      <div className="space-y-2.5">
        <PulseLine h="h-3" />
        <PulseLine w="3/4" h="h-3" />
        <PulseLine h="h-3" />
        <PulseLine w="5/6" h="h-3" />
        {tall && (
          <>
            <PulseLine h="h-3" />
            <PulseLine w="2/3" h="h-3" />
          </>
        )}
      </div>
    </div>
  );
}

/** Skeleton for the main content area only — sidebar stays mounted. */
export default function ContentSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between h-10 border-b border-border pb-4 mb-2">
        <div className="h-5 w-32 bg-surface animate-pulse rounded-md" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-48 bg-surface animate-pulse rounded-lg" />
          <div className="w-8 h-8 bg-surface animate-pulse rounded-lg" />
          <div className="w-8 h-8 bg-surface animate-pulse rounded-full" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Two-column cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkeletonContentCard tall />
        <SkeletonContentCard tall />
      </div>

      {/* Wide card */}
      <SkeletonContentCard />
    </div>
  );
}
