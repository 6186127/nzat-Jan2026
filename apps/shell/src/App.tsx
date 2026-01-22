import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppFrame } from "./layout/AppFrame";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { InvoicePage } from "./pages/InvoicePage";
import { NewJobPage } from "./pages/NewJobPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppFrame />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "jobs/:id", element: <JobDetailPage /> },
      { path: "invoice", element: <InvoicePage /> },
      {
        path: "/jobs/new",
        element: <NewJobPage />
      }
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
