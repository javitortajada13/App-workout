import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

import { fetchMe, type Profile } from "./lib/api";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Athletes from "./pages/Athletes";
import Exercises from "./pages/Exercises";
import ExerciseEditor from "./pages/ExerciseEditor";
import Programs from "./pages/Programs";
import ProgramEditor from "./pages/ProgramEditor";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    fetchMe()
      .then(setProfile)
      .catch((err: Error) => setProfileError(err.message));
  }, [session]);

  if (session === undefined) return null;

  if (!session) return <Login />;

  if (profileError) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p className="error">No se pudo verificar la cuenta: {profileError}</p>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  if (profile.role !== "coach") {
    return (
      <div className="login-page">
        <div className="login-card">
          <p>Esta cuenta ({profile.email}) no tiene permisos de entrenador.</p>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="layout">
        <aside className="sidebar">
          <h1>App Workout</h1>
          <nav>
            <NavLink to="/athletes" className={({ isActive }) => (isActive ? "active" : "")}>
              Atletas
            </NavLink>
            <NavLink to="/programs" className={({ isActive }) => (isActive ? "active" : "")}>
              Programas
            </NavLink>
            <NavLink to="/exercises" className={({ isActive }) => (isActive ? "active" : "")}>
              Ejercicios
            </NavLink>
          </nav>
          <button onClick={() => supabase.auth.signOut()}>Cerrar sesion ({profile.email})</button>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/athletes" replace />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/:id" element={<ProgramEditor />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/exercises/new" element={<ExerciseEditor />} />
            <Route path="/exercises/:id" element={<ExerciseEditor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
