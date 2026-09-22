import { Outlet, Navigate } from "react-router-dom";

function SuperAdminRoute () {
    const utilisateur = JSON.parse(localStorage.getItem("utilisateur"));
    const role = utilisateur.role_admin;

    if (!utilisateur) {
        return (
            <Navigate to="/admin/login" replace/>
        );
    }
    if (role !== "super_admin") {
        return (
            <Navigate to="/admin/login" replace/>
        );
    }
    return <Outlet />
}
export default SuperAdminRoute;