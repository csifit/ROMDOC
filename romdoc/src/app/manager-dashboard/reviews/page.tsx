import ReviewsManagement from "@/components/admin/reviews-management";

export default function ManagerReviewsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Management operațional
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Recenzii
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Moderează recenziile care conțin limbaj nepotrivit, spam,
          informații personale sau alte încălcări ale regulilor RomDoc.
        </p>
      </header>

      <ReviewsManagement />
    </div>
  );
}
