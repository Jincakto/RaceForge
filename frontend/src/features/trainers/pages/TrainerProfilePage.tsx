import { type AppState, type Page } from "../../../app/appTypes";
import { type Role } from "../../../shared/data/data";
import { Card, Btn } from "../../../shared/ui/ui";
import { ROLE_LABELS } from "../../../app/AppLayout";

export function TrainerProfilePage({
  state,
  navigate,
  trainerId,
  onApproveRequest,
}: {
  state: AppState;
  navigate: (p: Page) => void;
  trainerId: string;
  onApproveRequest?: (reqId: string, role: Role) => void;
}) {
  const trainer = state.users.find((u) => u.id === trainerId);
  const req = state.memberRequests.find(
    (r) => r.userId === trainerId && r.status === "pending",
  );
  if (!trainer)
    return (
      <Card className="p-10 text-center">
        <div className="text-gray-500">Information not found</div>
      </Card>
    );
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button
          onClick={() => navigate("member-requests")}
          className="hover:text-[#c9973b]"
        >
          Membership requests
        </button>
        <span>/</span>
        <span className="font-medium">Applicant profile</span>
      </div>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a2844] to-[#243558] p-8">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-[#c9973b] flex items-center justify-center text-white text-2xl font-bold">
              {trainer.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-white font-serif text-2xl font-bold">
                {trainer.name}
              </h2>
              <p className="text-[#c9973b] font-medium mt-1">
                {trainer.role ? ROLE_LABELS[trainer.role] : "Candidate"}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {trainer.email} · {trainer.phone}
              </p>
            </div>
            {req && onApproveRequest && (
              <Btn
                variant="gold"
                onClick={() => {
                  onApproveRequest(req.id, "head_trainer");
                  navigate("member-requests");
                }}
              >
                ✓ Approve admission
              </Btn>
            )}
          </div>
        </div>
        <div className="p-6 space-y-5">
          {trainer.bio && (
            <div>
              <div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">
                Introduction
              </div>
              <p className="text-gray-700 leading-relaxed">{trainer.bio}</p>
            </div>
          )}
          {trainer.experience && (
            <div>
              <div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">
                Experience
              </div>
              <p className="text-gray-700">{trainer.experience}</p>
            </div>
          )}
          {trainer.certifications && (
            <div>
              <div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">
                Certifications and qualifications
              </div>
              <div className="space-y-1">
                {trainer.certifications.split(" · ").map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <span className="text-[#c9973b]">📜</span>
                    <span className="text-gray-700">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {trainer.achievements && (
            <div>
              <div className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">
                Highlights
              </div>
              <div className="space-y-1">
                {trainer.achievements.split(" · ").map((a) => (
                  <div key={a} className="flex items-center gap-2">
                    <span className="text-[#c9973b]">🏆</span>
                    <span className="text-gray-700">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
