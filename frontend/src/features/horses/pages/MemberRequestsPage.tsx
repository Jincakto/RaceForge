import { type AppState, type Page } from "../../../app/appTypes";
import { type Role } from "../../../shared/data/data";
import { useState } from "react";
import { Card, Badge, Select, Btn } from "../../../shared/ui/ui";

function MemberRequestsPage({
  state,
  navigate,
  onApprove,
  onReject,
  onViewTrainer,
}: {
  state: AppState;
  navigate: (p: Page) => void;
  onApprove: (reqId: string, role: Role) => void;
  onReject: (reqId: string) => void;
  onViewTrainer: (uid: string) => void;
}) {
  const myClub = state.clubs.find((c) => c.managerId === state.user!.id);
  const myReqs = state.memberRequests.filter((r) => r.clubId === myClub?.id);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const roleOpts: { value: Role; label: string }[] = [
    { value: "head_trainer", label: "Trainer" },
    { value: "veterinarian", label: "Veterinarian" },
    { value: "groom", label: "Groom" },
    { value: "owner", label: "Horse Owner" },
  ];
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl font-serif font-bold">Membership requests</h2>
        <p className="text-sm text-gray-500">
          {myReqs.filter((r) => r.status === "pending").length} awaiting
          approval
        </p>
      </div>
      {myReqs.filter((r) => r.status === "pending").length === 0 && (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-3">🤝</div>
          <div className="font-semibold text-gray-600">No pending requests</div>
        </Card>
      )}
      {myReqs
        .filter((r) => r.status === "pending")
        .map((req) => (
          <Card key={req.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#1a2844] text-white flex items-center justify-center font-bold">
                {req.userAvatar}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{req.userName}</div>
                <div className="text-sm text-gray-500">{req.userEmail}</div>
                {req.userRole && <Badge status={req.userRole} />}
                <div className="text-xs text-gray-400 mt-1">
                  Request {req.requestedAt} · Expired {req.expiresAt}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Badge status="pending" />
                {req.userRole === "head_trainer" && (
                  <button
                    onClick={() => onViewTrainer(req.userId)}
                    className="text-xs text-[#c9973b] hover:underline font-medium"
                  >
                    📋 View trainer profile →
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1">
                <Select
                  label=""
                  value={roles[req.id] || req.userRole || ""}
                  onChange={(v) =>
                    setRoles((p) => ({ ...p, [req.id]: v as Role }))
                  }
                  options={[
                    { value: "", label: "— Select a role —" },
                    ...roleOpts,
                  ]}
                />
              </div>
              <Btn
                variant="gold"
                disabled={!roles[req.id] && !req.userRole}
                onClick={() => {
                  const role = (roles[req.id] || req.userRole) as Role;
                  if (role) onApprove(req.id, role);
                }}
              >
                ✓ Approve
              </Btn>
              <Btn variant="danger" onClick={() => onReject(req.id)}>
                ✕ Reject
              </Btn>
            </div>
          </Card>
        ))}
    </div>
  );
}
