import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchExerciseList, type ExerciseListItem } from "@/lib/api";
import { youtubeThumbnailUrl } from "@/lib/video";

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
                <th>Video</th>
                <th>Nombre</th>
                <th>Objetivo</th>
                <th>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((ex) => {
                const thumbnail = ex.thumbnailUrl ?? (ex.videoUrl ? youtubeThumbnailUrl(ex.videoUrl) : null);
                return (
                  <tr key={ex.id}>
                    <td>
                      {ex.videoUrl && thumbnail ? (
                        <a href={ex.videoUrl} target="_blank" rel="noreferrer">
                          <img
                            src={thumbnail}
                            alt=""
                            style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 4, display: "block" }}
                          />
                        </a>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/exercises/${ex.id}`}>{ex.name}</Link>
                    </td>
                    <td>{ex.objective}</td>
                    <td>{ex.evidenceRating ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered?.length === 0 && <p className="muted">Sin resultados.</p>}
        </>
      )}
    </div>
  );
}
