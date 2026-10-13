import { LiveTraining } from "./LiveTraining.jsx";
import { LivePackages } from "./LivePackages.jsx";
import { LiveRaces } from "./LiveRaces.jsx";
import {ApiNotificationsPage} from '../api/ApiNotificationsPage.jsx';
import { Navigate } from "react-router-dom";
import { LiveProfile } from "./LiveProfile.jsx";
import { LiveHorses } from "./LiveHorses.jsx";
import { LiveHorseEditor } from "./LiveHorseEditor.jsx";
import { LiveHorseDetail } from "./LiveHorseDetail.jsx";
import { LiveMemberReviews } from "./LiveMemberReviews.jsx";
import { LiveStaff } from "./LiveStaff.jsx";
import { LivePermissions } from "./LivePermissions.jsx";
import { LiveTrainers } from "./LiveTrainers.jsx";
import { NoAccess } from "../../components/ui/NoAccess.jsx";
export function liveNavigation(role) {
  const items = [{ icon: "👤", label: "Hồ sơ cá nhân", page: "profile" }];
  if (["owner", "manager", "veterinarian"].includes(role))
    items.unshift({
      icon: "🩺",
      label: "Medical & Training",
      page: "api-workflow",
    });
  if (
    ["owner", "manager", "head_trainer", "veterinarian", "groom"].includes(role)
  )
    items.unshift({
      icon: "🐎",
      label: role === "owner" ? "Ngựa của tôi" : "Danh sách ngựa",
      page: role === "owner" ? "my-horses" : "horse-list",
    });
  if (role === "owner")
    items.push({ icon: "🏇", label: "Trainer", page: "trainer-select" });
  if (role === "manager")
    items.push(
      { icon: "📋", label: "Duyệt ngựa", page: "center-requests" },
      { icon: "👥", label: "Duyệt thành viên", page: "member-requests" },
      { icon: "🧑", label: "Người dùng & nhân viên", page: "staff" },
      { icon: "🔑", label: "Quyền theo vai trò", page: "permissions" },
    );
  if(role)items.push({icon:"🔔",label:"Thông báo",page:"notifications"});
  if (role) items.push({icon:"",label:"Lịch tập & kết quả",page:"training-hub"},{icon:"",label:role==="owner"?"Đăng ký gói tập":"Gói huấn luyện",page:"training-register"},{icon:"",label:"Lịch sử đua",page:"race-results"});
  return items;
}
export function LiveContent({ page, user, workflow }) {
  const allowed = new Set(liveNavigation(user.role).map((i) => i.page));
  if (["horse-detail", "horse-edit", "horse-create"].includes(page)) {
    if (page !== "horse-detail" && user.role !== "owner")
      return <NoAccess text="Chỉ chủ ngựa được tạo/sửa hồ sơ." />;
    return page === "horse-detail" ? <LiveHorseDetail /> : <LiveHorseEditor />;
  }
  if (page === "dashboard")
    return (
      <Navigate
        to={user.role === "owner" ? "/my-horses" : "/profile"}
        replace
      />
    );
  if (!allowed.has(page))
    return <NoAccess text="Trang này chưa có API cho vai trò của bạn." />;
  switch (page) {
    case "training-hub": return <LiveTraining user={user}/>;
    case "training-register": return <LivePackages user={user}/>;
    case "race-results": return <LiveRaces user={user}/>;
    case "api-workflow":
      return workflow;
    case "notifications":
      return <ApiNotificationsPage/>;
    case "profile":
      return <LiveProfile />;
    case "horse-list":
    case "my-horses":
      return <LiveHorses />;
    case "center-requests":
      return <LiveHorses review />;
    case "member-requests":
      return <LiveMemberReviews />;
    case "staff":
      return <LiveStaff />;
    case "permissions":
      return <LivePermissions />;
    case "trainer-select":
      return <LiveTrainers />;
    default:
      return null;
  }
}
