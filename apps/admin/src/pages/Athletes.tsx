import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AthleteSummary, MyProgramSummary } from "@app-workout/shared";
import { assignProgram, fetchAthletes, fetchMyPrograms, updateAthlete } from "@/lib/api";

export default function Athletes() {
  const [athletes, setAthletes] = useState<AthleteSummary[] | null>(null);
  const [programs, setPrograms] = useState<MyProgramSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  function reload() {
    Promise.all([fetchAthletes(), fetchMyPrograms()])
      .then(([a, p]) => {
        setAthletes(a);
        setPrograms(p);
      })
      .catch((err: Error) => setError(err.message));
  }

  useEffect(reload, []);

  async function handleAssign(athleteId: string) {
    const programId = assigning[athleteId];
    if (!programId) return;
    setBusyId(athleteId);
    setError(null);
    try {
      await assignProgram(athleteId, programId);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2>Atletas</h2>
      {error && <p className="error">{error}</p>}
      {!athletes && !error && <p className="muted">Cargando...</p>}
      {athletes && athletes.length === 0 && (
        <p className="muted">
          Todavia no hay ningun atleta. Se crean iniciando sesion por primera vez con la cuenta
          que le hayas dado en Supabase.
        </p>
      )}

      {athletes?.map((athlete) => (
        <div className="card" key={athlete.id}>
          <strong>{athlete.name ?? athlete.email}</strong>
          <p className="muted">{athlete.email}</p>
          <p>
            Programa activo:{" "}
            {athlete.activeProgram ? (
              <Link to={`/programs/${athlete.activeProgram.id}`}>{athlete.activeProgram.name}</Link>
            ) : (
              <span className="muted">ninguno</span>
            )}
          </p>
          <div className="row">
            <select
              value={assigning[athlete.id] ?? ""}
              onChange={(e) => setAssigning((prev) => ({ ...prev, [athlete.id]: e.target.value }))}
            >
              <option value="">Elegir programa para asignar...</option>
              {programs?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
            <button
              className="secondary"
              disabled={!assigning[athlete.id] || busyId === athlete.id}
              onClick={() => handleAssign(athlete.id)}
            >
              Asignar
            </button>
          </div>

          <CoachNotes athlete={athlete} onSaved={reload} />
        </div>
      ))}
    </div>
  );
}

function CoachNotes({ athlete, onSaved }: { athlete: AthleteSummary; onSaved: () => void }) {
  const [notes, setNotes] = useState(athlete.coachNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = notes !== (athlete.coachNotes ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateAthlete(athlete.id, { coachNotes: notes || null });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div className="field">
        <label>
          Notas del entrenador (historial medico, deporte(s), test funcional, progresion --
          solo tu la ves, el atleta no)
        </label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="secondary" onClick={save} disabled={saving || !dirty}>
        {saving ? "Guardando..." : "Guardar notas"}
      </button>
    </div>
  );
}
