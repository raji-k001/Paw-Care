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
import VolunteerHub from "./pages/VolunteerHub";
import VolunteerShifts from "./pages/VolunteerShifts";
import StaffVolunteers from "./pages/StaffVolunteers";
import StaffTasks from "./pages/StaffTasks";
import AdminCertificates from "./pages/AdminCertificates";
import CertificateView from "./pages/CertificateView";
import MedicalDashboard from "./pages/MedicalDashboard";
import MedicalRecords from "./pages/MedicalRecords";
import AdminDashboard from "./pages/AdminDashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import CreateCampaign from "./pages/CreateCampaign";
import MyDonations from "./pages/MyDonations";
import Receipt from "./pages/Receipt";
import RegisterShelter from "./pages/RegisterShelter";
import ShelterDirectory from "./pages/ShelterDirectory";
import ShelterHub from "./pages/ShelterHub";
import AdminShelters from "./pages/AdminShelters";
import Favorites from "./pages/Favorites";
import ComparePets from "./pages/ComparePets";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CompareBar from "./components/CompareBar";
import LostFound from "./pages/LostFound";
import ReportLostFound from "./pages/ReportLostFound";
import LostFoundDetails from "./pages/LostFoundDetails";
import AdminFlags from "./pages/AdminFlags";
import AdminAudit from "./pages/AdminAudit";
import PetQR from "./pages/PetQR";

const staff = ["shelter_staff", "admin"];
const medicalRoles = ["shelter_staff", "veterinarian", "admin"];
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

        <Route path="/medical"
  element={<ProtectedRoute roles={medicalRoles}><MedicalDashboard /></ProtectedRoute>} />
<Route path="/medical/:petId"
  element={<ProtectedRoute roles={medicalRoles}><MedicalRecords /></ProtectedRoute>} />

  <Route path="/campaigns" element={<Campaigns />} />
<Route path="/campaigns/new"
  element={<ProtectedRoute roles={staff}><CreateCampaign /></ProtectedRoute>} />
<Route path="/campaigns/:id" element={<CampaignDetails />} />
<Route path="/my-donations" element={<ProtectedRoute><MyDonations /></ProtectedRoute>} />
<Route path="/donations/:id/receipt" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />

<Route path="/shelters" element={<ShelterDirectory />} />
<Route path="/shelters/register"
  element={<ProtectedRoute roles={["adopter", "volunteer"]}><RegisterShelter /></ProtectedRoute>} />
<Route path="/shelter"
  element={<ProtectedRoute roles={["adopter", "volunteer", "shelter_staff", "admin"]}><ShelterHub /></ProtectedRoute>} />
<Route path="/admin/shelters"
  element={<ProtectedRoute roles={["admin"]}><AdminShelters /></ProtectedRoute>} />

<Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
<Route path="/compare" element={<ComparePets />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />

<Route path="/lostfound" element={<LostFound />} />
<Route path="/lostfound/new" element={<ProtectedRoute><ReportLostFound /></ProtectedRoute>} />
<Route path="/lostfound/:id" element={<LostFoundDetails />} />
<Route path="/admin/reports"
  element={<ProtectedRoute roles={["admin"]}><AdminFlags /></ProtectedRoute>} />

<Route path="/admin/audit"
  element={<ProtectedRoute roles={["admin"]}><AdminAudit /></ProtectedRoute>} />
<Route path="/pets/:id/qr"
  element={<ProtectedRoute roles={staff}><PetQR /></ProtectedRoute>} />

        <Route path="*" element={<p className="p-6">Page not found</p>} />
        <Route path="/admin/dashboard"
  element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

        <Route path="/rescues/new" element={<ProtectedRoute><ReportRescue /></ProtectedRoute>} />
<Route path="/rescues/mine" element={<ProtectedRoute><RescueList mode="mine" /></ProtectedRoute>} />
<Route path="/rescues/assigned"
  element={<ProtectedRoute roles={responders}><RescueList mode="assigned" /></ProtectedRoute>} />
<Route path="/rescues"
  element={<ProtectedRoute roles={staff}><RescueList mode="all" /></ProtectedRoute>} />
<Route path="/rescues/:id" element={<ProtectedRoute><RescueDetails /></ProtectedRoute>} />

<Route path="/volunteer"
  element={<ProtectedRoute roles={["volunteer"]}><VolunteerHub /></ProtectedRoute>} />
<Route path="/volunteer/tasks"
  element={<ProtectedRoute roles={["volunteer"]}><VolunteerShifts /></ProtectedRoute>} />
<Route path="/staff/volunteers"
  element={<ProtectedRoute roles={staff}><StaffVolunteers /></ProtectedRoute>} />
<Route path="/staff/tasks"
  element={<ProtectedRoute roles={staff}><StaffTasks /></ProtectedRoute>} />
<Route path="/admin/certificates"
  element={<ProtectedRoute roles={["admin"]}><AdminCertificates /></ProtectedRoute>} />
<Route path="/certificates/:id"
  element={<ProtectedRoute><CertificateView /></ProtectedRoute>} />
      </Routes>
      <CompareBar />
    </div>
  );
}