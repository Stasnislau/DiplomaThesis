/**
 * Test render helper that wraps the UI in the providers most pages
 * assume exist (Router for `useNavigate`/`Link`, QueryClientProvider
 * for any TanStack Query hooks). i18n is initialised globally in
 * `setupTests.ts`, so it doesn't need a per-render wrapper.
 *
 * Use this instead of `render` for any component that pulls in
 * `react-router-dom` or `@tanstack/react-query`.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

interface ProvidersProps {
  initialEntries?: string[];
  children: React.ReactNode;
}

function makeQueryClient() {
  // Tests should never retry on failure — they need to assert the
  // error path on the first call.
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ initialEntries, children }: ProvidersProps) {
  const client = makeQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries ?? ["/"]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialEntries?: string[] },
) {
  const { initialEntries, ...rest } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
    ),
    ...rest,
  });
}
