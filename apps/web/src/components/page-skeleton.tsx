import { Skeleton } from "@/components/ui/skeleton"

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2 border-b px-4 py-5 md:px-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  )
}
