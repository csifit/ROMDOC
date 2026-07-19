export default function DoctorsDirectoryLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Se încarcă directorul medicilor"
      className="min-h-screen bg-[#F0EEE9]"
    >
      <section className="px-[21px] py-[34px] sm:px-[34px] sm:py-[55px]">
        <div className="mx-auto max-w-7xl">
          <div className="h-[13px] w-[144px] animate-pulse rounded-full bg-gray-300" />
          <div className="mt-[13px] h-[55px] max-w-3xl animate-pulse rounded-[13px] bg-gray-300" />
          <div className="mt-[13px] h-[21px] max-w-2xl animate-pulse rounded-full bg-gray-300" />
        </div>
      </section>

      <section className="px-[21px] pb-[55px] sm:px-[34px]">
        <div className="mx-auto max-w-7xl">
          <div className="romdoc-card p-[21px] sm:p-[34px]">
            <div className="h-[34px] w-[233px] animate-pulse rounded-[13px] bg-gray-200" />

            <div className="mt-[21px] grid gap-[13px] md:grid-cols-2">
              <div className="h-[55px] animate-pulse rounded-[13px] bg-gray-200" />
              <div className="h-[55px] animate-pulse rounded-[13px] bg-gray-200" />
            </div>

            <div className="mt-[13px] h-[55px] animate-pulse rounded-[13px] bg-gray-200" />
          </div>

          <div className="mt-[34px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-3">
            {Array.from({
              length: 6,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="romdoc-card min-h-[377px] animate-pulse p-[21px]"
                >
                  <div className="flex gap-[13px]">
                    <div className="h-[55px] w-[55px] rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-[13px] w-[89px] rounded-full bg-gray-200" />
                      <div className="mt-[8px] h-[21px] w-[144px] rounded-full bg-gray-200" />
                    </div>
                  </div>

                  <div className="mt-[21px] h-[144px] rounded-[13px] bg-gray-200" />
                  <div className="mt-[21px] h-[55px] rounded-[13px] bg-gray-200" />
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
