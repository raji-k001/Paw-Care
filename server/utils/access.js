export const sameId = (a, b) => a && b && a.toString() === b.toString();

// Can this user manage this pet?
// Admin: always. Shelter staff: pets of their own shelter.
// Old pets that have no shelter yet fall back to "the staff member who listed it".
export const canManagePet = (pet, user) => {
  if (user.role === "admin") return true;
  if (user.role !== "shelter_staff") return false;
  return pet.shelter ? sameId(pet.shelter, user.shelter) : sameId(pet.addedBy, user._id);
};

// The same rule as a MongoDB filter, for list queries
export const managedPetsFilter = (user) => {
  if (user.role === "admin") return {};
  if (user.role !== "shelter_staff") return { _id: null }; // matches nothing
  if (!user.shelter) return { addedBy: user._id };
  return { $or: [{ shelter: user.shelter }, { shelter: null, addedBy: user._id }] };
};

// Can this user run this shelter (supplies, expenses, transfers...)?
export const canRunShelter = (user, shelterId) =>
  user.role === "admin" || (user.role === "shelter_staff" && sameId(user.shelter, shelterId));