import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Pets from "./pages/Pets";
import PetDetails from "./pages/PetDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ApplyForm from "./pages/ApplyForm";
import MyApplications from "./pages/MyApplications";
import AddPet from "./pages/AddPet";
import ManageApplications from "./pages/ManageApplications";
import ReportRescue from "./pages/ReportRescue";
import RescueList from "./pages/RescueList";
import RescueDetails from "./pages/RescueDetails";

const staff = ["shelter_staff", "admin"];
const responders = ["volunteer", "shelter_staff", "admin"];

export default function App() {
  return (
    <div className="min-h-screen bg-orange-50/40">
      <Navbar />
      <Routes>
        <Route path="/" element={<Pets />} />
        <Route path="/pets/:id" element={<PetDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/pets/:id/apply"
          element={<ProtectedRoute><ApplyForm /></ProtectedRoute>} />
        <Route path="/my-applications"
          element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />

        <Route path="/staff/pets/new"
          element={<ProtectedRoute roles={staff}><AddPet /></ProtectedRoute>} />
        <Route path="/staff/applications"
          element={<ProtectedRoute roles={staff}><ManageApplications /></ProtectedRoute>} />

        <Route path="*" element={<p className="p-6">Page not found</p>} />

        <Route path="/rescues/new" element={<ProtectedRoute><ReportRescue /></ProtectedRoute>} />
<Route path="/rescues/mine" element={<ProtectedRoute><RescueList mode="mine" /></ProtectedRoute>} />
<Route path="/rescues/assigned"
  element={<ProtectedRoute roles={responders}><RescueList mode="assigned" /></ProtectedRoute>} />
<Route path="/rescues"
  element={<ProtectedRoute roles={staff}><RescueList mode="all" /></ProtectedRoute>} />
<Route path="/rescues/:id" element={<ProtectedRoute><RescueDetails /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}