import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ApiError,
  createExercise,
  createExerciseLink,
  createSportTransfer,
  deleteExercise,
  deleteExerciseLink,
  deleteSportTransfer,
  fetchEquipment,
  fetchExercise,
  fetchExerciseList,
  fetchMuscles,
  fetchPhysicalQualities,
  fetchSports,
  removeExerciseEquipment,
  removeExerciseMuscle,
  removeExerciseQuality,
  setExerciseEquipment,
  setExerciseMuscle,
  setExerciseQuality,
  updateExercise,
  type Equipment,
  type ExerciseDetailAdmin,
  type ExerciseListItem,
  type ExerciseWriteBody,
  type Muscle,
  type PhysicalQuality,
  type Sport,
} from "@/lib/api";

const EVIDENCE_RATINGS = ["strong", "moderate", "limited", "conflicting", "insufficient"];
const EMPHASIS_OPTIONS = ["primary", "secondary"];
const LINK_TYPES = ["progression", "regression", "variation", "alternative"];

const emptyForm: ExerciseWriteBody = {
  name: "",
  objective: "",
  aliases: [],
  description: "",
  movementComplexity: "",
  contraindications: "",
  coachingCues: "",
  evidenceRating: "",
  videoUrl: "",
  thumbnailUrl: "",
};

export default function ExerciseEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<ExerciseDetailAdmin | null>(null);
  const [form, setForm] = useState<ExerciseWriteBody>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm(emptyForm);
      setExercise(null);
      return;
    }
    fetchExercise(id!)
      .then((ex) => {
        setExercise(ex);
        setForm({
          name: ex.name,
          objective: ex.objective,
          aliases: [],
          description: ex.description ?? "",
          movementComplexity: ex.movementComplexity ?? "",
          contraindications: ex.contraindications ?? "",
          coachingCues: ex.coachingCues ?? "",
          evidenceRating: ex.evidenceRating ?? "",
          videoUrl: ex.videoUrl ?? "",
          thumbnailUrl: ex.thumbnailUrl ?? "",
        });
      })
      .catch((err: Error) => setError(err.message));
  }, [id, isNew]);

  function setField<K extends keyof ExerciseWriteBody>(key: K, value: ExerciseWriteBody[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.objective.trim()) {
      setError("Nombre y objetivo son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);
    const body: ExerciseWriteBody = {
      ...form,
      evidenceRating: form.evidenceRating || null,
      description: form.description || null,
      movementComplexity: form.movementComplexity || null,
      contraindications: form.contraindications || null,
      coachingCues: form.coachingCues || null,
      videoUrl: form.videoUrl || null,
      thumbnailUrl: form.thumbnailUrl || null,
    };
    try {
      if (isNew) {
        const created = await createExercise(body);
        navigate(`/exercises/${created.id}`, { replace: true });
      } else {
        await updateExercise(id!, body);
        const refreshed = await fetchExercise(id!);
        setExercise(refreshed);
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm("Eliminar este ejercicio? Esta accion no se puede deshacer.")) return;
    try {
      await deleteExercise(id);
      navigate("/exercises");
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div>
      <h2>{isNew ? "Nuevo ejercicio" : exercise?.name ?? "Ejercicio"}</h2>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="field">
          <label>Nombre</label>
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </div>
        <div className="field">
          <label>Objetivo</label>
          <input value={form.objective} onChange={(e) => setField("objective", e.target.value)} />
        </div>
        <div className="field">
          <label>Descripcion</label>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setField("description", e.target.value)}
            rows={2}
          />
        </div>
        <div className="field">
          <label>Complejidad de movimiento</label>
          <input
            value={form.movementComplexity ?? ""}
            onChange={(e) => setField("movementComplexity", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Contraindicaciones</label>
          <textarea
            value={form.contraindications ?? ""}
            onChange={(e) => setField("contraindications", e.target.value)}
            rows={2}
          />
        </div>
        <div className="field">
          <label>Indicaciones para el coach</label>
          <textarea
            value={form.coachingCues ?? ""}
            onChange={(e) => setField("coachingCues", e.target.value)}
            rows={2}
          />
        </div>
        <div className="field">
          <label>Calidad de evidencia</label>
          <select
            value={form.evidenceRating ?? ""}
            onChange={(e) => setField("evidenceRating", e.target.value)}
          >
            <option value="">(sin especificar)</option>
            {EVIDENCE_RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>URL de video</label>
          <input value={form.videoUrl ?? ""} onChange={(e) => setField("videoUrl", e.target.value)} />
        </div>

        <div className="row">
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : isNew ? "Crear ejercicio" : "Guardar cambios"}
          </button>
          {!isNew && (
            <button className="danger" onClick={handleDelete}>
              Eliminar
            </button>
          )}
        </div>
      </div>

      {!isNew && exercise && (
        <>
          <QualitiesSection exerciseId={exercise.id} exercise={exercise} onChange={setExercise} />
          <MusclesSection exerciseId={exercise.id} exercise={exercise} onChange={setExercise} />
          <EquipmentSection exerciseId={exercise.id} exercise={exercise} onChange={setExercise} />
          <LinksSection exerciseId={exercise.id} exercise={exercise} onChange={setExercise} />
          <SportTransfersSection exerciseId={exercise.id} exercise={exercise} onChange={setExercise} />
        </>
      )}
    </div>
  );
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | string;
    if (typeof body === "object" && body?.error) return body.error;
  }
  return (err as Error).message ?? "Error desconocido";
}

async function reload(exerciseId: string, onChange: (ex: ExerciseDetailAdmin) => void) {
  onChange(await fetchExercise(exerciseId));
}

// --- Physical qualities ---
function QualitiesSection({
  exerciseId,
  exercise,
  onChange,
}: {
  exerciseId: string;
  exercise: ExerciseDetailAdmin;
  onChange: (ex: ExerciseDetailAdmin) => void;
}) {
  const [options, setOptions] = useState<PhysicalQuality[]>([]);
  const [selected, setSelected] = useState("");
  const [emphasis, setEmphasis] = useState("primary");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPhysicalQualities().then(setOptions);
  }, []);

  async function add() {
    if (!selected) return;
    try {
      await setExerciseQuality(exerciseId, selected, emphasis);
      await reload(exerciseId, onChange);
      setSelected("");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function remove(qualityId: string) {
    await removeExerciseQuality(exerciseId, qualityId);
    await reload(exerciseId, onChange);
  }

  return (
    <div className="card">
      <strong>Cualidades fisicas</strong>
      {error && <p className="error">{error}</p>}
      <div className="pill-list">
        {exercise.physicalQualities.map((q) => (
          <span className="pill" key={q.id}>
            {q.name} ({q.emphasis})
            <button onClick={() => remove(q.id)}>x</button>
          </span>
        ))}
      </div>
      <div className="row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Anadir cualidad...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={emphasis} onChange={(e) => setEmphasis(e.target.value)}>
          {EMPHASIS_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button className="secondary" onClick={add} disabled={!selected}>
          Anadir
        </button>
      </div>
    </div>
  );
}

// --- Muscles ---
function MusclesSection({
  exerciseId,
  exercise,
  onChange,
}: {
  exerciseId: string;
  exercise: ExerciseDetailAdmin;
  onChange: (ex: ExerciseDetailAdmin) => void;
}) {
  const [options, setOptions] = useState<Muscle[]>([]);
  const [selected, setSelected] = useState("");
  const [emphasis, setEmphasis] = useState("primary");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMuscles().then(setOptions);
  }, []);

  async function add() {
    if (!selected) return;
    try {
      await setExerciseMuscle(exerciseId, selected, emphasis);
      await reload(exerciseId, onChange);
      setSelected("");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function remove(muscleId: string) {
    await removeExerciseMuscle(exerciseId, muscleId);
    await reload(exerciseId, onChange);
  }

  return (
    <div className="card">
      <strong>Musculos</strong>
      {error && <p className="error">{error}</p>}
      <div className="pill-list">
        {exercise.muscles.map((m) => (
          <span className="pill" key={m.id}>
            {m.name} ({m.emphasis})
            <button onClick={() => remove(m.id)}>x</button>
          </span>
        ))}
      </div>
      <div className="row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Anadir musculo...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={emphasis} onChange={(e) => setEmphasis(e.target.value)}>
          {EMPHASIS_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button className="secondary" onClick={add} disabled={!selected}>
          Anadir
        </button>
      </div>
    </div>
  );
}

// --- Equipment ---
function EquipmentSection({
  exerciseId,
  exercise,
  onChange,
}: {
  exerciseId: string;
  exercise: ExerciseDetailAdmin;
  onChange: (ex: ExerciseDetailAdmin) => void;
}) {
  const [options, setOptions] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState("");
  const [required, setRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEquipment().then(setOptions);
  }, []);

  async function add() {
    if (!selected) return;
    try {
      await setExerciseEquipment(exerciseId, selected, required);
      await reload(exerciseId, onChange);
      setSelected("");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function remove(equipmentId: string) {
    await removeExerciseEquipment(exerciseId, equipmentId);
    await reload(exerciseId, onChange);
  }

  return (
    <div className="card">
      <strong>Equipamiento</strong>
      {error && <p className="error">{error}</p>}
      <div className="pill-list">
        {exercise.equipment.map((eq) => (
          <span className="pill" key={eq.id}>
            {eq.name} ({eq.required ? "obligatorio" : "opcional"})
            <button onClick={() => remove(eq.id)}>x</button>
          </span>
        ))}
      </div>
      <div className="row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Anadir equipamiento...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <label className="row" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Obligatorio
        </label>
        <button className="secondary" onClick={add} disabled={!selected}>
          Anadir
        </button>
      </div>
    </div>
  );
}

// --- Links (progression/regression/variation/alternative) ---
function LinksSection({
  exerciseId,
  exercise,
  onChange,
}: {
  exerciseId: string;
  exercise: ExerciseDetailAdmin;
  onChange: (ex: ExerciseDetailAdmin) => void;
}) {
  const [options, setOptions] = useState<ExerciseListItem[]>([]);
  const [selected, setSelected] = useState("");
  const [type, setType] = useState(LINK_TYPES[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExerciseList().then((list) => setOptions(list.filter((e) => e.id !== exerciseId)));
  }, [exerciseId]);

  async function add() {
    if (!selected) return;
    try {
      await createExerciseLink(exerciseId, selected, type);
      await reload(exerciseId, onChange);
      setSelected("");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function remove(linkId: string) {
    try {
      await deleteExerciseLink(linkId);
      await reload(exerciseId, onChange);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="card">
      <strong>Progresiones / regresiones / variaciones / alternativas</strong>
      {error && <p className="error">{error}</p>}
      <div className="pill-list">
        {exercise.links.map((l) => (
          <span className="pill" key={l.id}>
            {l.relationshipType}: {l.exercise.name}
            <button onClick={() => remove(l.id)}>x</button>
          </span>
        ))}
      </div>
      <div className="row">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Elegir ejercicio...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {LINK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="secondary" onClick={add} disabled={!selected}>
          Anadir
        </button>
      </div>
    </div>
  );
}

// --- Sport transfers ---
function SportTransfersSection({
  exerciseId,
  exercise,
  onChange,
}: {
  exerciseId: string;
  exercise: ExerciseDetailAdmin;
  onChange: (ex: ExerciseDetailAdmin) => void;
}) {
  const [options, setOptions] = useState<Sport[]>([]);
  const [sportId, setSportId] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceRating, setEvidenceRating] = useState(EVIDENCE_RATINGS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSports().then(setOptions);
  }, []);

  async function add() {
    if (!sportId || !description.trim()) return;
    try {
      await createSportTransfer(exerciseId, sportId, description.trim(), evidenceRating);
      await reload(exerciseId, onChange);
      setDescription("");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function remove(transferId: string) {
    try {
      await deleteSportTransfer(transferId);
      await reload(exerciseId, onChange);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="card">
      <strong>Transferencia al deporte</strong>
      {error && <p className="error">{error}</p>}
      <ul>
        {exercise.sportTransfers.map((t) => (
          <li key={t.id}>
            <strong>{t.sportName}</strong> ({t.evidenceRating}): {t.description}{" "}
            <button className="danger" onClick={() => remove(t.id)} style={{ marginLeft: 6 }}>
              Eliminar
            </button>
          </li>
        ))}
      </ul>
      <div className="field">
        <label>Deporte</label>
        <select value={sportId} onChange={(e) => setSportId(e.target.value)}>
          <option value="">Elegir deporte...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Descripcion de la transferencia</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="field">
        <label>Calidad de evidencia</label>
        <select value={evidenceRating} onChange={(e) => setEvidenceRating(e.target.value)}>
          {EVIDENCE_RATINGS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <button className="secondary" onClick={add} disabled={!sportId || !description.trim()}>
        Anadir
      </button>
    </div>
  );
}
