import { type AppUser } from "../../../shared/data/data";
import { type AppState, type Page } from "../../../app/appTypes";
import { Btn, Card, Badge } from "../../../shared/ui/ui";
import { LifecycleBadge } from "../components/HorseProfileWidgets";
import { IdChip } from "../../admin/admin";
import { IdentityBadge, IntakeProgress, intakeStage } from "../intake";

export function MyHorsesPage({
  user,
  state,
  navigate,
  onSubmitToCenter,
  onSelectHorse,
}: {
  user: AppUser;
  state: AppState;
  navigate: (p: Page) => void;
  onSubmitToCenter: (horseId: string) => void;
  onSelectHorse: (id: string) => void;
}) {
  const myHorses = state.horses.filter((h) => h.ownerId === user.id);
  const clubHorses = myHorses.filter((h) => h.clubId === user.clubId);
  const unregistered = myHorses.filter((h) => !h.clubId);
  const pendingReqs = state.horseClubRequests.filter(
    (r) => r.ownerId === user.id && r.status === "pending",
  );
  const myClub = state.clubs.find((c) => c.id === user.clubId);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#0f1729]">
            My horses
          </h2>
          <p className="text-sm text-gray-500">
            {myHorses.length} horses · {clubHorses.length} in the center
          </p>
        </div>
        <Btn variant="gold" onClick={() => navigate("horse-create")}>
          + Register a new horse
        </Btn>
      </div>
      {clubHorses.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase px-2">
              Trong {myClub?.name}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {clubHorses.map((h) => (
              <Card
                key={h.id}
                className="overflow-hidden"
                onClick={() => {
                  onSelectHorse(h.id);
                  navigate("horse-detail");
                }}
              >
                <div className="relative h-32">
                  <img
                    src={h.imageUrl || undefined}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {h.name}
                      </div>
                      <div className="text-gray-300 text-xs">{h.id}</div>
                    </div>
                    <Badge status={h.healthStatus} />
                  </div>
                </div>
                <div className="px-3 pt-3">
                  <LifecycleBadge horse={h} />
                </div>
                <div className="p-3 text-xs text-gray-500 flex justify-between">
                  <span>
                    {h.breed} · {h.age}t
                  </span>
                  <span>
                    {h.wins}T/{h.totalRaces}R
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      {unregistered.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase px-2">
              Not admitted to the center
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          {unregistered.map((h) => {
            const hasPending = pendingReqs.some((r) => r.horseId === h.id);
            return (
              <Card key={h.id} className="p-4">
                <div className="flex items-center gap-4">
                  {h.imageUrl ? (
                    <img
                      src={h.imageUrl || undefined}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">
                      🐎
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{h.name}</div>
                    <div className="text-sm text-gray-500">
                      {h.breed} · {h.age}t · {h.color}
                    </div>
                    <div className="mt-1">
                      <LifecycleBadge horse={h} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <IdChip kind="HRS" id={h.id} />
                      <IdentityBadge verified={h.identityVerified} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onSelectHorse(h.id);
                        navigate("horse-detail");
                      }}
                    >
                      {h.approvalStatus === "pending" && hasPending
                        ? "View profile"
                        : "✏ Edit profile"}
                    </Btn>
                    {myClub && !hasPending && (
                      <Btn
                        variant="gold"
                        size="sm"
                        onClick={() => onSubmitToCenter(h.id)}
                      >
                        📋 Apply for admission
                      </Btn>
                    )}
                  </div>
                </div>
                {(() => {
                  const rq = state.horseClubRequests
                    .filter((r) => r.horseId === h.id)
                    .slice(-1)[0];
                  return rq ? (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <IntakeProgress stage={intakeStage(h, rq)} />
                      {rq.status === "rejected" && (
                        <p className="mt-2 text-xs text-red-600">
                          Rejection reason: {rq.reviewNote}
                        </p>
                      )}
                    </div>
                  ) : null;
                })()}
              </Card>
            );
          })}
        </>
      )}
      {myHorses.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-5xl mb-4">🐎</div>
          <div className="font-semibold text-lg mb-1">
            You have not registered any horses
          </div>
          <div className="text-gray-400 text-sm mb-5">
            Create a horse profile and apply to the training center
          </div>
          <Btn variant="gold" onClick={() => navigate("horse-create")}>
            + Register your first horse
          </Btn>
        </Card>
      )}
    </div>
  );
}
