import UsersManagement from "@/components/admin/users-management";

export default function ManagerUsersPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Management operațional
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Utilizatori
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Vezi conturile înregistrate și gestionează suspendarea sau
          reactivarea conturilor în limitele rolului de manager.
        </p>
      </header>

      <UsersManagement />
    </div>
  );
}
