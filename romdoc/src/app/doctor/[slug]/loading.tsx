export default function DoctorProfileLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Se încarcă profilul medicului"
      className="min-h-screen bg-[#F0EEE9] px-[21px] py-[34px] sm:px-[34px] sm:py-[55px]"
    >
      <div className="mx-auto max-w-7xl">
        <div className="romdoc-card p-[21px] sm:p-[34px]">
          <div className="flex flex-col gap-[21px] sm:flex-row">
            <div className="h-[144px] w-[144px] shrink-0 animate-pulse rounded-[21px] bg-gray-200" />

            <div className="flex-1">
              <div className="h-[13px] w-[144px] animate-pulse rounded-full bg-gray-200" />
              <div className="mt-[13px] h-[34px] max-w-md animate-pulse rounded-[13px] bg-gray-200" />
              <div className="mt-[13px] h-[21px] max-w-sm animate-pulse rounded-full bg-gray-200" />
              <div className="mt-[21px] h-[55px] max-w-lg animate-pulse rounded-[13px] bg-gray-200" />
            </div>
          </div>
        </div>

        <div className="mt-[21px] grid gap-[21px] lg:grid-cols-[1.618fr_1fr]">
          <div className="space-y-[21px]">
            {Array.from({
              length: 3,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="romdoc-card min-h-[233px] animate-pulse p-[21px]"
                >
                  <div className="h-[21px] w-[144px] rounded-full bg-gray-200" />
                  <div className="mt-[21px] h-[144px] rounded-[13px] bg-gray-200" />
                </div>
              )
            )}
          </div>

          <div className="romdoc-card min-h-[377px] animate-pulse p-[21px]">
            <div className="h-[21px] w-[144px] rounded-full bg-gray-200" />
            <div className="mt-[21px] h-[233px] rounded-[13px] bg-gray-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
