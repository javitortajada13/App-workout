import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchExerciseList, type ExerciseListItem } from "@/lib/api";

export default function Exercises() {
  const [exercises, setExercises] = useState<ExerciseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchExerciseList()
      .then(setExercises)
      .catch((err: Error) => setError(err.message));
  }, []);

  const filtered = exercises?.filter((e) =>
    e.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Ejercicios</h2>
        <Link to="/exercises/new">
          <button className="primary">Crear ejercicio nuevo</button>
        </Link>
      </div>

      {error && <p className="error">{error}</p>}
      {!exercises && !error && <p className="muted">Cargando...</p>}

      {exercises && (
        <>
          <input
            placeholder="Buscar por nombre..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ marginBottom: 12, width: "100%" }}
          />
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Objetivo</th>
                <th>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((ex) => (
                <tr key={ex.id}>
                  <td>
                    <Link to={`/exercises/${ex.id}`}>{ex.name}</Link>
                  </td>
                  <td>{ex.objective}</td>
                  <td>{ex.evidenceRating ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered?.length === 0 && <p className="muted">Sin resultados.</p>}
        </>
      )}
    </div>
  );
}
