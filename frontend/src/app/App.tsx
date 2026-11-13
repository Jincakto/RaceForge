import { markNotificationRead } from "../features/notifications/api/notificationsApi";
import { getCurrentAccount } from "../features/admin/api/adminApi";
import { type Horse, type AppNotification, type Role, type AppUser } from "../shared/data/data";
import { useState, useRef, useCallback, useEffect } from "react";
import { type AppState, type Page } from "./appTypes";
import { CENTER, RemoteSourceStore, type RemoteIssue, loadRemote, userFromApi } from "./remote";
import { DEFAULT_ROLE_PERMS, ROLE_LABELS, SuccessToast, ErrorToast, NoAccess, visibleNotifications, AppLayout, PAGE_TITLES } from "./AppLayout";
import { type AuditEntry, NoPermission, FEATURES, AccountManagementPage, PermissionMatrixPage, AuditLogPage, AdminDashboard } from "../features/admin/admin";
import { permissionForPage } from "../features/admin/api/permissionApi";
import { restoreSessionForLocation } from "../features/auth/hooks/passwordSetup";
import { auth } from "../features/auth/api/authApi";
import { ApiError } from "../shared/api/api";
import { makeRemoteActions } from "./remoteActions";
import { clearRecommendations } from "../features/training/recommendations";
import { HomePage, LoginPage, RegisterPage } from "../features/auth/pages/AuthPages";
import { type ExamView, VetExamHubPage } from "../features/medical/pages/VetExamHubPage";
import { ManagerDashboard } from "../features/admin/pages/ManagerDashboard";
import { HeadTrainerDashboard } from "../features/trainers/pages/HeadTrainerDashboard";
import { VetDashboard } from "../features/medical/pages/VetDashboard";
import { GroomDashboard } from "../features/horses/pages/GroomDashboard";
import { OwnerDashboard } from "../features/owner/pages/OwnerDashboard";
import { HorseListPage } from "../features/horses/pages/HorseListPage";
import { vetVisible, IntakeBoardPage, VetAssignedPage } from "../features/horses/intake";
import { HorseDetailPage } from "../features/horses/pages/HorseDetailPage";
import { HorseCreatePage } from "../features/horses/pages/HorseCreatePage";
import { MyHorsesPage } from "../features/horses/pages/MyHorsesPage";
import { PackageCatalogPage, TrainerAssignPage } from "../features/packages/packages";
import { TrainerProfilePage } from "../features/trainers/pages/TrainerProfilePage";
import { HealthRecordsPage } from "../features/medical/pages/healthRecords";
import { TrainingHubPage } from "../features/training/pages/trainingPlans";
import { CareHubPage, InventoryPage, InventoryLogPage } from "../features/horses/pages/HorseCarePages";
import { TrainingRegisterPage } from "../features/packages/pages/trainingRegister";
import { OwnerCertificates } from "../features/packages/pages/OwnerCertificates";
import { PerformancePage } from "../features/training/pages/PerformancePage";
import { ReportsPage, StaffPage, ProfilePage } from "../features/admin/pages/AdminPages";
import { NotificationsPage } from "../features/notifications/pages/NotificationsPage";
import { isAssessmentNotification } from "../features/training/trainingAssessment";
import { TrainingAssessmentNotification } from "../features/training/TrainingAssessmentNotification";

function addWeeks(d: string, weeks: number): string {
  const [dd, mm, yy] = d.split("/").map(Number);
  const dt = new Date(yy, mm - 1, dd + weeks * 7);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function addDays(d: string, days: number): string {
  const [dd, mm, yy] = d.split("/").map(Number);
  const dt = new Date(yy, mm - 1, dd + days);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function lockMessage(h: Horse, action: string): string {
  return `Horse "${h.name}" is under a TRAINING LOCK (${h.lock?.reason || "as directed by the veterinarian"}). Cannot ${action}. The training package is paused; only a veterinarian can release the lock.`;
}

function trainerTarget(
  h: Horse,
): Pick<AppNotification, "toUserIds" | "toRoles"> {
  return h.headTrainerId
    ? { toUserIds: [h.headTrainerId] }
    : { toRoles: ["head_trainer"] };
}

export default function App() {
  const [state, setState] = useState<AppState>({
    user: null,
    page: new URLSearchParams(window.location.search).has("token")
      ? "login"
      : "home",
    users: [],
    clubs: [
      {
        id: CENTER,
        name: "RaceForge",
        location: "",
        description: "",
        managerId: "",
        managerName: "",
        memberCount: 0,
        founded: "",
        logoLetter: "R",
      },
    ],
    memberRequests: [],
    horses: [],
    horseClubRequests: [],
    examHorseId: null,
    healthRecords: [],
    trainingPlans: [],
    trainingSessions: [],
    inventory: [],
    invLogs: [],
    careRecords: [],
    incidents: [],
    notifications: [],
    enrollments: [],
    errorMsg: null,
    selectedHorseId: "",
    packages: [],
    viewTrainerId: null,
    showSuccess: null,
    userPermissions: {},
    rolePerms: DEFAULT_ROLE_PERMS,
    auditLog: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const navigate = useCallback(
    (page: Page) => setState((s) => ({ ...s, page, postTrainingContext: page === "vet-health-form" ? s.postTrainingContext : undefined, unlockExamHorseId: page === "vet-health-form" ? s.unlockExamHorseId : undefined })),
    [],
  );

  const showError = useCallback((msg: string) => {
    setState((s) => ({ ...s, errorMsg: msg }));
    setTimeout(() => setState((s) => ({ ...s, errorMsg: null })), 6000);
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setState((s) => ({ ...s, showSuccess: msg }));
    setTimeout(() => setState((s) => ({ ...s, showSuccess: null })), 3000);
  }, []);

  const logAudit = useCallback(
    (action: string, target: string, reason?: string) => {
      setState((s) => {
        const u = s.user;
        const t = new Date();
        const time = `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}/${t.getFullYear()} ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
        const entry: AuditEntry = {
          id: `au${Date.now()}${Math.floor(Math.random() * 1000)}`,
          time,
          actor: u?.name || "System",
          actorRole: u?.role ? ROLE_LABELS[u.role] : "—",
          action,
          target,
          reason,
        };
        return { ...s, auditLog: [entry, ...s.auditLog] };
      });
    },
    [],
  );

  const loadVersion = useRef(0);
  const remoteSources=useRef(new RemoteSourceStore());
  const [remoteIssues,setRemoteIssues]=useState<RemoteIssue[]>([]);
  const verifiedHorses = useRef(new Set<string>());
  const reloadRemote = useCallback(async (onlySource?: string) => {
    const user = stateRef.current.user;
    if (!user) return;
    const version = ++loadVersion.current;
    let data: Awaited<ReturnType<typeof loadRemote>>;
    try {
      data = await loadRemote(user, message=>{
        if(version===loadVersion.current && stateRef.current.user?.id===user.id)showError(message);
      },remoteSources.current,onlySource);
    } catch (e) {
      if (
        version === loadVersion.current &&
        stateRef.current.user?.id === user.id
      )
        showError((e as Error).message);
      return;
    }
    if (
      version !== loadVersion.current ||
      stateRef.current.user?.id !== user.id
    )
      return;
    setRemoteIssues(data.trainingLoadIssues || []);
    if (data.serverPermissions) {
      const rolePerms: Record<string, string[]> = {};
      for (const [role, pages] of Object.entries(DEFAULT_ROLE_PERMS)) {
        const codes = data.serverPermissions[role] || [];
        rolePerms[role] = pages.filter((page) => {
          const code = permissionForPage(role as Role, page);
          return !code || codes.includes(code);
        });
      }
      setState((s) => ({
        ...s,
        rolePerms,
        auditLog: data.permissionAudit || [],
      }));
    }
    data.horses.forEach((h) => {
      if (verifiedHorses.current.has(h.id)) h.identityVerified = true;
    });
    setState((s) => ({
      ...s,
      ...data,
      selectedHorseId: data.horses.some((h) => h.id === s.selectedHorseId)
        ? s.selectedHorseId
        : data.horses[0]?.id || "",
    }));
  }, [showError]);
  useEffect(() => {
    remoteSources.current.clear();
    setRemoteIssues([]);
    loadVersion.current++;
    setState(s=>({...s,enrollments:[],trainingPlans:[],trainingSessions:[]}));
    if (state.user?.id) void reloadRemote();
  }, [state.user?.id, reloadRemote]);
  useEffect(()=>{if(stateRef.current.user)void reloadRemote();},[state.page,reloadRemote]);
  useEffect(() => {
    let active = true;
    const expired = () => {
      remoteSources.current.clear(); setRemoteIssues([]);
      loadVersion.current++;
      setState((s) => ({
        ...s,
        user: null,
        page: "login",
        users: [],
        horses: [],
        healthRecords: [],
        enrollments: [],
        trainingPlans: [],
        trainingSessions: [],
        notifications: [],
      }));
    };
    window.addEventListener("raceforge:session-expired", expired);
    void restoreSessionForLocation(
      () => window.location.search,
      (w) => {
        if (active) {
          const user = userFromApi(w);
          remoteSources.current.clear(); loadVersion.current++; setRemoteIssues([]);
    setState((s) => ({ ...s, user, page: "dashboard", postTrainingContext:undefined, trainingAssessmentNotificationId:undefined, horses:[],healthRecords:[],enrollments:[],trainingPlans:[],trainingSessions:[] }));
        }
      },
    ).catch((e) => {
      if (active && !(e instanceof ApiError && e.status === 401))
        showError((e as Error).message);
    });
    return () => {
      active = false;
      window.removeEventListener("raceforge:session-expired", expired);
    };
  }, [showError]);
  const remote = makeRemoteActions({
    getState: () => stateRef.current,
    reload: reloadRemote,
    applyPackageLifecycle: outcome => setState(s => ({ ...s, enrollments: s.enrollments.some(e => e.id === outcome.registration.id) ? s.enrollments.map(e => e.id === outcome.registration.id ? { ...e, ...outcome.registration } : e) : [...s.enrollments, outcome.registration], trainingSessions: s.trainingSessions.filter(row => !(outcome.registration.apiStatus === "CANCELLED" && row.horsePackageId === outcome.registration.id && row.status === "Scheduled" && !row.actualStart)) })),
    success: showSuccess,
    error: showError,
    navigate: (p) => navigate(p as Page),
  });
  const background = (p: Promise<unknown>) => {
    void p.catch(() => {});
  };

  const handleLogin = useCallback((user: AppUser) => {
    remoteSources.current.clear(); loadVersion.current++; setRemoteIssues([]);
    setState((s) => ({ ...s, user, page: "dashboard", postTrainingContext:undefined, trainingAssessmentNotificationId:undefined, horses:[],healthRecords:[],enrollments:[],trainingPlans:[],trainingSessions:[] }));
  }, []);

  const handleRegister = useCallback(
    (user: AppUser) => {
      remoteSources.current.clear(); loadVersion.current++; setRemoteIssues([]);
    setState((s) => ({ ...s, user, page: "dashboard", postTrainingContext:undefined, trainingAssessmentNotificationId:undefined, horses:[],healthRecords:[],enrollments:[],trainingPlans:[],trainingSessions:[] }));
      showSuccess("Email verified and horse owner account signed in.");
    },
    [showSuccess],
  );

  const handleLogout = useCallback(() => {
    remoteSources.current.clear(); setRemoteIssues([]);
    loadVersion.current++;
    verifiedHorses.current.clear();
    clearRecommendations();
    void auth.logout().catch((e) => showError((e as Error).message));
    setState((s) => ({
      ...s,
      user: null,
      page: "home",
      users: [],
      horses: [],
      healthRecords: [],
      notifications: [],
      enrollments: [],
      trainingPlans: [],
      trainingSessions: [],
    }));
  }, [showError]);

  // Public pages
  if (!state.user || ["home", "login", "register"].includes(state.page)) {
    return (
      <>
        {state.showSuccess && <SuccessToast message={state.showSuccess} />}
        {state.errorMsg && <ErrorToast message={state.errorMsg} />}
        {state.page === "home" && <HomePage navigate={navigate} />}
        {state.page === "login" && (
          <LoginPage
            navigate={navigate}
            users={state.users}
            onLogin={handleLogin}
          />
        )}
        {state.page === "register" && (
          <RegisterPage navigate={navigate} onRegister={handleRegister} />
        )}
        {!state.user && !["home", "login", "register"].includes(state.page) && (
          <HomePage navigate={navigate} />
        )}
      </>
    );
  }

  // Onboarding pages
  if (
    ["onboarding", "join-center", "pending", "member-requests"].includes(
      state.page,
    )
  ) {
    setTimeout(() => setState((s) => ({ ...s, page: "dashboard" })), 0);
    return null;
  }
  if (!state.user.role)
    return (
      <NoPermission text="No role is assigned to this account. Contact your administrator." />
    );

  const renderPage = (): React.ReactNode => {
    const role = state.user!.role!;
    const adminOnly: Page[] = ["accounts", "permissions", "audit-log"];
    if (adminOnly.includes(state.page) && role !== "admin")
      return (
        <NoPermission text="Only administrators may access this feature." />
      );
    if (
      role === "admin" &&
      !adminOnly
        .concat(["dashboard", "notifications", "profile"])
        .includes(state.page)
    )
      return (
        <NoPermission text="Administrators do not perform training operations. Use the administration sections in the sidebar." />
      );
    if (
      role !== "admin" &&
      FEATURES.some((f) => f.page === state.page) &&
      !(state.rolePerms[role] || []).includes(state.page) &&
      !(state.userPermissions[state.user!.id] || []).includes(state.page)
    )
      return (
        <NoPermission text="Your role does not have access to this feature." />
      );
    const hasPage = (pg: Page) =>
      role === "admin" ||
      (state.rolePerms[role] || []).includes(pg) ||
      (state.userPermissions[state.user!.id] || []).includes(pg);
    const examHub = (initialView: ExamView) => (
      <VetExamHubPage
        key={state.postTrainingContext?.sessionId || initialView}
        state={state}
        navigate={navigate}
        onSave={showSuccess}
        onSaveRecord={(rec) => state.postTrainingContext ? remote.savePostTrainingHealth(state.postTrainingContext.sessionId, rec) : remote.saveHealth(rec)}
        onPostExam={remote.postExam}
        onUnlockExam={(id) =>
          setState((s) => ({
            ...s,
            examHorseId: id,
            unlockExamHorseId: id,
            page: "vet-health-form",
          }))
        }
        onManualLock={() =>
          "Complete an examination and confirm NOT_FIT to apply a training lock on the server."
        }
        unlockHorseId={state.unlockExamHorseId}
        onUnlock={async (id, reason) => {
          const result = await remote.unlock(id, reason);
          if (!result.ok) return result.message;
          setState((s) => ({ ...s, unlockExamHorseId: undefined }));
          return null;
        }}
        onExamHorse={(id) => setState((s) => ({ ...s, examHorseId: id }))}
        onConsumeExamHorse={() =>
          setState((s) => ({ ...s, examHorseId: null }))
        }
        canExam={hasPage("vet-health-form")}
        canPost={hasPage("post-exam")}
        initialView={initialView}
      />
    );
    switch (state.page) {
      case "accounts":
        return (
          <AccountManagementPage
            actor={state.user!}
            users={state.users}
            clubs={state.clubs}
            onCreate={remote.createAccount}
            onToggleLock={remote.toggleLock}
          />
        );
      case "permissions":
        return (
          <PermissionMatrixPage
            rolePerms={state.rolePerms}
            audit={state.auditLog}
            onToggle={remote.togglePermission}
          />
        );
      case "audit-log":
        return <AuditLogPage audit={state.auditLog} />;
      case "dashboard": {
        const r = state.user!.role;
        if (r === "manager")
          return <ManagerDashboard state={state} navigate={navigate} />;
        if (r === "head_trainer")
          return <HeadTrainerDashboard state={state} navigate={navigate} />;
        if (r === "veterinarian")
          return <VetDashboard state={state} navigate={navigate} />;
        if (r === "groom")
          return <GroomDashboard state={state} navigate={navigate} />;
        if (r === "owner")
          return <OwnerDashboard state={state} navigate={navigate} />;
        if (r === "admin")
          return (
            <AdminDashboard
              users={state.users}
              audit={state.auditLog}
              navigate={navigate as (p: string) => void}
            />
          );
        return null;
      }
      case "horse-list":
        return (
          <HorseListPage
            navigate={navigate}
            horses={
              state.user!.role === "veterinarian"
                ? state.horses.filter((h) => vetVisible(h, state.user!))
                : state.horses
            }
            role={state.user!.role!}
            clubId={state.user!.clubId}
            onSelectHorse={(id) =>
              setState((s) => ({ ...s, selectedHorseId: id }))
            }
          />
        );
      case "horse-detail":
        return state.horses.length === 0 ? (
          <NoAccess text="No horse data is available to display." />
        ) : (
          <HorseDetailPage
            onUnlockExam={(id) => setState(s => ({ ...s, examHorseId: id, unlockExamHorseId: id, page: "vet-health-form" }))}
            state={state}
            navigate={navigate}
            onUpdateHorse={remote.updateHorse}
            onActivateHorse={remote.activateHorse}
            intakeActions={state.user!.role === "manager" && state.horseClubRequests.some(r => r.horseId === state.selectedHorseId && r.status === "pending") ? (
              <IntakeBoardPage
                key={state.selectedHorseId}
                detail
                user={state.user!}
                horses={state.horses.filter(h => h.id === state.selectedHorseId)}
                requests={state.horseClubRequests.filter(r => r.horseId === state.selectedHorseId && r.status === "pending")}
                records={state.healthRecords}
                users={state.users}
                onVerify={(id, verified) => {
                  if (verified) verifiedHorses.current.add(id);
                  else verifiedHorses.current.delete(id);
                  setState(s => ({ ...s, horses: s.horses.map(h => h.id === id ? { ...h, identityVerified: verified } : h) }));
                }}
                onAssign={remote.assignVet}
                onApprove={remote.approveHorse}
                onReject={remote.rejectHorse}
                onOpenHorse={() => {}}
              />
            ) : undefined}
            onShowSuccess={showSuccess}
            onAudit={logAudit}
          />
        );
      case "horse-create":
        return (
          <HorseCreatePage
            user={state.user!}
            state={state}
            navigate={navigate}
            onCreateHorse={remote.createHorse}
          />
        );
      case "my-horses":
        return (
          <MyHorsesPage
            user={state.user!}
            state={state}
            navigate={navigate}
            onSubmitToCenter={(id) => background(remote.submitHorse(id))}
            onSelectHorse={(id) =>
              setState((s) => ({ ...s, selectedHorseId: id }))
            }
          />
        );
      case "package-catalog":
        if (state.user!.role !== "manager")
          return (
            <NoAccess text="Only club managers may manage the package catalog" />
          );
        return (
          <PackageCatalogPage
            packages={state.packages}
            enrollments={state.enrollments}
            onSave={remote.savePackage}
            onToggle={remote.togglePackage}
          />
        );
      case "trainer-assign":
        if (state.user!.role !== "manager")
          return <NoAccess text="Only club managers may assign trainers" />;
        return (
          <TrainerAssignPage
            user={state.user!}
            users={state.users}
            horses={state.horses}
            enrollments={state.enrollments}
            onAssign={remote.assignTrainer}
          />
        );
      case "trainer-profile":
        return (
          <TrainerProfilePage
            state={state}
            navigate={navigate}
            trainerId={state.viewTrainerId || ""}
            onApproveRequest={() =>
              remote.unavailable(
                "role assignment; only administrators may create staff accounts",
              )
            }
          />
        );
      case "center-requests":
        if (state.user!.role !== "manager")
          return <NoAccess text="Only club managers may admit horses" />;
        return (
          <IntakeBoardPage
            user={state.user!}
            horses={state.horses}
            requests={state.horseClubRequests}
            records={state.healthRecords}
            users={state.users}
            onVerify={(id, verified) => {
              if (verified) verifiedHorses.current.add(id);
              else verifiedHorses.current.delete(id);
              setState((s) => ({
                ...s,
                horses: s.horses.map((h) =>
                  h.id === id ? { ...h, identityVerified: verified } : h,
                ),
              }));
            }}
            onAssign={remote.assignVet}
            onApprove={remote.approveHorse}
            onReject={remote.rejectHorse}
            onOpenHorse={(id) =>
              setState((s) => ({
                ...s,
                selectedHorseId: id,
                page: "horse-detail",
              }))
            }
          />
        );
      case "health-records":
        return <HealthRecordsPage state={state} navigate={navigate} />;
      case "vet-health-form":
        if (state.user!.role !== "veterinarian")
          return <HealthRecordsPage state={state} navigate={navigate} />;
        return examHub("new");
      case "training-hub":
        return (
          <TrainingHubPage
            state={state}
            navigate={navigate as (p: string) => void}
            onCreatePlan={remote.createPlan}
            onGenerate={remote.generateSessions}
            onCheckIn={remote.checkIn}
            onRespond={remote.respondAssign}
            onStartSession={remote.startSession}
            onCompleteSession={remote.completeSession}
            onCompletePackage={remote.completePackage}
            onRequestVetCheck={remote.requestVetCheck}
            onAcceptResumption={remote.acceptResumption}
            onStopSession={remote.stopSession}
            onConfirmSchedule={() =>
              "Sessions are generated and confirmed through the roadmap API."
            }
          />
        );
      case "care-hub":
        return (
          <CareHubPage
            state={state}
            navigate={navigate}
            onComplete={() => ({
              ok: false,
              message: "The care API is not available yet.",
              shortages: [],
            })}
            onUndo={() => "The care API is not available yet."}
            onReceive={() => "The inventory API is not available yet."}
            onReport={() => "The incident API is not available yet."}
          />
        );
      case "inventory":
        return (
          <InventoryPage
            state={state}
            navigate={navigate}
            onAdd={() => "The inventory API is not available yet."}
            onReceive={() => "The inventory API is not available yet."}
            onEdit={() => "The inventory API is not available yet."}
            onAdjust={() => "The inventory API is not available yet."}
            onDelete={() => "The inventory API is not available yet."}
          />
        );
      case "inventory-log":
        return <InventoryLogPage state={state} navigate={navigate} />;
      case "training-register":
        if (state.user!.role !== "owner")
          return (
            <NoAccess text="Only horse owners may register for training" />
          );
        return (
          <TrainingRegisterPage
            state={state}
            navigate={navigate as (p: string) => void}
            onStartPayment={remote.startPayment}
            onSyncPayment={remote.syncPayment}
            onCancelRegistration={remote.cancelRegistration}
          />
        );
      case "vet-assign":
        if (state.user!.role !== "veterinarian")
          return <NoAccess text="Only veterinarians may access this page" />;
        return (
          <VetAssignedPage
            loadError={state.vetAssignmentsError}
            user={state.user!}
            horses={state.horses}
            requests={state.horseClubRequests}
            onRespond={remote.respondVet}
            onExam={(id) =>
              setState((s) => ({
                ...s,
                examHorseId: id,
                page: "vet-health-form",
              }))
            }
            onOpenHorse={(id) =>
              setState((s) => ({
                ...s,
                selectedHorseId: id,
                page: "horse-detail",
              }))
            }
          />
        );
      case "post-exam":
        if (state.user!.role !== "veterinarian")
          return <NoAccess text="Only veterinarians may access this page" />;
        return examHub("locked");
      case "certificates":
        return role === "owner"
          ? <OwnerCertificates key={state.user!.id} ownerId={state.user!.id} horses={state.horses} enrollments={state.enrollments} />
          : <NoPermission text="This page is available to horse owners." />;
      case "performance":
        return role === "head_trainer"
          ? <NoPermission text="Training results are available under Training & plans." />
          : <PerformancePage state={state} />;
      case "reports":
        return (
          <ReportsPage
            onUnavailable={() => remote.unavailable("PDF report export")}
          />
        );
      case "staff":
        return (
          <StaffPage
            state={state}
            navigate={navigate}
            onUpdatePermissions={() =>
              remote.unavailable("individual access permissions")
            }
          />
        );
      case "notifications":
        return (
          <>
          <NotificationsPage
            notifications={visibleNotifications(
              state.notifications,
              state.user!,
            )}
            onMarkRead={(id) =>
              background(
                markNotificationRead(id)
                  .then(() => reloadRemote())
                  .catch((e) => {
                    showError((e as Error).message);
                    throw e;
                  }),
              )
            }
            onOpen={(n) => {
              if (isAssessmentNotification(n.type)) { setState(s => ({ ...s, trainingAssessmentNotificationId: n.id })); return; }
              if (n.action)
                setState((s) => ({
                  ...s,
                  page: n.action as Page,
                  selectedHorseId: n.horseId || s.selectedHorseId,
                }));
            }}
          />
          {state.trainingAssessmentNotificationId && <TrainingAssessmentNotification key={state.trainingAssessmentNotificationId} notificationId={state.trainingAssessmentNotificationId} canExamine={state.user?.role === "veterinarian"}
            onClose={() => setState(s => ({ ...s, trainingAssessmentNotificationId: undefined }))}
            onExamine={context => setState(s => ({ ...s, trainingAssessmentNotificationId: undefined, postTrainingContext: context, examHorseId: context.horseId, page: "vet-health-form" }))}/>}
          </>
        );
      case "profile":
        return (
          <ProfilePage
            user={state.user!}
            state={state}
            navigate={navigate}
            onLogout={handleLogout}
            onSave={(message) => {
              showSuccess(message);
              background(
                getCurrentAccount().then((w) =>
                  setState((s) => ({ ...s, user: userFromApi(w) })),
                ),
              );
            }}
            onError={showError}
          />
        );
      default:
        return <ManagerDashboard state={state} navigate={navigate} />;
    }
  };

  return (
    <>
      {state.showSuccess && <SuccessToast message={state.showSuccess} />}
      {state.errorMsg && <ErrorToast message={state.errorMsg} />}
      <AppLayout
        user={state.user!}
        page={state.page}
        title={PAGE_TITLES[state.page] || "RaceForce"}
        navigate={navigate}
        state={state}
      >
        {remoteIssues.length>0 && <section aria-label="Data loading issues" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <details><summary className="cursor-pointer font-semibold">{remoteIssues.length} data sources need attention</summary>
          <ul className="mt-3 space-y-3">{remoteIssues.map(issue=><li key={issue.key} className="flex flex-wrap items-start justify-between gap-2">
            <div><strong>{issue.key}</strong><p>{issue.message}</p><p className="text-xs">{issue.status===403?'Access was revoked. Restricted data has been removed.':issue.stale?'Showing previously loaded data; refresh failed.':'Data has not loaded successfully.'}</p></div>
            <button className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium" onClick={()=>void reloadRemote(issue.key)}>Retry</button>
          </li>)}</ul></details>
        </section>}
        {renderPage()}
      </AppLayout>
    </>
  );
}
