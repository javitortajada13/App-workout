import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ApiError,
  createBlock,
  createBlockExercise,
  createSession,
  deleteBlock,
  deleteBlockExercise,
  deleteSession,
  fetchExerciseList,
  fetchProgram,
  type BlockAdmin,
  type ExerciseListItem,
  type ProgramAdmin,
  type SessionAdmin,
} from "@/lib/api";

const SESSION_ROLES = ["warmup", "main", "recovery"];
const BLOCK_TYPES = ["straight", "superset", "circuit", "contrast_pair"];
const PRESCRIPTION_TYPES = ["reps", "reps_per_side", "distance", "time"];

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string };
    if (typeof body === "object" && body?.error) return body.error;
  }
  return (err as Error).message ?? "Error desconocido";
}

export default function ProgramEditor() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<ProgramAdmin | null>(null);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!id) return;
    fetchProgram(id)
      .then(setProgram)
      .catch((err: Error) => setError(err.message));
  }

  useEffect(reload, [id]);
  useEffect(() => {
    fetchExerciseList().then(setExercises);
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!program) return <p className="muted">Cargando...</p>;

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>{program.name}</h2>
        <span className={`badge ${program.status}`}>{program.status}</span>
      </div>
      <p className="muted">
        {program.sportName} · {new Date(program.startDate).toLocaleDateString()} -{" "}
        {new Date(program.endDate).toLocaleDateString()}
      </p>

      {program.sessions
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((session) => (
          <SessionCard key={session.id} session={session} exercises={exercises} onChange={reload} />
        ))}

      <AddSessionForm programId={program.id} onAdded={reload} />
    </div>
  );
}

function AddSessionForm({ programId, onAdded }: { programId: string; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [order, setOrder] = useState(1);
  const [role, setRole] = useState("main");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createSession(programId, { label: label.trim(), order, role });
      setLabel("");
      onAdded();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <strong>Anadir sesion</strong>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <input placeholder="Etiqueta (ej. Dia 1)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          style={{ width: 70 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {SESSION_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button className="secondary" onClick={add} disabled={busy || !label.trim()}>
          Anadir
        </button>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  exercises,
  onChange,
}: {
  session: SessionAdmin;
  exercises: ExerciseListItem[];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(`Eliminar la sesion "${session.label}" y todo su contenido?`)) return;
    try {
      await deleteSession(session.id);
      onChange();
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>
          {session.order}. {session.label} <span className="muted">({session.role})</span>
        </strong>
        <button className="danger" onClick={remove}>
          Eliminar sesion
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="tree-level">
        {session.blocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block) => (
            <BlockCard key={block.id} block={block} exercises={exercises} onChange={onChange} />
          ))}
        <AddBlockForm sessionId={session.id} onAdded={onChange} />
      </div>
    </div>
  );
}

function AddBlockForm({ sessionId, onAdded }: { sessionId: string; onAdded: () => void }) {
  const [order, setOrder] = useState(1);
  const [blockType, setBlockType] = useState("straight");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    try {
      await createBlock(sessionId, { order, blockType, purpose: purpose || null });
      setPurpose("");
      onAdded();
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <span className="muted">Anadir bloque:</span>
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          style={{ width: 60 }}
        />
        <select value={blockType} onChange={(e) => setBlockType(e.target.value)}>
          {BLOCK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input placeholder="Proposito (opcional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        <button className="secondary" onClick={add}>
          Anadir
        </button>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  exercises,
  onChange,
}: {
  block: BlockAdmin;
  exercises: ExerciseListItem[];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm("Eliminar este bloque y sus ejercicios?")) return;
    try {
      await deleteBlock(block.id);
      onChange();
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="card" style={{ background: "#fafafa" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span>
          Bloque {block.order} ({block.blockType}){block.purpose ? ` — ${block.purpose}` : ""}
        </span>
        <button className="danger" onClick={remove}>
          Eliminar bloque
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Ejercicio</th>
            <th>Prescripcion</th>
            <th>Series</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {block.exercises
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((be) => (
              <tr key={be.id}>
                <td>{be.order}</td>
                <td>{be.exercise.name}</td>
                <td>
                  {be.repsOrDuration} ({be.prescriptionType})
                </td>
                <td>{be.sets ?? "-"}</td>
                <td>
                  <button
                    className="danger"
                    onClick={async () => {
                      try {
                        await deleteBlockExercise(be.id);
                        onChange();
                      } catch (err) {
                        setError(describeError(err));
                      }
                    }}
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <AddBlockExerciseForm blockId={block.id} exercises={exercises} onAdded={onChange} />
    </div>
  );
}

function AddBlockExerciseForm({
  blockId,
  exercises,
  onAdded,
}: {
  blockId: string;
  exercises: ExerciseListItem[];
  onAdded: () => void;
}) {
  const [order, setOrder] = useState(1);
  const [exerciseId, setExerciseId] = useState("");
  const [prescriptionType, setPrescriptionType] = useState("reps");
  const [repsOrDuration, setRepsOrDuration] = useState("");
  const [sets, setSets] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!exerciseId || !repsOrDuration.trim()) {
      setError("Elige un ejercicio y rellena la prescripcion");
      return;
    }
    setError(null);
    try {
      await createBlockExercise(blockId, {
        order,
        exerciseId,
        prescriptionType,
        repsOrDuration: repsOrDuration.trim(),
        sets: sets ? Number(sets) : null,
      });
      setRepsOrDuration("");
      setSets("");
      onAdded();
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          style={{ width: 50 }}
        />
        <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
          <option value="">Elegir ejercicio...</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
        <select value={prescriptionType} onChange={(e) => setPrescriptionType(e.target.value)}>
          {PRESCRIPTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          placeholder="ej. 10, 30s"
          value={repsOrDuration}
          onChange={(e) => setRepsOrDuration(e.target.value)}
          style={{ width: 90 }}
        />
        <input
          placeholder="series"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          style={{ width: 60 }}
        />
        <button className="secondary" onClick={add}>
          Anadir
        </button>
      </div>
    </div>
  );
}
