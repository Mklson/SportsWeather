export default function RouteLoading() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="md:hidden relative bg-gray-100 animate-pulse" style={{ height: "100dvh" }}>
        <div className="absolute inset-0 bg-gray-200" />
        {/* Bottom sheet stub */}
        <div className="absolute bottom-0 left-0 right-0 h-[270px] bg-white rounded-t-2xl shadow-lg px-4 pt-3 space-y-4">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-full mt-2" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-full mt-4" />
          <div className="h-3 bg-gray-100 rounded w-full" />
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:flex flex-row h-screen overflow-hidden bg-white animate-pulse">
        <div className="flex-1 bg-gray-200" />
        <aside className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col gap-4 p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-full mt-2" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-5/6" />
          <div className="h-3 bg-gray-100 rounded w-full mt-4" />
          <div className="h-3 bg-gray-100 rounded w-full" />
        </aside>
      </div>
    </>
  );
}
