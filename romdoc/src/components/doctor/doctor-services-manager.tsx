"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type Currency =
  | "RON"
  | "EUR";

export type DoctorServiceItem = {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  sortOrder: number;
  isActive: boolean;
};

type DoctorServicesManagerProps = {
  initialServices:
    DoctorServiceItem[];
};

type ApiResponse = {
  success?: boolean;
  serviceId?: string;
  error?: string;
  partialSuccess?: boolean;
};

type EditableServiceRowProps = {
  service: DoctorServiceItem;
};

function EditableServiceRow({
  service,
}: EditableServiceRowProps) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [name, setName] =
    useState(service.name);

  const [price, setPrice] =
    useState(
      service.price.toString()
    );

  const [currency, setCurrency] =
    useState<Currency>(
      service.currency
    );

  const [sortOrder, setSortOrder] =
    useState(
      service.sortOrder.toString()
    );

  const [isActive, setIsActive] =
    useState(service.isActive);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/services",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              serviceId: service.id,
              name: name.trim(),
              price: Number(price),
              currency,
              sortOrder: Number(
                sortOrder
              ),
              isActive,
            }),
          }
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Serviciul nu a putut fi actualizat."
          );
        }

        setMessage("Salvat.");

        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Serviciul nu a putut fi actualizat."
        );
      }
    });
  }

  function handleDelete() {
    const confirmed =
      window.confirm(
        `Ștergi serviciul „${service.name}”?`
      );

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/doctor/services",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              serviceId: service.id,
            }),
          }
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Serviciul nu a putut fi șters."
          );
        }

        router.refresh();
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Serviciul nu a putut fi șters."
        );
      }
    });
  }

  return (
    <div className="border-t border-gray-200 px-4 py-4 first:border-t-0 sm:px-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_110px_90px_auto] lg:items-end">
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
            Serviciu
          </span>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            disabled={isPending}
            maxLength={200}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60 lg:mt-0"
          />
        </label>

        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
            Preț
          </span>

          <input
            type="number"
            min="0"
            max="100000"
            step="0.01"
            value={price}
            onChange={(event) =>
              setPrice(
                event.target.value
              )
            }
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60 lg:mt-0"
          />
        </label>

        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
            Monedă
          </span>

          <select
            value={currency}
            onChange={(event) =>
              setCurrency(
                event.target
                  .value as Currency
              )
            }
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60 lg:mt-0"
          >
            <option value="RON">
              RON
            </option>

            <option value="EUR">
              EUR
            </option>
          </select>
        </label>

        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
            Ordine
          </span>

          <input
            type="number"
            min="0"
            max="10000"
            step="1"
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(
                event.target.value
              )
            }
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60 lg:mt-0"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) =>
                setIsActive(
                  event.target.checked
                )
              }
              disabled={isPending}
              className="h-4 w-4"
            />

            Activ
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl bg-[#D97757] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Salvează
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Șterge
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-2 text-sm text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function DoctorServicesManager({
  initialServices,
}: DoctorServicesManagerProps) {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  const [name, setName] =
    useState("");

  const [price, setPrice] =
    useState("");

  const [currency, setCurrency] =
    useState<Currency>("RON");

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  function handleCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const nextSortOrder =
          initialServices.length > 0
            ? Math.max(
                ...initialServices.map(
                  (service) =>
                    service.sortOrder
                )
              ) + 1
            : 0;

        const response = await fetch(
          "/api/doctor/services",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              price: Number(price),
              currency,
              sortOrder:
                nextSortOrder,
            }),
          }
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Serviciul nu a putut fi adăugat."
          );
        }

        setName("");
        setPrice("");
        setCurrency("RON");

        setMessage(
          "Serviciul a fost adăugat."
        );

        router.refresh();
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Serviciul nu a putut fi adăugat."
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Servicii și prețuri
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Adaugă serviciile medicale afișate
          pe profilul public.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-6 grid gap-4 rounded-xl bg-[#F0EEE9] p-4 sm:grid-cols-[minmax(220px,1fr)_160px_120px_auto] sm:items-end"
        >
          <label>
            <span className="text-sm font-medium text-gray-700">
              Serviciu
            </span>

            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              disabled={isPending}
              placeholder="Consultație inițială"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">
              Preț
            </span>

            <input
              type="number"
              required
              min="0"
              max="100000"
              step="0.01"
              value={price}
              onChange={(event) =>
                setPrice(
                  event.target.value
                )
              }
              disabled={isPending}
              placeholder="250"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">
              Monedă
            </span>

            <select
              value={currency}
              onChange={(event) =>
                setCurrency(
                  event.target
                    .value as Currency
                )
              }
              disabled={isPending}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 disabled:opacity-60"
            >
              <option value="RON">
                RON
              </option>

              <option value="EUR">
                EUR
              </option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#D97757] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? "Se adaugă..."
              : "Adaugă serviciul"}
          </button>
        </form>

        {message && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
      </div>

      {initialServices.length > 0 ? (
        <>
          <div className="hidden grid-cols-[minmax(220px,1fr)_150px_110px_90px_auto] gap-3 border-y border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
            <span>Serviciu</span>
            <span>Preț</span>
            <span>Monedă</span>
            <span>Ordine</span>
            <span>Acțiuni</span>
          </div>

          <div>
            {initialServices.map(
              (service) => (
                <EditableServiceRow
                  key={service.id}
                  service={service}
                />
              )
            )}
          </div>
        </>
      ) : (
        <div className="border-t border-gray-200 p-6 text-sm text-gray-600">
          Nu ai adăugat încă servicii.
        </div>
      )}
    </section>
  );
}