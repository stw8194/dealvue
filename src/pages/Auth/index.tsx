import { Route, Routes } from "react-router-dom";
import AuthIndexGuard from "@/components/route/AuthIndexGuard";
import GuestRoute from "@/components/route/GuestRoute";
import Register from "./Register";
import Login from "./Login";
import OAuthCallback from "./OAuthCallback";

export default function Auth() {
  return (
    <main className="pb-16">
      <Routes>
        <Route index element={<AuthIndexGuard />} />
        <Route path="callback" element={<OAuthCallback />} />
        <Route
          path="login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
      </Routes>
    </main>
  );
}
