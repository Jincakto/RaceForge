import { type AppUser, type Horse, type RaceHistoryEntry } from "../../../shared/data/data";
import { type AppState, type Page } from "../../../app/appTypes";
import { useState, useEffect } from "react";
import { type RaceImportRow, parseRaceRows, readRows } from "../raceImport";
import { toISO, toDDMMYYYY, numOf } from "./HorseCarePages";
import { TODAY } from "../../../shared/data/today";
import { Btn, Card, Input, Select } from "../../../shared/ui/ui";
import { IdentityBadge } from "../intake";

export function HorseCreatePage({
  user,
  state,
  navigate,
  onCreateHorse,
}: {
  user: AppUser;
  state: AppState;
  navigate: (p: Page) => void;
  onCreateHorse: (h: Horse) => Promise<unknown>;
}) {
  const [form, setForm] = useState({
    name: "",
    microchip: "",
    breed: "Thoroughbred",
    birthDate: "",
    color: "",
    gender: "Stallion",
    height: "",
    evidenceUrl: "",
    evidenceFileUrl: "",
    evidenceNote: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  useEffect(() => {
    if (!imageFile) { setImagePreview(""); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const [raceHistory, setRaceHistory] = useState<RaceHistoryEntry[]>([]);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [imp, setImp] = useState<RaceImportRow[] | null>(null);
  const [impErr, setImpErr] = useState("");
  const onPickFile = async (f?: File) => {
    if (!f) return;
    setImpErr("");
    setImp(null);
    try {
      setImp(
        parseRaceRows(await readRows(f), {
          birthIso: form.birthDate || undefined,
          todayIso: toISO(TODAY),
        }),
      );
    } catch (err) {
      setImpErr((err as Error).message);
    }
  };
  const confirmImport = () => {
    const items = (imp || []).flatMap((r) => (r.entry ? [r.entry] : []));
    setRaceHistory((h) => [...items, ...h]);
    setImp(null);
  };
  const [newRace, setNewRace] = useState({
    date: "",
    raceName: "",
    distance: "1200m",
    position: "1",
    totalHorses: "10",
    time: "",
    venue: "",
    jockey: "",
    prize: "",
  });
  const [raceErr, setRaceErr] = useState<Record<string, string>>({});
  const [editRid, setEditRid] = useState<string | null>(null);
  const openRace = (r: RaceHistoryEntry) => {
    const [d, m, y] = r.date.split("/");
    setNewRace({
      date: y ? `${y}-${m}-${d}` : "",
      raceName: r.raceName,
      distance: r.distance,
      position: String(r.position),
      totalHorses: String(r.totalHorses || 10),
      time: r.time,
      venue: r.venue,
      jockey: r.jockey,
      prize: r.prize,
    });
    setRaceErr({});
    setEditRid(r.id);
    setShowRaceForm(true);
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const todayIso = toISO(TODAY);
  const previewId = "Server-assigned ID";
  const set = (k: string) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const addRace = () => {
    const e: Record<string, string> = {};
    if (!newRace.raceName.trim()) e.raceName = "Enter a race name.";
    if (!newRace.date) e.date = "Select a race date.";
    else if (newRace.date > todayIso)
      e.date = "Race date cannot be in the future.";
    setRaceErr(e);
    if (Object.keys(e).length) return;
    const item: RaceHistoryEntry = {
      id: editRid || `rh${Date.now()}`,
      ...newRace,
      date: toDDMMYYYY(newRace.date),
      position: Number(newRace.position),
      totalHorses: Number(newRace.totalHorses),
    };
    setRaceHistory((r) =>
      editRid ? r.map((x) => (x.id === editRid ? item : x)) : [...r, item],
    );
    setEditRid(null);
    setNewRace({
      date: "",
      raceName: "",
      distance: "1200m",
      position: "1",
      totalHorses: "10",
      time: "",
      venue: "",
      jockey: "",
      prize: "",
    });
    setShowRaceForm(false);
  };

  const handle = async () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    if (!name) e.name = "Enter a horse name.";
    else if (name.length < 2 || name.length > 40)
      e.name = "Horse name must contain 2–40 characters.";
    if (!form.microchip) e.microchip = "Enter the horse identification number.";
    else if (!/^[0-9]{3}[a-zA-Z0-9]{12}$/.test(form.microchip))
      e.microchip =
        "UELN must contain 15 characters: 3 country digits and 12 letters or digits.";
    else if (state.horses.some((x) => x.microchip === form.microchip))
      e.microchip = "This identification number is already registered.";
    if (!imageFile) e.evidenceUrl = "Choose an evidence image (JPG, PNG or WebP, up to 5 MB).";
    else if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type))
      e.evidenceUrl = "The image must be JPG, PNG or WebP.";
    else if (imageFile.size > 5 * 1024 * 1024) e.evidenceUrl = "The image cannot exceed 5 MB.";
    if (!documentFile) e.evidenceFileUrl = "Choose an evidence document (PDF or TXT, up to 10 MB).";
    else if (!["application/pdf", "text/plain"].includes(documentFile.type))
      e.evidenceFileUrl = "The document must be a PDF or TXT file.";
    else if (documentFile.size > 10 * 1024 * 1024) e.evidenceFileUrl = "The document cannot exceed 10 MB.";
    if (form.evidenceNote.length > 300)
      e.evidenceNote = "Notes cannot exceed 300 characters.";
    if (!form.birthDate) e.birthDate = "Select a date of birth.";
    else if (form.birthDate >= todayIso)
      e.birthDate = "Date of birth cannot be in the future.";
    else if (form.birthDate < "1996-01-01")
      e.birthDate =
        "Date of birth is outside the supported range (before 1996).";
    if (!form.color.trim()) e.color = "Enter a coat color.";
    else if (form.color.length > 30) e.color = "Maximum 30 characters.";
    const h = numOf(form.height);
    if (isNaN(h)) e.height = "Enter a numeric height.";
    else if (h < 100 || h > 200)
      e.height = "Height must be between 100 and 200 cm.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = previewId;
    const age = Math.max(
      0,
      Math.floor(
        (new Date(todayIso).getTime() - new Date(form.birthDate).getTime()) /
          31557600000,
      ),
    );
    try {
      await onCreateHorse({
        id,
        name,
        breed: form.breed,
        age,
        birthDate: toDDMMYYYY(form.birthDate),
        microchip: form.microchip || undefined,
        color: form.color.trim(),
        gender: form.gender,
        weight: 0,
        height: h,
        stable: "",
        stall: "",
        clubId: null,
        ownerId: user.id,
        ownerName: user.name,
        headTrainerId: "",
        headTrainerName: "",
        vetId: "",
        vetName: "",
        groomId: "",
        groomName: "",
        healthStatus: "Pending Vet",
        trainingStatus: "Pending Approval",
        approvalStatus: "pending",
        registrationDate: TODAY,
        approvedAt: null,
        totalRaces: raceHistory.length,
        wins: raceHistory.filter((r) => r.position === 1).length,
        vetClearance: false,
        biography: "",
        imageUrl: "",
        achievements: [],
        raceHistory,
        lifecycle: "pending",
        identityVerified: false,
        identityEvidence: {
          url: "",
          fileUrl: "",
          note: form.evidenceNote.trim(),
          imageFile: imageFile!,
          documentFile: documentFile!,
        },
        medicalHistory: "",
      });
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate("my-horses")}
          className="hover:text-[#c9973b]"
        >
          My horses
        </button>
        <span>/</span>
        <span className="font-medium text-[#0f1729]">Register a new horse</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#0f1729]">
            Register horse profile
          </h2>
          <p className="text-sm text-gray-500">
            The profile is created immediately and sent to the club for
            veterinarian assignment.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => navigate("my-horses")}>
            Cancel
          </Btn>
          <Btn variant="gold" onClick={handle}>
            Submit registration →
          </Btn>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#0f1729]">Horse identification</h3>
          <IdentityBadge verified={false} />
        </div>
        <p className="text-xs text-gray-500">
          UELN contains 15 characters (3 country digits and 12 letters or
          digits) and must be unique. The manager checks it against the
          supporting evidence during admission.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="UELN"
            value={form.microchip}
            onChange={(v) =>
              set("microchip")(v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15))
            }
            placeholder="3 country digits + 12 letters/digits"
            required
            hint={`${form.microchip.length}/15 characters entered`}
            error={errors.microchip}
          />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Evidence image <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(ev) => setImageFile(ev.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#c9973b] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            <p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP, up to 5 MB.</p>
            {errors.evidenceUrl && <p className="mt-1 text-xs text-red-600">{errors.evidenceUrl}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Evidence document <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="application/pdf,text/plain"
              onChange={(ev) => setDocumentFile(ev.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#c9973b] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
            <p className="mt-1 text-xs text-gray-500">PDF or TXT, up to 10 MB.</p>
            {errors.evidenceFileUrl && <p className="mt-1 text-xs text-red-600">{errors.evidenceFileUrl}</p>}
          </div>
          {imagePreview && (
            <div className="col-span-2">
              <img src={imagePreview} alt="Preview evidence" className="h-32 rounded-lg border border-gray-200 object-cover bg-gray-50" />
            </div>
          )}
          <div className="col-span-2">

          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-[#0f1729]">Basic information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Horse name"
              value={form.name}
              onChange={set("name")}
              placeholder="VD: Silver Arrow"
              required
              maxLength={40}
              error={errors.name}
            />
          </div>
          <Select
            label="Breed"
            value={form.breed}
            onChange={set("breed")}
            options={[
              "Thoroughbred",
              "Arabian",
              "Quarter Horse",
              "Warmblood",
              "Appaloosa",
            ].map((v) => ({ value: v, label: v }))}
          />
          <Select
            label="Gender"
            value={form.gender}
            onChange={set("gender")}
            options={[{ value: "Stallion", label: "Male" }, { value: "Mare", label: "Female" }]}
          />
          <Input
            label="Date of birth"
            value={form.birthDate}
            onChange={set("birthDate")}
            type="date"
            max={todayIso}
            required
            error={errors.birthDate}
          />
          <Input
            label="Coat colour"
            value={form.color}
            onChange={set("color")}
            placeholder="Bay, Grey, Chestnut..."
            required
            maxLength={30}
            error={errors.color}
          />
          <Input
            label="Height (cm)"
            value={form.height}
            onChange={set("height")}
            type="number"
            placeholder="160"
            required
            error={errors.height}
          />
        </div>
        {errors.submit && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.submit}
          </div>
        )}
        {Object.entries(errors).some(([k, v]) => k !== "submit" && Boolean(v)) && (
          <p className="text-red-600 text-sm">
            Correct the fields highlighted in red.
          </p>
        )}
      </Card>

      {/* Race History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#0f1729]">
              Race history (submitted with registration)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Optional — provide details to support the center's assessment
            </p>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  void onPickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span className="inline-block px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white hover:bg-gray-50">
                Import Excel
              </span>
            </label>
            <Btn
              variant="secondary"
              onClick={() => {
                setEditRid(null);
                setShowRaceForm(!showRaceForm);
              }}
            >
              + Add result
            </Btn>
          </div>
        </div>
        {(imp || impErr) && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
            {impErr && <div className="text-red-600 mb-2">{impErr}</div>}
            {imp && (
              <>
                <div className="mb-2">
                  {imp.filter((r) => r.entry).length} valid ·{" "}
                  {imp.filter((r) => !r.entry).length} with errors (skipped)
                </div>
                {imp.map((r) => (
                  <div key={r.line} className={r.entry ? "" : "text-red-600"}>
                    Row {r.line}:{" "}
                    {r.entry
                      ? `${r.entry.raceName} · ${r.entry.date}`
                      : r.errors.join(" ")}
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <Btn
                    variant="gold"
                    onClick={confirmImport}
                    disabled={!imp.some((r) => r.entry)}
                  >
                    Import valid rows
                  </Btn>
                  <Btn variant="secondary" onClick={() => setImp(null)}>
                    Cancel
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}
        {showRaceForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Race name"
                value={newRace.raceName}
                onChange={(v) => setNewRace((r) => ({ ...r, raceName: v }))}
                placeholder="Example: RaceForce Sprint Cup"
                required
                maxLength={60}
                error={raceErr.raceName}
              />
              <Input
                label="Race date"
                value={newRace.date}
                onChange={(v) => setNewRace((r) => ({ ...r, date: v }))}
                type="date"
                max={todayIso}
                required
                error={raceErr.date}
              />
              <Select
                label="Distance"
                value={newRace.distance}
                onChange={(v) => setNewRace((r) => ({ ...r, distance: v }))}
                options={[
                  "800m",
                  "1000m",
                  "1200m",
                  "1400m",
                  "1600m",
                  "2000m",
                ]
                  .concat(
                    ["800m","1000m","1200m","1400m","1600m","2000m"].includes(newRace.distance)
                      ? []
                      : [newRace.distance],
                  )
                  .map((v) => ({ value: v, label: v }))}
              />
              <Select
                label="Position"
                value={newRace.position}
                onChange={(v) => setNewRace((r) => ({ ...r, position: v }))}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Position ${i + 1}`,
                }))}
              />
              <Input
                label="Time"
                value={newRace.time}
                onChange={(v) => setNewRace((r) => ({ ...r, time: v }))}
                placeholder="VD: 1:11.24"
              />
              <Input
                label="Racecourse"
                value={newRace.venue}
                onChange={(v) => setNewRace((r) => ({ ...r, venue: v }))}
                placeholder="e.g. Riverside Racecourse"
              />
              <Input
                label="Jockey"
                value={newRace.jockey}
                onChange={(v) => setNewRace((r) => ({ ...r, jockey: v }))}
                placeholder="Jockey name"
              />
              <Input
                label="Prize"
                value={newRace.prize}
                onChange={(v) => setNewRace((r) => ({ ...r, prize: v }))}
                placeholder="VD: 50,000,000 VND"
              />
            </div>
            <div className="flex gap-2">
              <Btn variant="gold" onClick={addRace}>
                {editRid ? "✓ Save" : "✓ Add"}
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => {
                  setShowRaceForm(false);
                  setEditRid(null);
                }}
              >
                Cancel
              </Btn>
            </div>
          </div>
        )}
        {raceHistory.length > 0 ? (
          raceHistory.map((r) => (
            <div
              key={r.id}
              onClick={() => openRace(r)}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 mb-2 cursor-pointer hover:bg-gray-100"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${r.position === 1 ? "bg-[#c9973b] text-white" : "bg-gray-400 text-white"}`}
              >
                #{r.position}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{r.raceName}</div>
                <div className="text-xs text-gray-500">
                  {r.date} · {r.distance} · {r.time}
                </div>
              </div>
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  setRaceHistory((h) => h.filter((x) => x.id !== r.id));
                }}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                ✕ Delete
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm">
            No race history yet — click "+ Add result" to include results
          </div>
        )}
      </Card>
    </div>
  );
}
