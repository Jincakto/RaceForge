import { LiveOperations } from "./LiveOperations.jsx";
import {ApiNotificationsPage} from '../api/ApiNotificationsPage.jsx';
import { Navigate } from "react-router-dom";
import { LiveProfile } from "./LiveProfile.jsx";
import { LiveHorses } from "./LiveHorses.jsx";
import { LiveHorseEditor } from "./LiveHorseEditor.jsx";
import { LiveHorseDetail } from "./LiveHorseDetail.jsx";
import { LiveMemberReviews } from "./LiveMemberReviews.jsx";
import { LiveStaff } from "./LiveStaff.jsx";
import { ApiPermissionsPage } from "../api/ApiPermissionsPage.jsx";

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

  if (role) items.push({icon: "🏆", label: "Kết quả đua", page: "race-results"}, {icon: "📅", label: "Lịch tập", page: "training-hub"});
  if (role === "manager")
    items.push(
      { icon: "📦", label: "Gói huấn luyện", page: "training-register" },
      { icon: "👥", label: "Duyệt thành viên", page: "member-requests" },
      { icon: "🧑", label: "Người dùng & nhân viên", page: "staff" },
      { icon: "🔑", label: "Quyền theo vai trò", page: "permissions" },
    );
  if(role)items.push({icon:"🔔",label:"Thông báo",page:"notifications"});
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
    case "race-results": return <LiveOperations mode="races"/>;
    case "training-hub": return <LiveOperations mode="sessions"/>;
    case "training-register": return <LiveOperations mode="packages"/>;
    case "api-workflow":
      return workflow;
    case "notifications":
      return <ApiNotificationsPage/>;
    case "profile":
      return <LiveProfile />;
    case "horse-list":
    case "my-horses":
      return <LiveHorses />;
    case "member-requests":
      return <LiveMemberReviews />;
    case "staff":
      return <LiveStaff />;
    case "permissions":
      return <ApiPermissionsPage />;
    case "trainer-select":
      return <NoAccess text="Chức năng chưa được hỗ trợ." />;
    default:
      return null;
  }
}
