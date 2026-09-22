import { Navigate, Outlet } from "react-router-dom";

function ProtectRoutes () {
    const token = localStorage.getItem("token");
    if (!token) {
        return (
            <Navigate to="/admin/login" replace/>
        );
    }
    return <Outlet />
}
export default ProtectRoutes;