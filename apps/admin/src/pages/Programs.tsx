import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { MyProgramSummary } from "@app-workout/shared";
import { ApiError, createProgram, fetchMyPrograms, fetchSports, type Sport } from "@/lib/api";

export default function Programs() {
  const [programs, setPrograms] = useState<MyProgramSummary[] | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sportId, setSportId] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMyPrograms()
      .then(setPrograms)
      .catch((err: Error) => setError(err.message));
    fetchSports().then(setSports);
  }, []);

  async function handleCreate() {
    if (!name.trim() || !startDate || !endDate || !sportId) {
      setError("Rellena nombre, fechas y deporte");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const program = await createProgram({
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        sportId,
      });
      navigate(`/programs/${program.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? JSON.stringify(err.body) : (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h2>Programas</h2>
      {error && <p className="error">{error}</p>}
      {!programs && !error && <p className="muted">Cargando...</p>}

      {programs?.map((p) => (
        <div className="card" key={p.id}>
          <Link to={`/programs/${p.id}`}>
            <strong>{p.name}</strong>
          </Link>{" "}
          <span className={`badge ${p.status}`}>{p.status}</span>
          <p className="muted">
            {p.sportName} · {p.dayCount} sesiones ·{" "}
            {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
          </p>
        </div>
      ))}

      <div className="card">
        <strong>Crear programa nuevo</strong>
        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="row">
          <div className="field">
            <label>Fecha de inicio</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha de fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Deporte</label>
          <select value={sportId} onChange={(e) => setSportId(e.target.value)}>
            <option value="">Elegir deporte...</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button className="primary" onClick={handleCreate} disabled={creating}>
          {creating ? "Creando..." : "Crear programa (borrador)"}
        </button>
        <p className="muted">
          El programa se crea como borrador, sin atleta asignado. Asignalo desde la pagina de
          Atletas cuando este listo.
        </p>
      </div>
    </div>
  );
}
